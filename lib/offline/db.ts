import { openDB } from 'idb'

export type ProductoLocal = {
  id: string
  empresa_id: string
  nombre: string
  codigo: string | null
  precio_minorista: number
  precio_mayorista: number
  stock_actual: number
  afecto_igv: boolean
  permite_decimal: boolean
}

export type ClienteLocal = {
  id: string
  empresa_id: string
  nombre: string
  nro_documento: string | null
  tipo_documento: string | null
  tipo_cliente: string
}

export type VentaPendiente = {
  id: string
  empresa_id: string
  created_at: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any
}

let _db: ReturnType<typeof openDB> | null = null

export function getDB() {
  if (!_db) {
    _db = openDB('marketpos-offline', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('productos')) {
          const ps = db.createObjectStore('productos', { keyPath: 'id' })
          ps.createIndex('by_empresa', 'empresa_id')
        }
        if (!db.objectStoreNames.contains('clientes')) {
          const cs = db.createObjectStore('clientes', { keyPath: 'id' })
          cs.createIndex('by_empresa', 'empresa_id')
        }
        if (!db.objectStoreNames.contains('ventas_pendientes')) {
          db.createObjectStore('ventas_pendientes', { keyPath: 'id' })
        }
      },
    })
  }
  return _db
}
