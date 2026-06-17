'use server'

import { createAdminClient, fechaHoyLima } from '@marketpos/core'
import { getSession, getSessionFast } from '@/lib/session'
import { Decimal } from 'decimal.js'
import { compraSchema, pagoCompraSchema, type CompraData, type PagoCompraData } from '@marketpos/core'
import type { Compra, CompraItem, Proveedor } from '@marketpos/core'

type ActionResponse<T> = { data: T | null; error: string | null }

export type CompraConProveedor = Compra & {
  proveedor: Pick<Proveedor, 'id' | 'nombre'> | null
  items_count: number
}

export type CompraDetalle = Compra & {
  proveedor: Pick<Proveedor, 'id' | 'nombre' | 'ruc'> | null
  items: (CompraItem & { producto_nombre: string; producto_codigo: string | null })[]
}

export type ProductoParaCompra = {
  id: string
  nombre: string
  codigo: string | null
  stock_actual: number
  precio_compra: number
}

export async function buscarProductosParaCompra(
  query: string
): Promise<ActionResponse<ProductoParaCompra[]>> {
  const { supabase, perfil } = await getSessionFast()
  if (!perfil?.empresa_id) return { data: null, error: 'No autenticado' }

  if (!query.trim()) return { data: [], error: null }

  const { data, error } = await supabase
    .from('ptovta_productos')
    .select('id, nombre, codigo, stock_actual, precio_compra')
    .eq('empresa_id', perfil.empresa_id)
    .eq('activo', true)
    .or(`nombre.ilike.%${query}%,codigo.ilike.%${query}%`)
    .order('nombre')
    .limit(20)

  if (error) return { data: null, error: 'Error al buscar productos' }
  return { data: data as ProductoParaCompra[], error: null }
}

export async function buscarProveedores(
  query: string
): Promise<ActionResponse<Pick<Proveedor, 'id' | 'nombre' | 'ruc'>[]>> {
  const { supabase, perfil } = await getSessionFast()
  if (!perfil?.empresa_id) return { data: null, error: 'No autenticado' }

  if (!query.trim()) return { data: [], error: null }

  const { data, error } = await supabase
    .from('ptovta_proveedores')
    .select('id, nombre, ruc')
    .eq('empresa_id', perfil.empresa_id)
    .eq('activo', true)
    .or(`nombre.ilike.%${query}%,ruc.ilike.%${query}%`)
    .order('nombre')
    .limit(10)

  if (error) return { data: null, error: 'Error al buscar proveedores' }
  return { data: data as Pick<Proveedor, 'id' | 'nombre' | 'ruc'>[], error: null }
}

export async function getCompras(): Promise<ActionResponse<CompraConProveedor[]>> {
  const { supabase, perfil } = await getSessionFast()
  if (!perfil?.empresa_id) return { data: null, error: 'No autenticado' }

  const { data, error } = await supabase
    .from('ptovta_compras')
    .select(`
      *,
      proveedor:ptovta_proveedores (id, nombre),
      items_count:ptovta_compra_items (count)
    `)
    .eq('empresa_id', perfil.empresa_id)
    .order('fecha_compra', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return { data: null, error: 'Error al obtener compras' }

  const compras = (data ?? []).map((c: any) => ({
    ...c,
    proveedor: c.proveedor ?? null,
    items_count: c.items_count?.[0]?.count ?? 0,
  })) as CompraConProveedor[]

  return { data: compras, error: null }
}

export async function getCompra(id: string): Promise<ActionResponse<CompraDetalle>> {
  const { supabase, perfil } = await getSessionFast()
  if (!perfil?.empresa_id) return { data: null, error: 'No autenticado' }

  const { data, error } = await supabase
    .from('ptovta_compras')
    .select(`
      *,
      proveedor:ptovta_proveedores (id, nombre, ruc),
      items:ptovta_compra_items (
        *,
        ptovta_productos (nombre, codigo)
      )
    `)
    .eq('id', id)
    .eq('empresa_id', perfil.empresa_id)
    .single()

  if (error || !data) return { data: null, error: 'Compra no encontrada' }

  const compra: CompraDetalle = {
    ...data,
    proveedor: (data as any).proveedor ?? null,
    items: ((data as any).items ?? []).map((item: any) => ({
      ...item,
      producto_nombre: item.ptovta_productos?.nombre ?? 'Producto eliminado',
      producto_codigo: item.ptovta_productos?.codigo ?? null,
    })),
  }

  return { data: compra, error: null }
}

export async function registrarCompra(
  input: CompraData
): Promise<ActionResponse<{ id: string }>> {
  const { supabase, user, perfil } = await getSession()
  if (!user || !perfil?.empresa_id) return { data: null, error: 'No autenticado' }
  if (perfil.rol === 'lectura') return { data: null, error: 'Sin permisos para registrar compras' }

  const parsed = compraSchema.safeParse(input)
  if (!parsed.success) return { data: null, error: parsed.error.issues[0].message }

  const { proveedor_id, nro_documento, fecha_compra, items, notas } = parsed.data

  const productoIds = items.map((i) => i.producto_id)
  const { data: productos, error: prodError } = await supabase
    .from('ptovta_productos')
    .select('id, nombre, codigo, stock_actual')
    .in('id', productoIds)
    .eq('empresa_id', perfil.empresa_id)

  if (prodError || !productos) return { data: null, error: 'Error al verificar productos' }
  if (productos.length !== productoIds.length) {
    return { data: null, error: 'Uno o más productos no pertenecen a esta empresa' }
  }

  let totalCompra = new Decimal(0)

  const itemsCalculados = items.map((item) => {
    const prod = productos.find((p) => p.id === item.producto_id)!
    const cantidad = new Decimal(item.cantidad)
    const precio = new Decimal(item.precio_unitario)
    const subtotal = cantidad.times(precio).toDecimalPlaces(2)
    totalCompra = totalCompra.plus(subtotal)

    return {
      producto_id: item.producto_id,
      cantidad: cantidad.toNumber(),
      precio_unitario: precio.toNumber(),
      subtotal: subtotal.toNumber(),
      _prod: prod,
    }
  })

  const totalFinal = totalCompra.toDecimalPlaces(2).toNumber()

  const { data: compra, error: compraError } = await supabase
    .from('ptovta_compras')
    .insert({
      empresa_id: perfil.empresa_id,
      proveedor_id: proveedor_id ?? null,
      usuario_id: user.id,
      nro_documento: nro_documento ?? null,
      fecha_compra: fecha_compra ?? fechaHoyLima(),
      total: totalFinal,
      notas: notas ?? null,
    })
    .select('id')
    .single()

  if (compraError) {
    console.error('[COMPRAS:tablet] Error al insertar compra:', compraError)
    return { data: null, error: 'Error al registrar la compra' }
  }

  const { error: itemsError } = await supabase
    .from('ptovta_compra_items')
    .insert(
      itemsCalculados.map(({ _prod: _, ...item }) => ({ compra_id: compra.id, ...item }))
    )

  if (itemsError) {
    console.error('[COMPRAS:tablet] Error al insertar items:', itemsError)
    return { data: null, error: 'Error al registrar los productos de la compra' }
  }

  const adminClient = createAdminClient()
  const empresaId = perfil.empresa_id

  await Promise.all(itemsCalculados.flatMap((item) => {
    const prod = item._prod
    const stockAnterior = new Decimal(prod.stock_actual)
    const stockNuevo = stockAnterior.plus(item.cantidad).toDecimalPlaces(3).toNumber()
    return [
      adminClient
        .from('ptovta_productos')
        .update({ stock_actual: stockNuevo, precio_compra: item.precio_unitario })
        .eq('id', item.producto_id),
      adminClient.from('ptovta_kardex').insert({
        empresa_id: empresaId,
        producto_id: item.producto_id,
        tipo: 'entrada',
        motivo: 'compra',
        cantidad: item.cantidad,
        stock_anterior: stockAnterior.toNumber(),
        stock_nuevo: stockNuevo,
        referencia_id: compra.id,
        usuario_id: user.id,
      }),
    ]
  }))

  if (proveedor_id) {
    const { data: proveedor } = await supabase
      .from('ptovta_proveedores')
      .select('saldo_deudor')
      .eq('id', proveedor_id)
      .single()

    if (proveedor) {
      const nuevoSaldo = new Decimal(proveedor.saldo_deudor).plus(totalFinal).toDecimalPlaces(2).toNumber()
      await adminClient
        .from('ptovta_proveedores')
        .update({ saldo_deudor: nuevoSaldo })
        .eq('id', proveedor_id)
    }
  }

  return { data: { id: compra.id }, error: null }
}

export async function registrarPago(
  compraId: string,
  input: PagoCompraData
): Promise<ActionResponse<Compra>> {
  const { supabase, perfil } = await getSession()
  if (!perfil?.empresa_id) return { data: null, error: 'No autenticado' }
  if (perfil.rol === 'lectura') return { data: null, error: 'Sin permisos para registrar pagos' }

  const parsed = pagoCompraSchema.safeParse(input)
  if (!parsed.success) return { data: null, error: parsed.error.issues[0].message }

  const montoPago = new Decimal(parsed.data.monto)
  if (montoPago.lte(0)) return { data: null, error: 'El monto debe ser mayor a 0' }

  const { data: compra } = await supabase
    .from('ptovta_compras')
    .select('*')
    .eq('id', compraId)
    .eq('empresa_id', perfil.empresa_id)
    .single()

  if (!compra) return { data: null, error: 'Compra no encontrada' }
  if (compra.estado_pago === 'pagado') return { data: null, error: 'Esta compra ya está pagada' }

  const nuevoMontoPagado = new Decimal(compra.monto_pagado).plus(montoPago).toDecimalPlaces(2)
  const total = new Decimal(compra.total)
  const nuevoEstado = nuevoMontoPagado.gte(total) ? 'pagado' : 'parcial'
  const montoPagadoFinal = nuevoMontoPagado.gt(total) ? total : nuevoMontoPagado

  const { data: updated, error: updateError } = await supabase
    .from('ptovta_compras')
    .update({ monto_pagado: montoPagadoFinal.toNumber(), estado_pago: nuevoEstado })
    .eq('id', compraId)
    .select()
    .single()

  if (updateError) return { data: null, error: 'Error al registrar el pago' }

  if (compra.proveedor_id) {
    const adminClient = createAdminClient()
    const { data: proveedor } = await supabase
      .from('ptovta_proveedores')
      .select('saldo_deudor')
      .eq('id', compra.proveedor_id)
      .single()

    if (proveedor) {
      const nuevoSaldo = new Decimal(proveedor.saldo_deudor)
        .minus(montoPago)
        .toDecimalPlaces(2)
        .toNumber()
      await adminClient
        .from('ptovta_proveedores')
        .update({ saldo_deudor: Math.max(0, nuevoSaldo) })
        .eq('id', compra.proveedor_id)
    }
  }

  return { data: updated as Compra, error: null }
}
