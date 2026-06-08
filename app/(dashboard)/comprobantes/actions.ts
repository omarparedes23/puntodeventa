'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Decimal } from 'decimal.js'
import { fechaHoyLima } from '@/lib/utils'
import type { Venta, VentaItem, VentaPago, Cliente } from '@/types/database'
import type { NotaCreditoMotivo } from '@/lib/facturacion/index'
import type { ItemNC } from './constants'

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
// Tipos públicos del módulo
// -------------------------------------------------------
export type ComprobanteResumen = Pick<
  Venta,
  | 'id' | 'numero_completo' | 'tipo_comprobante' | 'fecha_emision'
  | 'total' | 'estado' | 'sunat_estado' | 'pdf_url' | 'xml_url'
> & {
  cliente_nombre: string | null
}

export type ComprobanteCompleto = Venta & {
  cliente: Pick<Cliente, 'id' | 'nombre' | 'tipo_documento' | 'nro_documento'> | null
  items: VentaItem[]
  pagos: VentaPago[]
}

export type FiltrosComprobante = {
  tipo?: 'boleta' | 'factura' | 'ticket' | 'nota_credito' | 'nota_debito'
  estado?: 'pendiente' | 'emitida' | 'anulada' | 'error_sunat'
  desde?: string   // ISO date YYYY-MM-DD
  hasta?: string
}

// -------------------------------------------------------
// getComprobantes
// -------------------------------------------------------
export async function getComprobantes(
  filtros?: FiltrosComprobante
): Promise<ActionResponse<ComprobanteResumen[]>> {
  const { supabase, perfil } = await getSession()
  if (!perfil?.empresa_id) return { data: null, error: 'No autenticado' }

  let query = supabase
    .from('ptovta_ventas')
    .select(`
      id, numero_completo, tipo_comprobante, fecha_emision,
      total, estado, sunat_estado, pdf_url, xml_url,
      cliente:ptovta_clientes (nombre)
    `)
    .eq('empresa_id', perfil.empresa_id)
    .order('fecha_emision', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200)

  if (filtros?.tipo) query = query.eq('tipo_comprobante', filtros.tipo)
  if (filtros?.estado) query = query.eq('estado', filtros.estado)
  if (filtros?.desde) query = query.gte('fecha_emision', filtros.desde)
  if (filtros?.hasta) query = query.lte('fecha_emision', filtros.hasta)

  const { data, error } = await query

  if (error) return { data: null, error: 'Error al obtener comprobantes' }

  const comprobantes: ComprobanteResumen[] = (data ?? []).map((v: any) => ({
    id: v.id,
    numero_completo: v.numero_completo,
    tipo_comprobante: v.tipo_comprobante,
    fecha_emision: v.fecha_emision,
    total: v.total,
    estado: v.estado,
    sunat_estado: v.sunat_estado,
    pdf_url: v.pdf_url,
    xml_url: v.xml_url,
    cliente_nombre: v.cliente?.nombre ?? null,
  }))

  return { data: comprobantes, error: null }
}

// -------------------------------------------------------
// getComprobante — detalle completo
// -------------------------------------------------------
export async function getComprobante(
  id: string
): Promise<ActionResponse<ComprobanteCompleto>> {
  const { supabase, perfil } = await getSession()
  if (!perfil?.empresa_id) return { data: null, error: 'No autenticado' }

  const { data, error } = await supabase
    .from('ptovta_ventas')
    .select(`
      *,
      cliente:ptovta_clientes (id, nombre, tipo_documento, nro_documento),
      items:ptovta_venta_items (*),
      pagos:ptovta_venta_pagos (*)
    `)
    .eq('id', id)
    .eq('empresa_id', perfil.empresa_id)
    .single()

  if (error || !data) return { data: null, error: 'Comprobante no encontrado' }

  const result: ComprobanteCompleto = {
    ...(data as any),
    cliente: (data as any).cliente ?? null,
    items: (data as any).items ?? [],
    pagos: (data as any).pagos ?? [],
  }

  return { data: result, error: null }
}

// -------------------------------------------------------
// reenviarSunat
// Reintenta la emisión para ventas en estado error_sunat o pendiente.
// Cualquier usuario con rol vendedor o admin puede reintentar.
// -------------------------------------------------------
export async function reenviarSunat(
  id: string
): Promise<ActionResponse<{ estado: string }>> {
  const { supabase, perfil } = await getSession()
  if (!perfil?.empresa_id) return { data: null, error: 'No autenticado' }
  if (perfil.rol === 'lectura') return { data: null, error: 'Sin permisos' }

  // Leer venta completa
  const { data: venta } = await supabase
    .from('ptovta_ventas')
    .select(`*, items:ptovta_venta_items (*), cliente:ptovta_clientes (nombre, tipo_documento, nro_documento)`)
    .eq('id', id)
    .eq('empresa_id', perfil.empresa_id)
    .single()

  if (!venta) return { data: null, error: 'Comprobante no encontrado' }
  if (venta.tipo_comprobante === 'ticket') return { data: null, error: 'Los tickets no se envían a SUNAT' }
  if (!['error_sunat', 'pendiente'].includes(venta.estado)) {
    return { data: null, error: `No se puede reenviar un comprobante en estado "${venta.estado}"` }
  }
  if (!venta.serie || !venta.correlativo) {
    return { data: null, error: 'El comprobante no tiene serie/correlativo asignado' }
  }

  // Leer empresa para datos del emisor
  const { data: empresa } = await supabase
    .from('ptovta_empresas')
    .select('razon_social, ruc')
    .eq('id', perfil.empresa_id)
    .single()

  // Reconstruir ComprobanteData desde los datos almacenados
  const items = (venta as any).items as VentaItem[]
  const cliente = (venta as any).cliente as { nombre: string; tipo_documento: string | null; nro_documento: string | null } | null

  const { facturacionService } = await import('@/lib/facturacion/factory')

  const comprobanteData = {
    tipo: venta.tipo_comprobante as 'boleta' | 'factura',
    serie: venta.serie,
    correlativo: venta.correlativo,
    fecha_emision: venta.fecha_emision,
    cliente: {
      nombre: cliente?.nombre ?? 'Consumidor Final',
      tipo_documento: cliente?.tipo_documento ?? 'DNI',
      nro_documento: cliente?.nro_documento ?? '00000000',
    },
    items: items.map((item) => ({
      descripcion: item.producto_nombre,
      cantidad: item.cantidad,
      valor_unitario: new Decimal(item.subtotal).dividedBy(item.cantidad).toDecimalPlaces(6).toNumber(),
      precio_unitario: item.precio_unitario,
      subtotal: item.subtotal,
      igv: item.igv,
      total: item.total,
      afecto_igv: item.igv > 0,
    })),
    totales: {
      subtotal: venta.subtotal,
      descuento: venta.descuento_total,
      igv: venta.igv,
      total: venta.total,
    },
  }

  let resultado
  try {
    resultado = venta.tipo_comprobante === 'boleta'
      ? await facturacionService.emitirBoleta(comprobanteData)
      : await facturacionService.emitirFactura(comprobanteData)
  } catch (err) {
    console.error('[COMPROBANTES] Error al reenviar a SUNAT:', err)
    return { data: null, error: 'Error de conexión al intentar reenviar' }
  }

  const nuevoEstado = resultado.exito ? 'emitida' : 'error_sunat'
  const adminClient = createAdminClient()

  await adminClient
    .from('ptovta_ventas')
    .update({
      estado: nuevoEstado,
      sunat_estado: resultado.exito ? (resultado.sunat_aceptada ? 'aceptada' : 'pendiente') : null,
      nubefact_id: resultado.id_externo ?? null,
      pdf_url: resultado.pdf_url ?? null,
      xml_url: resultado.xml_url ?? null,
      sunat_hash: resultado.hash ?? null,
      sunat_cdr: resultado.cdr ?? null,
    })
    .eq('id', id)

  if (!resultado.exito) {
    return { data: null, error: `SUNAT rechazó el comprobante: ${resultado.error ?? 'error desconocido'}` }
  }

  return { data: { estado: nuevoEstado }, error: null }
}

// -------------------------------------------------------
// crearNotaCredito
// -------------------------------------------------------
export async function crearNotaCredito(
  ventaOriginalId: string,
  motivo_codigo: NotaCreditoMotivo,
  items: ItemNC[]
): Promise<ActionResponse<{ id: string; numero_completo: string }>> {
  const { supabase, perfil } = await getSession()
  if (!perfil?.empresa_id) return { data: null, error: 'No autenticado' }
  if (perfil.rol !== 'administrador') return { data: null, error: 'Solo el administrador puede emitir notas de crédito' }
  if (!items.length) return { data: null, error: 'Debe incluir al menos un ítem' }

  const { data: ventaOrig, error: ventaOrigError } = await supabase
    .from('ptovta_ventas')
    .select('*, cliente:ptovta_clientes(nombre, tipo_documento, nro_documento)')
    .eq('id', ventaOriginalId)
    .eq('empresa_id', perfil.empresa_id)
    .single()

  if (ventaOrigError || !ventaOrig) {
    console.error('[NC] ventaOrig no encontrada:', ventaOrigError)
    return { data: null, error: 'Comprobante original no encontrado' }
  }
  console.log('[NC] ventaOrig:', ventaOrig.numero_completo, '| estado:', ventaOrig.estado, '| tipo:', ventaOrig.tipo_comprobante)

  if (ventaOrig.estado !== 'emitida') return { data: null, error: 'Solo se puede hacer NC sobre comprobantes emitidos' }
  if (!['boleta', 'factura'].includes(ventaOrig.tipo_comprobante)) {
    return { data: null, error: 'Las notas de crédito aplican solo a boletas y facturas' }
  }

  const { data: empresa, error: empresaError } = await supabase
    .from('ptovta_empresas')
    .select('serie_nc_boleta, serie_nc_factura')
    .eq('id', perfil.empresa_id)
    .single()

  console.log('[NC] empresa series:', empresa, '| error:', empresaError)

  const serie = ventaOrig.tipo_comprobante === 'boleta'
    ? (empresa?.serie_nc_boleta ?? 'BBB1')
    : (empresa?.serie_nc_factura ?? 'FFF1')

  const { data: ultimaNC } = await supabase
    .from('ptovta_ventas')
    .select('correlativo')
    .eq('empresa_id', perfil.empresa_id)
    .eq('tipo_comprobante', 'nota_credito')
    .eq('serie', serie)
    .order('correlativo', { ascending: false })
    .limit(1)
    .maybeSingle()

  const correlativo = (ultimaNC?.correlativo ?? 0) + 1
  const numero_completo = `${serie}-${String(correlativo).padStart(8, '0')}`
  console.log('[NC] serie:', serie, '| correlativo:', correlativo, '| numero:', numero_completo)

  const total = items.reduce((s, i) => s + i.total, 0)
  const igv = items.reduce((s, i) => s + i.igv, 0)
  const subtotal = items.reduce((s, i) => s + i.subtotal, 0)
  console.log('[NC] totales → subtotal:', subtotal, '| igv:', igv, '| total:', total)

  const cliente = (ventaOrig as any).cliente as { nombre: string; tipo_documento: string | null; nro_documento: string | null } | null
  const hoy = fechaHoyLima()

  const insertPayload = {
    empresa_id: perfil.empresa_id,
    usuario_id: perfil.id,
    cliente_id: ventaOrig.cliente_id ?? null,
    tipo_venta: ventaOrig.tipo_venta,
    tipo_comprobante: 'nota_credito',
    serie,
    correlativo,
    numero_completo,
    subtotal: Math.round(subtotal * 100) / 100,
    descuento_total: 0,
    igv: Math.round(igv * 100) / 100,
    total: Math.round(total * 100) / 100,
    estado: 'pendiente',
    fecha_emision: hoy,
    referencia_venta_id: ventaOriginalId,
    nota_motivo: motivo_codigo,
  }
  console.log('[NC] INSERT payload:', JSON.stringify(insertPayload))

  const { data: nc, error: ncError } = await supabase
    .from('ptovta_ventas')
    .insert(insertPayload)
    .select('id, numero_completo')
    .single()

  if (ncError || !nc) {
    console.error('[NC] INSERT ptovta_ventas falló → code:', ncError?.code, '| message:', ncError?.message, '| details:', ncError?.details, '| hint:', ncError?.hint)
    return { data: null, error: 'Error al crear la nota de crédito' }
  }
  console.log('[NC] INSERT OK → id:', nc.id)

  await supabase.from('ptovta_venta_items').insert(
    items.map((i) => ({
      venta_id: nc.id,
      producto_id: i.producto_id,
      cantidad: i.cantidad,
      precio_unitario: i.precio_unitario,
      descuento: 0,
      subtotal: i.subtotal,
      igv: i.igv,
      total: i.total,
      producto_nombre: i.producto_nombre,
    }))
  )

  const adminClient = createAdminClient()

  // Devolver stock si es devolución (motivo 06 o 07)
  if (['06', '07'].includes(motivo_codigo)) {
    for (const item of items) {
      const { data: prod } = await adminClient
        .from('ptovta_productos')
        .select('stock_actual')
        .eq('id', item.producto_id)
        .single()

      if (prod) {
        const stockAnterior = new Decimal(prod.stock_actual)
        const stockNuevo = stockAnterior.plus(item.cantidad).toDecimalPlaces(3).toNumber()
        await adminClient.from('ptovta_productos').update({ stock_actual: stockNuevo }).eq('id', item.producto_id)
        await adminClient.from('ptovta_kardex').insert({
          empresa_id: perfil.empresa_id,
          producto_id: item.producto_id,
          tipo: 'entrada',
          motivo: 'devolucion',
          cantidad: item.cantidad,
          stock_anterior: stockAnterior.toNumber(),
          stock_nuevo: stockNuevo,
          referencia_id: nc.id,
          usuario_id: perfil.id,
        })
      }
    }
  }

  // Enviar a Nubefact
  const { facturacionService } = await import('@/lib/facturacion/factory')
  let resultado
  try {
    resultado = await facturacionService.emitirNotaCredito({
      serie,
      correlativo,
      fecha_emision: hoy,
      motivo_codigo,
      documento_ref: {
        tipo: ventaOrig.tipo_comprobante as 'boleta' | 'factura',
        serie: ventaOrig.serie!,
        correlativo: ventaOrig.correlativo!,
      },
      cliente: {
        nombre: cliente?.nombre ?? 'Consumidor Final',
        tipo_documento: cliente?.tipo_documento ?? 'DNI',
        nro_documento: cliente?.nro_documento ?? '00000000',
      },
      items: items.map((i) => ({
        descripcion: i.producto_nombre,
        cantidad: i.cantidad,
        valor_unitario: new Decimal(i.subtotal).dividedBy(i.cantidad).toDecimalPlaces(6).toNumber(),
        precio_unitario: i.precio_unitario,
        subtotal: i.subtotal,
        igv: i.igv,
        total: i.total,
        afecto_igv: i.afecto_igv,
      })),
      totales: { subtotal: Math.round(subtotal * 100) / 100, descuento: 0, igv: Math.round(igv * 100) / 100, total: Math.round(total * 100) / 100 },
    })
  } catch (err) {
    console.error('[NC] Error al enviar NC a Nubefact:', err)
    await adminClient.from('ptovta_ventas').update({ estado: 'error_sunat' }).eq('id', nc.id)
    return { data: { id: nc.id, numero_completo }, error: null }
  }

  await adminClient.from('ptovta_ventas').update({
    estado: resultado.exito ? 'emitida' : 'error_sunat',
    nubefact_id: resultado.id_externo ?? null,
    pdf_url: resultado.pdf_url ?? null,
    xml_url: resultado.xml_url ?? null,
    sunat_hash: resultado.hash ?? null,
    sunat_estado: resultado.exito ? (resultado.sunat_aceptada ? 'aceptada' : 'pendiente') : null,
  }).eq('id', nc.id)

  console.log(`[NC] ${resultado.exito ? '✓' : '✗'} ${numero_completo} | motivo: ${motivo_codigo}`)
  return { data: { id: nc.id, numero_completo }, error: null }
}

// -------------------------------------------------------
// descargarDocumento
// Genera una URL de descarga temporal desde el microservicio OSE-SUNAT.
// -------------------------------------------------------
export async function descargarDocumento(
  ventaId: string,
  tipo: 'xml' | 'zip' | 'pdf'
): Promise<ActionResponse<{ url: string }>> {
  const { supabase, perfil } = await getSession()
  if (!perfil?.empresa_id) return { data: null, error: 'No autenticado' }

  const { data: venta } = await supabase
    .from('ptovta_ventas')
    .select('nubefact_id, xml_url, pdf_url')
    .eq('id', ventaId)
    .eq('empresa_id', perfil.empresa_id)
    .single()

  if (!venta) return { data: null, error: 'Comprobante no encontrado' }

  const provider = process.env.FACTURACION_PROVIDER ?? 'nubefact'

  if (provider === 'propio' && venta.nubefact_id) {
    try {
      const res = await fetch(
        `${process.env.OSE_SUNAT_URL}/api/v1/comprobantes/${venta.nubefact_id}/documento?tipo=${tipo}`,
        { headers: { 'X-Api-Key': process.env.OSE_SUNAT_API_KEY ?? '' } }
      )
      if (!res.ok) return { data: null, error: 'Error al generar URL de descarga' }
      const json = await res.json() as { url: string }
      return { data: { url: json.url }, error: null }
    } catch {
      return { data: null, error: 'Error de conexión con el microservicio' }
    }
  }

  // Fallback Nubefact: usar URL almacenada si es una URL pública válida
  const stored = tipo === 'pdf' ? venta.pdf_url : venta.xml_url
  if (!stored || !stored.startsWith('http')) {
    return { data: null, error: 'Documento no disponible' }
  }
  return { data: { url: stored }, error: null }
}

// -------------------------------------------------------
// anularComprobante
// Solo administradores. Solo comprobantes emitidos con nubefact_id.
// -------------------------------------------------------
export async function anularComprobante(
  id: string,
  motivo: string
): Promise<ActionResponse<{ estado: string }>> {
  const { supabase, perfil } = await getSession()
  if (!perfil?.empresa_id) return { data: null, error: 'No autenticado' }
  if (perfil.rol !== 'administrador') {
    return { data: null, error: 'Solo el administrador puede anular comprobantes' }
  }

  if (!motivo.trim()) return { data: null, error: 'Debe indicar el motivo de anulación' }

  const { data: venta } = await supabase
    .from('ptovta_ventas')
    .select('id, estado, tipo_comprobante, nubefact_id')
    .eq('id', id)
    .eq('empresa_id', perfil.empresa_id)
    .single()

  if (!venta) return { data: null, error: 'Comprobante no encontrado' }
  if (venta.estado !== 'emitida') {
    return { data: null, error: 'Solo se pueden anular comprobantes emitidos' }
  }
  if (venta.tipo_comprobante === 'ticket') {
    return { data: null, error: 'Los tickets no requieren anulación en SUNAT' }
  }
  if (!venta.nubefact_id) {
    return { data: null, error: 'Este comprobante no tiene ID de Nubefact — no se puede anular en SUNAT' }
  }

  const { facturacionService } = await import('@/lib/facturacion/factory')

  try {
    await facturacionService.anularComprobante(
      venta.nubefact_id,
      motivo,
      venta.tipo_comprobante as 'boleta' | 'factura'
    )
  } catch (err) {
    console.error('[COMPROBANTES] Error al anular en SUNAT:', err)
    const msg = err instanceof Error ? err.message : 'Error al comunicar la anulación a SUNAT'
    return { data: null, error: msg }
  }

  const adminClient = createAdminClient()
  await adminClient
    .from('ptovta_ventas')
    .update({ estado: 'anulada', sunat_estado: 'baja' })
    .eq('id', id)

  return { data: { estado: 'anulada' }, error: null }
}
