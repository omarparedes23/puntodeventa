'use server'

import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Decimal } from 'decimal.js'
import { ventaSchema, type VentaInput } from '@/lib/validations/pos'
import type { Venta } from '@/types/database'

type ActionResponse<T> = { data: T | null; error: string | null }

const IGV_RATE = new Decimal('0.18')

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
// Tipos de retorno para búsquedas
// -------------------------------------------------------
export type ProductoSearchResult = {
  id: string
  nombre: string
  codigo: string | null
  precio_minorista: number
  precio_mayorista: number
  stock_actual: number
  afecto_igv: boolean
  permite_decimal: boolean
}

export type ClienteSearchResult = {
  id: string
  nombre: string
  tipo_documento: string | null
  nro_documento: string | null
  tipo_cliente: 'mayorista' | 'minorista'
}

// -------------------------------------------------------
// buscarProductos
// -------------------------------------------------------
export async function buscarProductos(
  query: string
): Promise<ActionResponse<ProductoSearchResult[]>> {
  const { supabase, perfil } = await getSession()
  if (!perfil?.empresa_id) return { data: null, error: 'No autenticado' }

  if (!query.trim()) return { data: [], error: null }

  const { data, error } = await supabase
    .from('ptovta_productos')
    .select(`
      id, nombre, codigo,
      precio_minorista, precio_mayorista,
      stock_actual, afecto_igv,
      ptovta_unidades_medida (permite_decimal)
    `)
    .eq('empresa_id', perfil.empresa_id)
    .eq('activo', true)
    .or(`nombre.ilike.%${query}%,codigo.ilike.%${query}%`)
    .order('nombre')
    .limit(20)

  if (error) return { data: null, error: 'Error al buscar productos' }

  const results: ProductoSearchResult[] = (data ?? []).map((p: any) => ({
    id: p.id,
    nombre: p.nombre,
    codigo: p.codigo,
    precio_minorista: p.precio_minorista,
    precio_mayorista: p.precio_mayorista,
    stock_actual: p.stock_actual,
    afecto_igv: p.afecto_igv,
    permite_decimal: p.ptovta_unidades_medida?.permite_decimal ?? false,
  }))

  return { data: results, error: null }
}

// -------------------------------------------------------
// buscarClientes
// -------------------------------------------------------
export async function buscarClientes(
  query: string
): Promise<ActionResponse<ClienteSearchResult[]>> {
  const { supabase, perfil } = await getSession()
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

  if (error) return { data: null, error: 'Error al buscar clientes' }
  return { data: data as ClienteSearchResult[], error: null }
}

// -------------------------------------------------------
// procesarVenta
// -------------------------------------------------------
export type VentaResult = {
  id: string
  numero_completo: string | null
  total: number
  tipo_comprobante: Venta['tipo_comprobante']
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
    console.log(`[POS] ⏱  ${label.padEnd(32)} +${String(delta).padStart(4)}ms  (total: ${total}ms)`)
  }

  console.log('[POS] ─── procesarVenta iniciado ───')
  const { supabase, user, perfil } = await getSession()
  if (!user || !perfil?.empresa_id) return { data: null, error: 'No autenticado' }
  if (perfil.rol === 'lectura') return { data: null, error: 'Sin permisos para registrar ventas' }
  tick('auth/getSession')

  // 1. Validar input (síncrono)
  const parsed = ventaSchema.safeParse(input)
  if (!parsed.success) {
    console.error('[POS] Validación fallida:', parsed.error.issues[0].message)
    return { data: null, error: parsed.error.issues[0].message }
  }
  const { tipo_venta, tipo_comprobante, cliente_id, items, pagos } = parsed.data
  console.log(`[POS] Usuario: ${user.id} | Rol: ${perfil.rol} | tipo: ${tipo_comprobante} | items: ${items.length}`)

  const productoIds = items.map((i) => i.producto_id)

  // 2. Queries en paralelo: caja + cliente + productos + empresa (todos independientes)
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

  if (!caja) return { data: null, error: 'No tienes una caja abierta. Ve a Caja para abrir el turno.' }
  if (prodRes.error || !productos) return { data: null, error: 'Error al verificar productos' }
  if (productos.length !== productoIds.length) return { data: null, error: 'Uno o más productos no pertenecen a esta empresa' }

  // Construir datos del cliente para Nubefact
  let clienteNubefact = { nombre: 'Consumidor Final', tipo_documento: 'DNI', nro_documento: '00000000' }
  if (clienteRes.data) {
    clienteNubefact = {
      nombre: clienteRes.data.nombre,
      tipo_documento: clienteRes.data.tipo_documento ?? 'DNI',
      nro_documento: clienteRes.data.nro_documento ?? '00000000',
    }
  }

  // Validar RUC para facturas
  if (tipo_comprobante === 'factura') {
    if (!cliente_id) return { data: null, error: 'La factura requiere un cliente con RUC' }
    if (clienteNubefact.tipo_documento !== 'RUC') return { data: null, error: 'El cliente seleccionado no tiene RUC — las facturas requieren RUC' }
    if (!/^\d{11}$/.test(clienteNubefact.nro_documento)) {
      return { data: null, error: `El RUC del cliente (${clienteNubefact.nro_documento}) no es válido — debe tener exactamente 11 dígitos` }
    }
  }

  console.log(`[POS] ✓ Caja: ${caja.id} | Productos: ${productos.map(p => p.nombre).join(', ')}`)

  // 3. Verificar stock y descuentos
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

  // 4. Calcular totales
  let totalVenta = new Decimal(0)
  let totalIgv = new Decimal(0)
  let totalDescuentos = new Decimal(0)

  const itemsCalculados = items.map((item) => {
    const prod = productos.find((p) => p.id === item.producto_id)!
    const precio = new Decimal(tipo_venta === 'mayorista' ? prod.precio_mayorista : prod.precio_minorista)
    const cantidad = new Decimal(item.cantidad)
    const descuento = new Decimal(item.descuento ?? '0')
    const lineTotal = precio.times(cantidad).minus(descuento).toDecimalPlaces(2)
    let igvItem = new Decimal(0)
    if (prod.afecto_igv) {
      igvItem = lineTotal.times(IGV_RATE).dividedBy(new Decimal(1).plus(IGV_RATE)).toDecimalPlaces(2)
    }
    const subtotalItem = lineTotal.minus(igvItem).toDecimalPlaces(2)
    totalVenta = totalVenta.plus(lineTotal)
    totalIgv = totalIgv.plus(igvItem)
    totalDescuentos = totalDescuentos.plus(descuento)
    return {
      producto_id: item.producto_id,
      producto_nombre: prod.nombre,
      producto_codigo: prod.codigo,
      cantidad: cantidad.toNumber(),
      precio_unitario: precio.toNumber(),
      descuento: descuento.toNumber(),
      subtotal: subtotalItem.toNumber(),
      igv: igvItem.toNumber(),
      total: lineTotal.toNumber(),
    }
  })

  const totalFinal = totalVenta.toDecimalPlaces(2).toNumber()
  const igvFinal = totalIgv.toDecimalPlaces(2).toNumber()
  const subtotalFinal = totalVenta.minus(totalIgv).toDecimalPlaces(2).toNumber()
  const descuentoFinal = totalDescuentos.toDecimalPlaces(2).toNumber()
  console.log(`[POS] ✓ Totales — subtotal: ${subtotalFinal} | IGV: ${igvFinal} | TOTAL: ${totalFinal}`)

  const totalPagado = pagos.reduce((acc, p) => acc.plus(new Decimal(p.monto)), new Decimal(0))
  if (totalPagado.lt(new Decimal(totalFinal).minus('0.01'))) {
    return { data: null, error: `El monto pagado (S/. ${totalPagado.toFixed(2)}) no cubre el total (S/. ${totalFinal.toFixed(2)})` }
  }

  // 5. Correlativo (secuencial: depende de empresa para saber la serie)
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
    console.log(`[POS] ✓ Número asignado: ${numero_completo}`)
  }

  // 6. Insertar venta
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
    console.error('[POS] Error al insertar venta:', ventaError)
    return { data: null, error: 'Error al registrar la venta' }
  }
  tick('insert: venta')
  console.log(`[POS] ✓ Venta creada: ${venta.id}`)

  const adminClient = createAdminClient()
  const concepto = numero_completo ?? `Venta ${venta.id.slice(0, 8)}`

  // 7. Items + pagos + movimientos_caja en paralelo
  const [itemsResult, pagosResult] = await Promise.all([
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

  if (itemsResult.error) {
    console.error('[POS] Error al insertar items:', itemsResult.error)
    return { data: null, error: 'Error al registrar los productos de la venta' }
  }
  if (pagosResult.error) {
    console.error('[POS] Error al insertar pagos:', pagosResult.error)
    return { data: null, error: 'Error al registrar los pagos' }
  }
  tick('insert ∥ (items+pagos+caja)')
  console.log(`[POS] ✓ Items: ${itemsCalculados.length} | Pagos: ${pagos.map(p => `${p.metodo_pago}=S/.${p.monto}`).join(', ')}`)

  // 8. Stock + kardex en paralelo (un Promise por producto)
  await Promise.all(itemsCalculados.map(async (item) => {
    const prod = productos.find((p) => p.id === item.producto_id)!
    const stockAnterior = new Decimal(prod.stock_actual)
    const stockNuevo = stockAnterior.minus(item.cantidad).toDecimalPlaces(3).toNumber()
    await adminClient.from('ptovta_productos').update({ stock_actual: stockNuevo }).eq('id', item.producto_id)
    await adminClient.from('ptovta_kardex').insert({
      empresa_id: perfil.empresa_id!,
      producto_id: item.producto_id,
      tipo: 'salida',
      motivo: 'venta',
      cantidad: item.cantidad,
      stock_anterior: stockAnterior.toNumber(),
      stock_nuevo: stockNuevo,
      referencia_id: venta.id,
      usuario_id: user.id,
    })
    console.log(`[POS]   ✓ Stock ${prod.nombre}: ${stockAnterior.toNumber()} → ${stockNuevo}`)
  }))
  tick('update ∥ (stock+kardex)')

  // 9. Nubefact en background — usuario recibe respuesta ya, Nubefact no bloquea
  if (tipo_comprobante !== 'ticket') {
    const nfPayload = {
      tipo: tipo_comprobante as 'boleta' | 'factura',
      serie: serie!,
      correlativo: correlativo!,
      fecha_emision: new Date().toISOString().split('T')[0],
      cliente: clienteNubefact,
      items: itemsCalculados.map((i) => ({
        descripcion: i.producto_nombre,
        cantidad: i.cantidad,
        valor_unitario: i.subtotal / i.cantidad,
        precio_unitario: i.precio_unitario,
        subtotal: i.subtotal,
        igv: i.igv,
        total: i.total,
        afecto_igv: productos.find((p) => p.id === i.producto_id)!.afecto_igv,
      })),
      totales: { subtotal: subtotalFinal, descuento: descuentoFinal, igv: igvFinal, total: totalFinal },
    }

    after(async () => {
      const tNF = Date.now()
      console.log(`[POS] [bg] Enviando a Nubefact: ${numero_completo}`)
      const { facturacionService } = await import('@/lib/facturacion/nubefact')
      try {
        const resultado = tipo_comprobante === 'boleta'
          ? await facturacionService.emitirBoleta(nfPayload)
          : await facturacionService.emitirFactura(nfPayload)

        console.log(`[POS] [bg] Nubefact ${resultado.exito ? '✓' : '✗'} ${numero_completo} en ${Date.now() - tNF}ms`)

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
        console.error('[POS] [bg] Error Nubefact:', err)
        await adminClient.from('ptovta_ventas').update({ estado: 'error_sunat' }).eq('id', venta.id)
      }
    })
  } else {
    await adminClient.from('ptovta_ventas').update({ estado: 'emitida' }).eq('id', venta.id)
    console.log(`[POS] ✓ Ticket emitido`)
  }

  tick('total (Nubefact en background)')
  console.log(`[POS] ─── procesarVenta completado: ${venta.id} | TOTAL USUARIO: ${Date.now() - t0}ms ───`)

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
