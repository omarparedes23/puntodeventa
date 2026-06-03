'use server'

import { createClient } from '@/lib/supabase/server'
import { fechaHoyLima } from '@/lib/utils'

type ActionResponse<T> = { data: T | null; error: string | null }

export type PeriodoFiltro = 'hoy' | 'semana' | 'mes' | 'anio'

function getRangoFechas(periodo: PeriodoFiltro): { desde: string; hasta: string } {
  const hasta = fechaHoyLima()
  // Operar sobre la fecha Lima para evitar desfases UTC
  const [y, m, d] = hasta.split('-').map(Number)
  const base = new Date(y, m - 1, d)

  if (periodo === 'hoy') {
    return { desde: hasta, hasta }
  }

  const desde = new Date(base)
  if (periodo === 'semana') {
    desde.setDate(d - 6)
  } else if (periodo === 'mes') {
    desde.setDate(1)
  } else {
    desde.setMonth(0, 1)
  }

  const pad = (n: number) => String(n).padStart(2, '0')
  const fmtLocal = (dt: Date) =>
    `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`

  return { desde: fmtLocal(desde), hasta }
}

// ─── Ventas por período ───────────────────────────────────────────────────────

export type VentaDia = {
  fecha: string
  total: number
  cantidad: number
}

export type ResumenVentas = {
  total_periodo: number
  cantidad_ventas: number
  ticket_promedio: number
  por_dia: VentaDia[]
}

export async function getReporteVentas(
  periodo: PeriodoFiltro
): Promise<ActionResponse<ResumenVentas>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'No autenticado' }

  const { data: perfil } = await supabase
    .from('ptovta_perfiles')
    .select('empresa_id')
    .eq('id', user.id)
    .single()

  if (!perfil?.empresa_id) return { data: null, error: 'Sin empresa' }

  const { desde, hasta } = getRangoFechas(periodo)

  const { data: ventas, error } = await supabase
    .from('ptovta_ventas')
    .select('fecha_emision, total')
    .eq('empresa_id', perfil.empresa_id)
    .neq('estado', 'anulada')
    .gte('fecha_emision', desde)
    .lte('fecha_emision', hasta)
    .order('fecha_emision')

  if (error) return { data: null, error: 'Error al obtener ventas' }

  const porDiaMap: Record<string, { total: number; cantidad: number }> = {}

  for (const v of ventas ?? []) {
    const fecha = v.fecha_emision as string
    if (!porDiaMap[fecha]) porDiaMap[fecha] = { total: 0, cantidad: 0 }
    porDiaMap[fecha].total += Number(v.total)
    porDiaMap[fecha].cantidad += 1
  }

  const por_dia: VentaDia[] = Object.entries(porDiaMap).map(([fecha, d]) => ({
    fecha,
    total: Math.round(d.total * 100) / 100,
    cantidad: d.cantidad,
  }))

  const total_periodo = por_dia.reduce((s, d) => s + d.total, 0)
  const cantidad_ventas = por_dia.reduce((s, d) => s + d.cantidad, 0)

  return {
    data: {
      total_periodo: Math.round(total_periodo * 100) / 100,
      cantidad_ventas,
      ticket_promedio: cantidad_ventas > 0 ? Math.round((total_periodo / cantidad_ventas) * 100) / 100 : 0,
      por_dia,
    },
    error: null,
  }
}

// ─── Productos más vendidos ───────────────────────────────────────────────────

export type ProductoVendido = {
  nombre: string
  cantidad: number
  total: number
}

export async function getReporteProductos(
  periodo: PeriodoFiltro
): Promise<ActionResponse<ProductoVendido[]>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'No autenticado' }

  const { data: perfil } = await supabase
    .from('ptovta_perfiles')
    .select('empresa_id')
    .eq('id', user.id)
    .single()

  if (!perfil?.empresa_id) return { data: null, error: 'Sin empresa' }

  const { desde, hasta } = getRangoFechas(periodo)

  const { data, error } = await supabase
    .from('ptovta_venta_items')
    .select(`
      producto_nombre,
      cantidad,
      total,
      ptovta_ventas!inner(empresa_id, fecha_emision, estado)
    `)
    .eq('ptovta_ventas.empresa_id', perfil.empresa_id)
    .neq('ptovta_ventas.estado', 'anulada')
    .gte('ptovta_ventas.fecha_emision', desde)
    .lte('ptovta_ventas.fecha_emision', hasta)

  if (error) return { data: null, error: 'Error al obtener productos' }

  const mapaProductos: Record<string, { cantidad: number; total: number }> = {}

  for (const item of data ?? []) {
    const nombre = item.producto_nombre as string
    if (!mapaProductos[nombre]) mapaProductos[nombre] = { cantidad: 0, total: 0 }
    mapaProductos[nombre].cantidad += Number(item.cantidad)
    mapaProductos[nombre].total += Number(item.total)
  }

  const resultado = Object.entries(mapaProductos)
    .map(([nombre, d]) => ({
      nombre,
      cantidad: Math.round(d.cantidad * 1000) / 1000,
      total: Math.round(d.total * 100) / 100,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  return { data: resultado, error: null }
}

// ─── Caja por método de pago ──────────────────────────────────────────────────

export type PagoMetodo = {
  metodo: string
  total: number
  cantidad: number
}

export async function getReporteCaja(
  periodo: PeriodoFiltro
): Promise<ActionResponse<PagoMetodo[]>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'No autenticado' }

  const { data: perfil } = await supabase
    .from('ptovta_perfiles')
    .select('empresa_id')
    .eq('id', user.id)
    .single()

  if (!perfil?.empresa_id) return { data: null, error: 'Sin empresa' }

  const { desde, hasta } = getRangoFechas(periodo)

  const { data, error } = await supabase
    .from('ptovta_venta_pagos')
    .select(`
      metodo_pago,
      monto,
      ptovta_ventas!inner(empresa_id, fecha_emision, estado)
    `)
    .eq('ptovta_ventas.empresa_id', perfil.empresa_id)
    .neq('ptovta_ventas.estado', 'anulada')
    .gte('ptovta_ventas.fecha_emision', desde)
    .lte('ptovta_ventas.fecha_emision', hasta)

  if (error) return { data: null, error: 'Error al obtener pagos' }

  const mapaMetodos: Record<string, { total: number; cantidad: number }> = {}

  for (const p of data ?? []) {
    const metodo = p.metodo_pago as string
    if (!mapaMetodos[metodo]) mapaMetodos[metodo] = { total: 0, cantidad: 0 }
    mapaMetodos[metodo].total += Number(p.monto)
    mapaMetodos[metodo].cantidad += 1
  }

  const resultado = Object.entries(mapaMetodos)
    .map(([metodo, d]) => ({
      metodo,
      total: Math.round(d.total * 100) / 100,
      cantidad: d.cantidad,
    }))
    .sort((a, b) => b.total - a.total)

  return { data: resultado, error: null }
}
