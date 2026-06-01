import { z } from 'zod'

export const empresaConfigSchema = z.object({
  razon_social: z.string().min(2, 'Mínimo 2 caracteres'),
  nombre_comercial: z.string().optional().or(z.literal('')),
  ruc: z.string().length(11, 'RUC debe tener 11 dígitos').regex(/^\d+$/, 'Solo números'),
  direccion: z.string().optional().or(z.literal('')),
  telefono: z.string().optional().or(z.literal('')),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  serie_boleta: z.string().regex(/^B\d{3}$/, 'Formato: B001'),
  serie_factura: z.string().regex(/^F\d{3}$/, 'Formato: F001'),
})

export const nubefactConfigSchema = z.object({
  nubefact_modo: z.enum(['demo', 'produccion']),
  nubefact_token: z.string().optional().or(z.literal('')),
})

export type EmpresaConfigFormValues = z.input<typeof empresaConfigSchema>
export type NubefactConfigFormValues = z.input<typeof nubefactConfigSchema>
