import { z } from 'zod'
import Decimal from 'decimal.js'

const decimalPositivo = z.union([z.string(), z.number()]).refine(
  (val) => { try { return new Decimal(val).gt(0) } catch { return false } },
  { message: 'Debe ser mayor a 0' }
)

const decimalNoNegativo = z.union([z.string(), z.number()]).refine(
  (val) => { try { return new Decimal(val).gte(0) } catch { return false } },
  { message: 'No puede ser negativo' }
)

export const compraItemSchema = z.object({
  producto_id: z.string().uuid(),
  cantidad: decimalPositivo,
  precio_unitario: decimalPositivo,
})

export const compraSchema = z.object({
  proveedor_id: z.string().uuid().nullable().optional(),
  nro_documento: z.string().max(50).nullable().optional(),
  fecha_compra: z.string().optional(),
  items: z.array(compraItemSchema).min(1, 'Debe agregar al menos un producto'),
  notas: z.string().max(500).nullable().optional(),
})

export const pagoCompraSchema = z.object({
  monto: decimalNoNegativo,
})

export type CompraData = z.infer<typeof compraSchema>
export type PagoCompraData = z.infer<typeof pagoCompraSchema>
