import { z } from 'zod'
import { Decimal } from 'decimal.js'

const montoPositivo = z.union([z.string(), z.number()]).refine(
  (val) => {
    try { return new Decimal(val).gte(0) } catch { return false }
  },
  { message: 'El monto debe ser mayor o igual a 0' }
)

const montoMayorCero = z.union([z.string(), z.number()]).refine(
  (val) => {
    try { return new Decimal(val).gt(0) } catch { return false }
  },
  { message: 'El monto debe ser mayor a 0' }
)

export const abrirCajaSchema = z.object({
  monto_inicial: montoPositivo,
  notas: z.string().max(500).nullable().optional(),
})

export const movimientoSchema = z.object({
  tipo: z.enum(['ingreso', 'egreso']),
  concepto: z.string().min(1, 'El concepto es requerido').max(200),
  monto: montoMayorCero,
  metodo_pago: z.enum(['efectivo', 'yape', 'tarjeta', 'transferencia', 'credito']).default('efectivo'),
})

export const cerrarCajaSchema = z.object({
  monto_final: montoPositivo,
  notas: z.string().max(500).nullable().optional(),
})

export type AbrirCajaData = z.infer<typeof abrirCajaSchema>
export type MovimientoData = z.infer<typeof movimientoSchema>
export type CerrarCajaData = z.infer<typeof cerrarCajaSchema>
