import { z } from 'zod'
import Decimal from 'decimal.js'

const decimalPositivo = z.union([z.string(), z.number()]).refine(
  (val) => { try { return new Decimal(val).gt(0) } catch { return false } },
  { message: 'Debe ser un número mayor a 0' }
)

const decimalNoNegativo = z.union([z.string(), z.number()]).refine(
  (val) => { try { return new Decimal(val).gte(0) } catch { return false } },
  { message: 'No puede ser negativo' }
)

export const pagoSchema = z.object({
  metodo_pago: z.enum(['efectivo', 'yape', 'tarjeta', 'transferencia', 'credito']),
  monto: decimalPositivo,
  referencia: z.string().max(200).optional(),
})

export const itemVentaSchema = z.object({
  producto_id: z.string().uuid(),
  cantidad: decimalPositivo,
  descuento: decimalNoNegativo.optional().default('0'),
})

export const ventaSchema = z.object({
  tipo_venta: z.enum(['mayorista', 'minorista']),
  tipo_comprobante: z.enum(['boleta', 'factura', 'ticket']),
  cliente_id: z.string().uuid().nullable().optional(),
  items: z.array(itemVentaSchema).min(1, 'El carrito no puede estar vacío'),
  pagos: z.array(pagoSchema).min(1, 'Debe registrar al menos un método de pago'),
})

export type VentaInput = z.infer<typeof ventaSchema>
export type PagoInput = z.infer<typeof pagoSchema>
export type ItemVentaInput = z.infer<typeof itemVentaSchema>
