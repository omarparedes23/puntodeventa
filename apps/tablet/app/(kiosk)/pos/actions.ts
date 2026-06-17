'use server'

import { after } from 'next/server'
import { unstable_cache, revalidateTag } from 'next/cache'
import { createAdminClient, fechaHoyLima, calcularTotalesVenta } from '@marketpos/core'
import { Decimal } from 'decimal.js'
import { ventaSchema, type VentaInput } from '@marketpos/core'
import type { Venta } from '@marketpos/core'
import { getSession, getSessionFast } from '@/lib/session'

type ActionResponse<T> = { data: T | null; error: string | null }

// ── Server-side cache helpers ─────────────────────────────────────────────────
// unstable_cache runs outside the request scope, so must use createAdminClient.
// Tags are empresa-scoped to avoid cross-tenant invalidation.

const _cachedCategorias = unstable_cache(
  async (empresaId: string) => {
    const admin = createAdminClient()
    const { data } = await admin
      .from('ptovta_categorias')
      .select('id, nombre')
      .eq('empresa_id', empresaId)
      .eq('activo', true)
      .order('nombre')
    return data ?? []
  },
  ['categorias'],
  { revalidate: 300, tags: ['categorias'] }
)

const _cachedProductosByCategory = unstable_cache(
  async (empresaId: string, categoriaId: string | null) => {
    const admin = createAdminClient()
    let q = admin
      .from('ptovta_productos')
      .select(`
        id, nombre, codigo, foto_url,
        precio_minorista, precio_mayorista,
        stock_actual, afecto_igv, categoria_id,
        ptovta_unidades_medida (permite_decimal)
      `)
      .eq('empresa_id', empresaId)
      .eq('activo', true)
    if (categoriaId) q = q.eq('categoria_id', categoriaId)
    const { data } = await q.order('nombre').limit(50)
    return data ?? []
  },
  ['productos-by-category'],
  { revalidate: 60, tags: ['productos'] }
)

const _cachedMasVendidos = unstable_cache(
  async (empresaId: string, limit: number) => {
    const admin = createAdminClient()
    const { data } = await (admin as any).rpc('get_mas_vendidos', {
      p_empresa_id: empresaId,
      p_limit: limit,
    })
    return data ?? []
  },
  ['mas-vendidos'],
  { revalidate: 60, tags: ['productos'] }
)
// ─────────────────────────────────────────────────────────────────────────────

export type ProductoSearchResult = {
  id: string
  nombre: string
  codigo: string | null
  precio_minorista: number
  precio_mayorista: number
  stock_actual: number
  afecto_igv: boolean
  permite_decimal: boolean
  foto_url?: string | null
  categoria_id?: string | null
}

export type CategoriaResult = {
  id: string
  nombre: string
}

export type ClienteSearchResult = {
  id: string
  nombre: string
  tipo_documento: string | null
  nro_documento: string | null
  tipo_cliente: 'mayorista' | 'minorista'
}

export type VentaResult = {
  id: string
  numero_completo: string | null
  total: number
  tipo_comprobante: Venta['tipo_comprobante']
}

export async function buscarProductos(
  query: string,
  categoriaId?: string | null
): Promise<ActionResponse<ProductoSearchResult[]>> {
  const t0 = Date.now()
  const { supabase, perfil } = await getSessionFast()
  if (!perfil?.empresa_id) return { data: null, error: 'No autenticado' }

  if (!query.trim()) return { data: [], error: null }

  let q = supabase
    .from('ptovta_productos')
    .select(`
      id, nombre, codigo, foto_url,
      precio_minorista, precio_mayorista,
      stock_actual, afecto_igv, categoria_id,
      ptovta_unidades_medida (permite_decimal)
    `)
    .eq('empresa_id', perfil.empresa_id)
    .eq('activo', true)
    .or(`nombre.ilike.%${query}%,codigo.ilike.%${query}%`)

  if (categoriaId) q = q.eq('categoria_id', categoriaId)

  const { data, error } = await q.order('nombre').limit(24)

  console.log(`[POS:tablet] buscarProductos "${query}" → ${Date.now() - t0}ms (${data?.length ?? 0} rows)`)
  if (error) return { data: null, error: 'Error al buscar productos' }

  const results: ProductoSearchResult[] = (data ?? []).map((p: any) => ({
    id: p.id,
    nombre: p.nombre,
    codigo: p.codigo,
    foto_url: p.foto_url ?? null,
    precio_minorista: p.precio_minorista,
    precio_mayorista: p.precio_mayorista,
    stock_actual: p.stock_actual,
    afecto_igv: p.afecto_igv,
    categoria_id: p.categoria_id ?? null,
    permite_decimal: p.ptovta_unidades_medida?.permite_decimal ?? false,
  }))

  return { data: results, error: null }
}

export async function getProductosByCategory(
  categoriaId: string | null
): Promise<ActionResponse<ProductoSearchResult[]>> {
  const t0 = Date.now()
  const { perfil } = await getSessionFast()
  if (!perfil?.empresa_id) return { data: null, error: 'No autenticado' }

  const data = await _cachedProductosByCategory(perfil.empresa_id, categoriaId)
  console.log(`[POS:tablet] getProductosByCategory "${categoriaId ?? 'all'}" → ${Date.now() - t0}ms (${data?.length ?? 0} rows) [cache]`)

  const results: ProductoSearchResult[] = (data ?? []).map((p: any) => ({
    id: p.id,
    nombre: p.nombre,
    codigo: p.codigo,
    foto_url: p.foto_url ?? null,
    precio_minorista: p.precio_minorista,
    precio_mayorista: p.precio_mayorista,
    stock_actual: p.stock_actual,
    afecto_igv: p.afecto_igv,
    categoria_id: p.categoria_id ?? null,
    permite_decimal: p.ptovta_unidades_medida?.permite_decimal ?? false,
  }))

  return { data: results, error: null }
}

export async function getMasVendidos(
  limit = 12
): Promise<ActionResponse<ProductoSearchResult[]>> {
  const t0 = Date.now()
  const { perfil } = await getSessionFast()
  if (!perfil?.empresa_id) return { data: null, error: 'No autenticado' }

  const data = await _cachedMasVendidos(perfil.empresa_id, limit)
  console.log(`[POS:tablet] getMasVendidos → ${Date.now() - t0}ms (${data?.length ?? 0} rows) [cache]`)

  const results: ProductoSearchResult[] = (data ?? []).map((p: any) => ({
    id: p.producto_id,
    nombre: p.nombre,
    codigo: p.codigo,
    foto_url: p.foto_url ?? null,
    precio_minorista: p.precio_minorista,
    precio_mayorista: p.precio_mayorista,
    stock_actual: p.stock_actual,
    afecto_igv: p.afecto_igv,
    permite_decimal: false,
  }))

  return { data: results, error: null }
}

export async function getCategorias(): Promise<ActionResponse<CategoriaResult[]>> {
  const { perfil } = await getSessionFast()
  if (!perfil?.empresa_id) return { data: null, error: 'No autenticado' }
  const data = await _cachedCategorias(perfil.empresa_id)
  return { data: data as CategoriaResult[], error: null }
}

export async function buscarClientes(
  query: string
): Promise<ActionResponse<ClienteSearchResult[]>> {
  const t0 = Date.now()
  const { supabase, perfil } = await getSessionFast()
  if (!perfil?.empresa_id) return { data: null, error: 'No autenticado' }

  if (!query.trim()) return { data: [], error: null }

  const { data, error } = await supabase
    .from('ptovta_clientes')
    .select('id, nombre, tipo_documento, nro_documento, tipo_cliente')
    .eq('empresa_id', perfil.empresa_id)
    .eq('activo', true)
    .or(`nombre.ilike.%${query}%,nro_documento.ilike.%${query}%`)
    .order('nombre')
    .limit(10)

  console.log(`[POS:tablet] buscarClientes "${query}" → ${Date.now() - t0}ms (${data?.length ?? 0} rows)`)
  if (error) return { data: null, error: 'Error al buscar clientes' }
  return { data: data as ClienteSearchResult[], error: null }
}

export async function procesarVenta(
  input: VentaInput
): Promise<ActionResponse<VentaResult>> {
  const t0 = Date.now()
  let tPrev = t0
  const tick = (label: string) => {
    const now = Date.now()
    const delta = now - tPrev
    const total = now - t0
    tPrev = now
    console.log(`[POS:tablet] ⏱  ${label.padEnd(32)} +${String(delta).padStart(4)}ms  (total: ${total}ms)`)
  }

  console.log('[POS:tablet] ─── procesarVenta iniciado ───')
  const { supabase, user, perfil } = await getSession()
  if (!user || !perfil?.empresa_id) return { data: null, error: 'No autenticado' }
  if (perfil.rol === 'lectura') return { data: null, error: 'Sin permisos para registrar ventas' }
  tick('auth/getSession')

  const parsed = ventaSchema.safeParse(input)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0].message }
  }
  const { tipo_venta, tipo_comprobante, cliente_id, items, pagos } = parsed.data
  const productoIds = items.map((i) => i.producto_id)

  const [cajaRes, clienteRes, prodRes, empresaRes] = await Promise.all([
    supabase
      .from('ptovta_cajas')
      .select('id')
      .eq('usuario_id', user.id)
      .eq('empresa_id', perfil.empresa_id)
      .eq('estado', 'abierta')
      .maybeSingle(),
    cliente_id
      ? supabase.from('ptovta_clientes').select('nombre, tipo_documento, nro_documento').eq('id', cliente_id).single()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from('ptovta_productos')
      .select('id, nombre, codigo, precio_minorista, precio_mayorista, stock_actual, afecto_igv')
      .in('id', productoIds)
      .eq('empresa_id', perfil.empresa_id),
    tipo_comprobante !== 'ticket'
      ? supabase.from('ptovta_empresas').select('serie_boleta, serie_factura').eq('id', perfil.empresa_id).single()
      : Promise.resolve({ data: null, error: null }),
  ])
  tick('queries ∥ (caja+cliente+productos+empresa)')

  const caja = cajaRes.data
  const productos = prodRes.data
  const empresa = empresaRes.data

  if (!caja) return { data: null, error: 'No tienes una caja abierta.' }
  if (prodRes.error || !productos) return { data: null, error: 'Error al verificar productos' }
  if (productos.length !== productoIds.length) return { data: null, error: 'Uno o más productos no pertenecen a esta empresa' }

  let clienteNubefact = { nombre: 'Consumidor Final', tipo_documento: 'DNI', nro_documento: '00000000' }
  if (clienteRes.data) {
    clienteNubefact = {
      nombre: clienteRes.data.nombre,
      tipo_documento: clienteRes.data.tipo_documento ?? 'DNI',
      nro_documento: clienteRes.data.nro_documento ?? '00000000',
    }
  }

  if (tipo_comprobante === 'factura') {
    if (!cliente_id) return { data: null, error: 'La factura requiere un cliente con RUC' }
    if (clienteNubefact.tipo_documento !== 'RUC') return { data: null, error: 'El cliente seleccionado no tiene RUC' }
    if (!/^\d{11}$/.test(clienteNubefact.nro_documento)) {
      return { data: null, error: `El RUC del cliente (${clienteNubefact.nro_documento}) no es válido` }
    }
  }

  const MAX_DESC_VENDEDOR = new Decimal('0.10')
  for (const item of items) {
    const prod = productos.find((p) => p.id === item.producto_id)!
    if (new Decimal(prod.stock_actual).lt(new Decimal(item.cantidad))) {
      return { data: null, error: `Stock insuficiente para "${prod.nombre}". Disponible: ${prod.stock_actual}` }
    }
    const precio = new Decimal(tipo_venta === 'mayorista' ? prod.precio_mayorista : prod.precio_minorista)
    const descuento = new Decimal(item.descuento ?? '0')
    if (perfil.rol === 'vendedor' && descuento.gt(precio.times(item.cantidad).times(MAX_DESC_VENDEDOR))) {
      return { data: null, error: `Descuento en "${prod.nombre}" supera el 10% permitido` }
    }
  }

  const totalesResult = calcularTotalesVenta(
    items.map((i) => ({ productoId: i.producto_id, cantidad: i.cantidad, descuento: i.descuento })),
    productos.map((p) => ({
      id: p.id,
      precio_minorista: p.precio_minorista,
      precio_mayorista: p.precio_mayorista,
      afecto_igv: p.afecto_igv,
    })),
    tipo_venta
  )

  const itemsCalculados = totalesResult.items.map((calc) => {
    const prod = productos.find((p) => p.id === calc.productoId)!
    return {
      producto_id: calc.productoId,
      producto_nombre: prod.nombre,
      producto_codigo: prod.codigo,
      cantidad: calc.cantidad,
      precio_unitario: calc.precioUnitario,
      descuento: calc.descuento,
      subtotal: calc.subtotal,
      igv: calc.igv,
      total: calc.total,
    }
  })

  const totalFinal = totalesResult.total
  const igvFinal = totalesResult.igv
  const subtotalFinal = totalesResult.subtotal
  const descuentoFinal = totalesResult.descuento

  const totalPagado = pagos.reduce((acc, p) => acc.plus(new Decimal(p.monto)), new Decimal(0))
  if (totalPagado.lt(new Decimal(totalFinal).minus('0.01'))) {
    return { data: null, error: `El monto pagado (S/. ${totalPagado.toFixed(2)}) no cubre el total (S/. ${totalFinal.toFixed(2)})` }
  }

  let serie: string | null = null
  let correlativo: number | null = null
  let numero_completo: string | null = null

  if (tipo_comprobante !== 'ticket') {
    serie = tipo_comprobante === 'boleta'
      ? (empresa?.serie_boleta ?? 'B001')
      : (empresa?.serie_factura ?? 'F001')

    const { data: ultimaVenta } = await supabase
      .from('ptovta_ventas')
      .select('correlativo')
      .eq('empresa_id', perfil.empresa_id)
      .eq('serie', serie)
      .order('correlativo', { ascending: false })
      .limit(1)
      .maybeSingle()

    correlativo = (ultimaVenta?.correlativo ?? 0) + 1
    numero_completo = `${serie}-${String(correlativo).padStart(8, '0')}`
    tick('query: correlativo')
  }

  const { data: venta, error: ventaError } = await supabase
    .from('ptovta_ventas')
    .insert({
      empresa_id: perfil.empresa_id!,
      caja_id: caja.id,
      cliente_id: cliente_id ?? null,
      usuario_id: user.id,
      tipo_venta,
      tipo_comprobante,
      serie,
      correlativo,
      numero_completo,
      subtotal: subtotalFinal,
      descuento_total: descuentoFinal,
      igv: igvFinal,
      total: totalFinal,
      estado: 'pendiente',
    })
    .select('id, numero_completo, total, tipo_comprobante')
    .single()

  if (ventaError) {
    return { data: null, error: 'Error al registrar la venta' }
  }
  tick('insert: venta')

  const adminClient = createAdminClient()
  const empresaId = perfil.empresa_id
  const concepto = numero_completo ?? `Venta ${venta.id.slice(0, 8)}`

  await Promise.all([
    supabase.from('ptovta_venta_items').insert(itemsCalculados.map((i) => ({ venta_id: venta.id, ...i }))),
    supabase.from('ptovta_venta_pagos').insert(pagos.map((p) => ({
      venta_id: venta.id,
      metodo_pago: p.metodo_pago,
      monto: new Decimal(p.monto).toDecimalPlaces(2).toNumber(),
      referencia: p.referencia ?? null,
    }))),
    supabase.from('ptovta_movimientos_caja').insert(pagos.map((p) => ({
      caja_id: caja.id,
      tipo: 'ingreso' as const,
      concepto,
      monto: new Decimal(p.monto).toDecimalPlaces(2).toNumber(),
      metodo_pago: p.metodo_pago,
      referencia_id: venta.id,
    }))),
  ])
  tick('insert ∥ (items+pagos+caja)')

  await Promise.all(itemsCalculados.flatMap((item) => {
    const prod = productos.find((p) => p.id === item.producto_id)!
    const stockAnterior = new Decimal(prod.stock_actual)
    const stockNuevo = stockAnterior.minus(item.cantidad).toDecimalPlaces(3).toNumber()
    return [
      adminClient.from('ptovta_productos').update({ stock_actual: stockNuevo }).eq('id', item.producto_id),
      adminClient.from('ptovta_kardex').insert({
        empresa_id: empresaId,
        producto_id: item.producto_id,
        tipo: 'salida',
        motivo: 'venta',
        cantidad: item.cantidad,
        stock_anterior: stockAnterior.toNumber(),
        stock_nuevo: stockNuevo,
        referencia_id: venta.id,
        usuario_id: user.id,
      }),
    ]
  }))
  tick('update ∥ (stock+kardex)')

  if (tipo_comprobante !== 'ticket') {
    const nfPayload = {
      tipo: tipo_comprobante as 'boleta' | 'factura',
      serie: serie!,
      correlativo: correlativo!,
      fecha_emision: fechaHoyLima(),
      cliente: clienteNubefact,
      items: itemsCalculados.map((i) => ({
        descripcion: i.producto_nombre,
        cantidad: i.cantidad,
        valor_unitario: new Decimal(i.subtotal).dividedBy(i.cantidad).toDecimalPlaces(10).toNumber(),
        precio_unitario: i.precio_unitario,
        subtotal: i.subtotal,
        igv: i.igv,
        total: i.total,
        afecto_igv: productos.find((p) => p.id === i.producto_id)!.afecto_igv,
      })),
      totales: { subtotal: subtotalFinal, descuento: descuentoFinal, igv: igvFinal, total: totalFinal },
    }

    after(async () => {
      console.log(`[POS:tablet] [bg] Enviando a Nubefact: ${numero_completo}`)
      const { facturacionService } = await import('@marketpos/core')
      try {
        const resultado = tipo_comprobante === 'boleta'
          ? await facturacionService.emitirBoleta(nfPayload)
          : await facturacionService.emitirFactura(nfPayload)

        await adminClient.from('ptovta_ventas').update({
          estado: resultado.exito ? 'emitida' : 'error_sunat',
          nubefact_id: resultado.id_externo ?? null,
          pdf_url: resultado.pdf_url ?? null,
          xml_url: resultado.xml_url ?? null,
          sunat_hash: resultado.hash ?? null,
          sunat_cdr: resultado.cdr ?? null,
          sunat_estado: resultado.exito ? (resultado.sunat_aceptada ? 'aceptada' : 'pendiente') : null,
        }).eq('id', venta.id)
      } catch (err) {
        console.error('[POS:tablet] [bg] Error Nubefact:', err)
        await adminClient.from('ptovta_ventas').update({ estado: 'error_sunat' }).eq('id', venta.id)
      }
    })
  } else {
    await adminClient.from('ptovta_ventas').update({ estado: 'emitida' }).eq('id', venta.id)
  }

  // Bust product cache so next category tap shows updated stock
  revalidateTag('productos', 'max')

  return {
    data: {
      id: venta.id,
      numero_completo: venta.numero_completo,
      total: venta.total,
      tipo_comprobante: venta.tipo_comprobante,
    },
    error: null,
  }
}

// -------------------------------------------------------
// getOrCreateClienteGenerico
// -------------------------------------------------------
import type { Cliente } from '@marketpos/core'
import { clienteSchema, type ClienteInput } from '@marketpos/core'

export async function getOrCreateClienteGenerico(): Promise<ActionResponse<Cliente>> {
  const { supabase, perfil } = await getSession()
  if (!perfil?.empresa_id) return { data: null, error: 'No autenticado' }

  const { data: existing } = await supabase
    .from('ptovta_clientes')
    .select('*')
    .eq('empresa_id', perfil.empresa_id)
    .eq('nro_documento', '00000000')
    .maybeSingle()

  if (existing) return { data: existing as Cliente, error: null }

  const { data: created, error } = await supabase
    .from('ptovta_clientes')
    .insert({
      empresa_id: perfil.empresa_id,
      tipo_documento: 'DNI',
      nro_documento: '00000000',
      nombre: 'CLIENTE GENÉRICO',
      tipo_cliente: 'minorista',
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      const { data: retry } = await supabase
        .from('ptovta_clientes')
        .select('*')
        .eq('empresa_id', perfil.empresa_id)
        .eq('nro_documento', '00000000')
        .single()
      if (retry) return { data: retry as Cliente, error: null }
    }
    return { data: null, error: 'Error al crear cliente genérico' }
  }

  return { data: created as Cliente, error: null }
}

// -------------------------------------------------------
// createCliente (for POS inline creation)
// -------------------------------------------------------
export async function createCliente(input: ClienteInput): Promise<ActionResponse<Cliente>> {
  const { supabase, perfil } = await getSession()
  if (!perfil?.empresa_id) return { data: null, error: 'No autenticado' }

  const parsed = clienteSchema.safeParse(input)
  if (!parsed.success) return { data: null, error: parsed.error.issues[0].message }

  const { data, error } = await supabase
    .from('ptovta_clientes')
    .insert({ ...parsed.data, empresa_id: perfil.empresa_id })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return { data: null, error: 'El documento ya está registrado' }
    return { data: null, error: 'Error al crear el cliente' }
  }
  return { data: data as Cliente, error: null }
}
