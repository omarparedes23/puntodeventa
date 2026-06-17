'use server'

import { createClient } from '@/lib/supabase/server'
import { Decimal } from 'decimal.js'
import {
  abrirCajaSchema,
  movimientoSchema,
  cerrarCajaSchema,
  type AbrirCajaData,
  type MovimientoData,
  type CerrarCajaData,
} from '@marketpos/core'
import type { Caja, MovimientoCaja } from '@marketpos/core'

type ActionResponse<T> = { data: T | null; error: string | null }

async function getSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, perfil: null }

  const { data: perfil } = await supabase
    .from('ptovta_perfiles')
    .select('id, rol, empresa_id')
    .eq('id', user.id)
    .single()

  return { supabase, user, perfil }
}

// -------------------------------------------------------
// getCajaActiva
// Devuelve la caja abierta del usuario actual, o null.
// -------------------------------------------------------
export async function getCajaActiva(): Promise<ActionResponse<Caja>> {
  const { supabase, user, perfil } = await getSession()
  if (!user || !perfil?.empresa_id) return { data: null, error: null }

  const { data, error } = await supabase
    .from('ptovta_cajas')
    .select('*')
    .eq('usuario_id', user.id)
    .eq('empresa_id', perfil.empresa_id)
    .eq('estado', 'abierta')
    .maybeSingle()

  if (error) return { data: null, error: 'Error al consultar la caja' }
  return { data, error: null }
}

// -------------------------------------------------------
// abrirCaja
// -------------------------------------------------------
export async function abrirCaja(input: AbrirCajaData): Promise<ActionResponse<Caja>> {
  const { supabase, user, perfil } = await getSession()
  if (!user || !perfil?.empresa_id) return { data: null, error: 'No autenticado' }
  if (perfil.rol === 'lectura') return { data: null, error: 'Sin permisos para abrir caja' }

  const parsed = abrirCajaSchema.safeParse(input)
  if (!parsed.success) return { data: null, error: parsed.error.issues[0].message }

  const monto = new Decimal(parsed.data.monto_inicial).toDecimalPlaces(2).toNumber()

  const { data, error } = await supabase
    .from('ptovta_cajas')
    .insert({
      empresa_id: perfil.empresa_id,
      usuario_id: user.id,
      monto_inicial: monto,
      notas: parsed.data.notas ?? null,
    })
    .select()
    .single()

  if (error) {
    // El índice único parcial lanza 23505 si ya hay una caja abierta
    if (error.code === '23505') {
      return { data: null, error: 'Ya tienes una caja abierta. Ciérrala antes de abrir una nueva.' }
    }
    return { data: null, error: 'Error al abrir la caja' }
  }

  return { data, error: null }
}

// -------------------------------------------------------
// registrarMovimiento
// Solo se puede registrar en cajas abiertas.
// -------------------------------------------------------
export async function registrarMovimiento(
  cajaId: string,
  input: MovimientoData
): Promise<ActionResponse<MovimientoCaja>> {
  const { supabase, user, perfil } = await getSession()
  if (!user || !perfil?.empresa_id) return { data: null, error: 'No autenticado' }
  if (perfil.rol === 'lectura') return { data: null, error: 'Sin permisos para registrar movimientos' }

  const parsed = movimientoSchema.safeParse(input)
  if (!parsed.success) return { data: null, error: parsed.error.issues[0].message }

  // Verificar que la caja existe, está abierta y pertenece al usuario (o es admin)
  const { data: caja, error: cajaError } = await supabase
    .from('ptovta_cajas')
    .select('id, estado, usuario_id')
    .eq('id', cajaId)
    .eq('empresa_id', perfil.empresa_id)
    .single()

  if (cajaError || !caja) return { data: null, error: 'Caja no encontrada' }
  if (caja.estado !== 'abierta') return { data: null, error: 'La caja ya está cerrada' }
  if (caja.usuario_id !== user.id && perfil.rol !== 'administrador') {
    return { data: null, error: 'Sin permisos sobre esta caja' }
  }

  const monto = new Decimal(parsed.data.monto).toDecimalPlaces(2).toNumber()

  const { data, error } = await supabase
    .from('ptovta_movimientos_caja')
    .insert({
      caja_id: cajaId,
      tipo: parsed.data.tipo,
      concepto: parsed.data.concepto,
      monto,
      metodo_pago: parsed.data.metodo_pago,
    })
    .select()
    .single()

  if (error) return { data: null, error: 'Error al registrar el movimiento' }
  return { data, error: null }
}

// -------------------------------------------------------
// getMovimientos
// -------------------------------------------------------
export async function getMovimientos(cajaId: string): Promise<ActionResponse<MovimientoCaja[]>> {
  const { supabase, perfil } = await getSession()
  if (!perfil?.empresa_id) return { data: null, error: 'No autenticado' }

  const { data, error } = await supabase
    .from('ptovta_movimientos_caja')
    .select('*')
    .eq('caja_id', cajaId)
    .order('created_at', { ascending: true })

  if (error) return { data: null, error: 'Error al obtener movimientos' }
  return { data, error: null }
}

// -------------------------------------------------------
// getResumen
// Calcula totales usando decimal.js — sin aritmética nativa.
// -------------------------------------------------------
export type ResumenCaja = {
  monto_inicial: string
  total_ingresos: string
  total_egresos: string
  saldo_esperado: string
  diferencia: string | null   // null si monto_final no fue provisto
  por_metodo: { metodo: string; ingresos: string; egresos: string }[]
}

export async function getResumen(
  cajaId: string,
  montoFinalProvisional?: string
): Promise<ActionResponse<ResumenCaja>> {
  const { supabase, perfil } = await getSession()
  if (!perfil?.empresa_id) return { data: null, error: 'No autenticado' }

  const [{ data: caja }, { data: movimientos }] = await Promise.all([
    supabase.from('ptovta_cajas').select('monto_inicial').eq('id', cajaId).single(),
    supabase.from('ptovta_movimientos_caja').select('*').eq('caja_id', cajaId),
  ])

  if (!caja || !movimientos) return { data: null, error: 'Error al calcular resumen' }

  const montoInicial = new Decimal(caja.monto_inicial)
  let totalIngresos = new Decimal(0)
  let totalEgresos = new Decimal(0)

  const metodos = new Map<string, { ingresos: Decimal; egresos: Decimal }>()

  for (const m of movimientos) {
    const monto = new Decimal(m.monto)
    if (m.tipo === 'ingreso') {
      totalIngresos = totalIngresos.plus(monto)
    } else {
      totalEgresos = totalEgresos.plus(monto)
    }

    if (!metodos.has(m.metodo_pago)) {
      metodos.set(m.metodo_pago, { ingresos: new Decimal(0), egresos: new Decimal(0) })
    }
    const entry = metodos.get(m.metodo_pago)!
    if (m.tipo === 'ingreso') {
      entry.ingresos = entry.ingresos.plus(monto)
    } else {
      entry.egresos = entry.egresos.plus(monto)
    }
  }

  const saldoEsperado = montoInicial.plus(totalIngresos).minus(totalEgresos)

  let diferencia: string | null = null
  if (montoFinalProvisional !== undefined) {
    const montoFinal = new Decimal(montoFinalProvisional)
    diferencia = montoFinal.minus(saldoEsperado).toFixed(2)
  }

  const porMetodo = Array.from(metodos.entries()).map(([metodo, vals]) => ({
    metodo,
    ingresos: vals.ingresos.toFixed(2),
    egresos: vals.egresos.toFixed(2),
  }))

  return {
    data: {
      monto_inicial: montoInicial.toFixed(2),
      total_ingresos: totalIngresos.toFixed(2),
      total_egresos: totalEgresos.toFixed(2),
      saldo_esperado: saldoEsperado.toFixed(2),
      diferencia,
      por_metodo: porMetodo,
    },
    error: null,
  }
}

// -------------------------------------------------------
// cerrarCaja
// -------------------------------------------------------
export async function cerrarCaja(
  cajaId: string,
  input: CerrarCajaData
): Promise<ActionResponse<Caja>> {
  const { supabase, user, perfil } = await getSession()
  if (!user || !perfil?.empresa_id) return { data: null, error: 'No autenticado' }
  if (perfil.rol === 'lectura') return { data: null, error: 'Sin permisos para cerrar caja' }

  const parsed = cerrarCajaSchema.safeParse(input)
  if (!parsed.success) return { data: null, error: parsed.error.issues[0].message }

  // Verificar caja abierta y pertenencia
  const { data: caja } = await supabase
    .from('ptovta_cajas')
    .select('id, estado, usuario_id')
    .eq('id', cajaId)
    .eq('empresa_id', perfil.empresa_id)
    .single()

  if (!caja) return { data: null, error: 'Caja no encontrada' }
  if (caja.estado !== 'abierta') return { data: null, error: 'La caja ya está cerrada' }
  if (caja.usuario_id !== user.id && perfil.rol !== 'administrador') {
    return { data: null, error: 'Sin permisos sobre esta caja' }
  }

  const monto_final = new Decimal(parsed.data.monto_final).toDecimalPlaces(2).toNumber()

  const { data, error } = await supabase
    .from('ptovta_cajas')
    .update({
      estado: 'cerrada',
      monto_final,
      fecha_cierre: new Date().toISOString(),
      notas: parsed.data.notas ?? null,
    })
    .eq('id', cajaId)
    .select()
    .single()

  if (error) return { data: null, error: 'Error al cerrar la caja' }
  return { data, error: null }
}
