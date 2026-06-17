import type { NotaCreditoMotivo } from '@marketpos/core'

export const MOTIVOS_NC: Record<NotaCreditoMotivo, string> = {
  '01': '01 — Anulación de la operación',
  '03': '03 — Corrección por error en la descripción',
  '04': '04 — Descuento global',
  '06': '06 — Devolución total',
  '07': '07 — Devolución por ítem',
}

export type ItemNC = {
  producto_id: string
  producto_nombre: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  igv: number
  total: number
  afecto_igv: boolean
}
