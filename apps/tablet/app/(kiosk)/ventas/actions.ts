'use server'

import { createAdminClient, fechaHoyLima, facturacionService } from '@marketpos/core'
import { Decimal } from 'decimal.js'
import { getSession, getSessionFast } from '@/lib/session'
import type { VentaItem } from '@marketpos/core'

type ActionResponse<T> = { data: T | null; error: string | null }

export type VentaResumen = {
  id: string
  numero_completo: string | null
  tipo_comprobante: string
  fecha_emision: string
  total: number
  estado: 'pendiente' | 'emitida' | 'anulada' | 'error_sunat'
  sunat_estado: string | null
  created_at: string
  cliente_nombre: string | null
}

export type VentaCompleta = VentaResumen & {
  subtotal: number
  igv: number
  descuento_total: number
  items: Array<{
    id: string
    producto_nombre: string
    producto_codigo: string | null
    cantidad: number
    precio_unitario: number
    descuento: number
    subtotal: number
    igv: number
    total: number
  }>
  pagos: Array<{ id: string; metodo_pago: string; monto: number }>
  cliente: { nombre: string; tipo_documento: string | null; nro_documento: string | null } | null
}

export async function getVentasHoy(): Promise<ActionResponse<VentaResumen[]>> {
  const { supabase, user, perfil } = await getSessionFast()
  if (!user || !perfil?.empresa_id) return { data: null, error: 'No autenticado' }

  const hoy = fechaHoyLima()

  let query = supabase
    .from('ptovta_ventas')
    .select('id, numero_completo, tipo_comprobante, fecha_emision, total, estado, sunat_estado, created_at, cliente:ptovta_clientes(nombre)')
    .eq('empresa_id', perfil.empresa_id)
    .eq('fecha_emision', hoy)
    .order('created_at', { ascending: false })
    .limit(100)

  if (perfil.rol !== 'administrador') {
    query = query.eq('usuario_id', user.id)
  }

  const { data, error } = await query
  if (error) return { data: null, error: 'Error al obtener ventas' }

  const ventas: VentaResumen[] = (data ?? []).map((v: any) => ({
    id: v.id,
    numero_completo: v.numero_completo,
    tipo_comprobante: v.tipo_comprobante,
    fecha_emision: v.fecha_emision,
    total: v.total,
    estado: v.estado,
    sunat_estado: v.sunat_estado,
    created_at: v.created_at,
    cliente_nombre: v.cliente?.nombre ?? null,
  }))

  return { data: ventas, error: null }
}

export async function getVentaDetalle(id: string): Promise<ActionResponse<VentaCompleta>> {
  const { supabase, perfil } = await getSessionFast()
  if (!perfil?.empresa_id) return { data: null, error: 'No autenticado' }

  const { data, error } = await supabase
    .from('ptovta_ventas')
    .select(`
      id, numero_completo, tipo_comprobante, fecha_emision, total, subtotal, igv, descuento_total,
      estado, sunat_estado, created_at,
      cliente:ptovta_clientes(nombre, tipo_documento, nro_documento),
      items:ptovta_venta_items(id, producto_nombre, producto_codigo, cantidad, precio_unitario, descuento, subtotal, igv, total),
      pagos:ptovta_venta_pagos(id, metodo_pago, monto)
    `)
    .eq('id', id)
    .eq('empresa_id', perfil.empresa_id)
    .single()

  if (error || !data) return { data: null, error: 'Venta no encontrada' }

  const d = data as any
  const venta: VentaCompleta = {
    id: d.id,
    numero_completo: d.numero_completo,
    tipo_comprobante: d.tipo_comprobante,
    fecha_emision: d.fecha_emision,
    total: d.total,
    subtotal: d.subtotal,
    igv: d.igv,
    descuento_total: d.descuento_total,
    estado: d.estado,
    sunat_estado: d.sunat_estado,
    created_at: d.created_at,
    cliente_nombre: d.cliente?.nombre ?? null,
    cliente: d.cliente ?? null,
    items: d.items ?? [],
    pagos: d.pagos ?? [],
  }

  return { data: venta, error: null }
}

export async function reenviarSunat(id: string): Promise<ActionResponse<{ estado: string }>> {
  const { supabase, perfil } = await getSession()
  if (!perfil?.empresa_id) return { data: null, error: 'No autenticado' }
  if (perfil.rol === 'lectura') return { data: null, error: 'Sin permisos' }

  const { data: venta } = await supabase
    .from('ptovta_ventas')
    .select('*, items:ptovta_venta_items(*), cliente:ptovta_clientes(nombre, tipo_documento, nro_documento)')
    .eq('id', id)
    .eq('empresa_id', perfil.empresa_id)
    .single()

  if (!venta) return { data: null, error: 'Venta no encontrada' }
  if (venta.tipo_comprobante === 'ticket') return { data: null, error: 'Los tickets no se envían a SUNAT' }
  if (!['error_sunat', 'pendiente'].includes(venta.estado)) {
    return { data: null, error: `No se puede reenviar un comprobante en estado "${venta.estado}"` }
  }
  if (!venta.serie || !venta.correlativo) {
    return { data: null, error: 'El comprobante no tiene serie/correlativo asignado' }
  }

  const items = (venta as any).items as VentaItem[]
  const cliente = (venta as any).cliente as { nombre: string; tipo_documento: string | null; nro_documento: string | null } | null

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
    console.error('[VENTAS] Error al reenviar a SUNAT:', err)
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
