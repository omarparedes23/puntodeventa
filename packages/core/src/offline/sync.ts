import { createClient } from '../supabase/client'
import { getDB, type ProductoLocal, type ClienteLocal } from './db'

const supabase = createClient()

export async function syncProductos(empresaId: string): Promise<void> {
  const { data } = await supabase
    .from('ptovta_productos')
    .select('id, nombre, codigo, precio_minorista, precio_mayorista, stock_actual, afecto_igv, ptovta_unidades_medida(permite_decimal)')
    .eq('empresa_id', empresaId)
    .eq('activo', true)
    .order('nombre')
    .limit(2000)

  if (!data?.length) return

  const db = await getDB()
  const tx = db.transaction('productos', 'readwrite')
  const puts = data.map((p: any) =>
    tx.store.put({
      id: p.id,
      empresa_id: empresaId,
      nombre: p.nombre,
      codigo: p.codigo ?? null,
      precio_minorista: p.precio_minorista,
      precio_mayorista: p.precio_mayorista,
      stock_actual: p.stock_actual,
      afecto_igv: p.afecto_igv,
      permite_decimal: p.ptovta_unidades_medida?.permite_decimal ?? false,
    } satisfies ProductoLocal)
  )
  await Promise.all([...puts, tx.done])
}

export async function syncClientes(empresaId: string): Promise<void> {
  const { data } = await supabase
    .from('ptovta_clientes')
    .select('id, nombre, nro_documento, tipo_documento, tipo_cliente')
    .eq('empresa_id', empresaId)
    .eq('activo', true)
    .order('nombre')
    .limit(2000)

  if (!data?.length) return

  const db = await getDB()
  const tx = db.transaction('clientes', 'readwrite')
  const puts = data.map((c: any) =>
    tx.store.put({
      id: c.id,
      empresa_id: empresaId,
      nombre: c.nombre,
      nro_documento: c.nro_documento ?? null,
      tipo_documento: c.tipo_documento ?? null,
      tipo_cliente: c.tipo_cliente,
    } satisfies ClienteLocal)
  )
  await Promise.all([...puts, tx.done])
}

export async function syncAll(empresaId: string): Promise<void> {
  await Promise.all([syncProductos(empresaId), syncClientes(empresaId)])
}

export async function searchProductosOffline(empresaId: string, q: string): Promise<ProductoLocal[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('productos', 'by_empresa', empresaId)
  const lower = q.toLowerCase()
  return all
    .filter((p) => p.nombre.toLowerCase().includes(lower) || (p.codigo?.toLowerCase().includes(lower) ?? false))
    .slice(0, 20)
}

export async function searchClientesOffline(empresaId: string, q: string): Promise<ClienteLocal[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('clientes', 'by_empresa', empresaId)
  const lower = q.toLowerCase()
  return all
    .filter((c) => c.nombre.toLowerCase().includes(lower) || (c.nro_documento?.includes(q) ?? false))
    .slice(0, 10)
}

export async function saveVentaPendiente(empresaId: string, payload: unknown): Promise<string> {
  const db = await getDB()
  const id = crypto.randomUUID()
  await db.put('ventas_pendientes', { id, empresa_id: empresaId, created_at: new Date().toISOString(), payload })
  return id
}

// T-34: DI refactor — procesarVenta is injected to avoid coupling to a Server Action
type ProcesarVentaFn = (payload: unknown) => Promise<{ error: string | null }>

export async function procesarVentasPendientes(
  empresaId: string,
  procesarVenta: ProcesarVentaFn,
): Promise<void> {
  const db = await getDB()
  const todas = await db.getAll('ventas_pendientes')
  const pendientes = todas.filter((v) => v.empresa_id === empresaId)

  for (const venta of pendientes) {
    try {
      const res = await procesarVenta(venta.payload)
      if (!res.error) {
        await db.delete('ventas_pendientes', venta.id)
      }
    } catch {
      // Si falla, se reintenta en la próxima reconexión
    }
  }
}

export async function contarVentasPendientes(empresaId: string): Promise<number> {
  const db = await getDB()
  const todas = await db.getAll('ventas_pendientes')
  return todas.filter((v) => v.empresa_id === empresaId).length
}
