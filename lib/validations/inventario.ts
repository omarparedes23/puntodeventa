import { z } from 'zod'
import { Decimal } from 'decimal.js'

const decimalPositive = z.union([z.string(), z.number()]).refine(
  (val) => {
    try {
      return new Decimal(val).gte(0)
    } catch {
      return false
    }
  },
  { message: 'Debe ser un número mayor o igual a 0' }
)

export const categoriaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(100, 'Máximo 100 caracteres'),
  parent_id: z.string().uuid().nullable().optional(),
  activo: z.boolean().optional().default(true),
})

export const unidadMedidaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(50, 'Máximo 50 caracteres'),
  simbolo: z.string().min(1, 'El símbolo es requerido').max(10, 'Máximo 10 caracteres'),
  permite_decimal: z.boolean().optional().default(false),
})

const uuidOrNull = z.union([
  z.string().uuid('UUID inválido'),
  z.literal('').transform((): null => null),
  z.null(),
]).optional()

export const productoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(255, 'Máximo 255 caracteres'),
  codigo: z.string().max(50, 'Máximo 50 caracteres').nullable().optional(),
  categoria_id: uuidOrNull.optional(),
  unidad_medida_id: uuidOrNull.optional(),
  descripcion: z.string().nullable().optional(),
  foto_url: z.string().url('URL inválida').nullable().optional(),
  precio_compra: decimalPositive,
  precio_minorista: decimalPositive,
  precio_mayorista: decimalPositive,
  stock_actual: decimalPositive.optional().default('0'),
  stock_minimo: decimalPositive.nullable().optional(),
  activo: z.boolean().optional().default(true),
  afecto_igv: z.boolean().optional().default(true),
  codigo_sunat: z.string().optional().default('10'),
})

export type CategoriaFormData = z.infer<typeof categoriaSchema>
export type UnidadMedidaFormData = z.infer<typeof unidadMedidaSchema>
export type ProductoFormData = z.infer<typeof productoSchema>
