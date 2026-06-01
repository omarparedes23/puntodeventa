import { z } from 'zod'

export const clienteSchema = z.object({
  tipo_cliente: z.enum(['minorista', 'mayorista']).default('minorista'),
  tipo_documento: z.enum(['DNI', 'RUC', 'CE', 'PASAPORTE']).nullable().optional(),
  nro_documento: z.string().nullable().optional(),
  nombre: z.string().min(1, 'El nombre es requerido'),
  telefono: z.string().nullable().optional(),
  email: z.string().email('Email inválido').or(z.literal('')).nullable().optional(),
  direccion: z.string().nullable().optional(),
  tiene_credito: z.boolean().optional().default(false),
  limite_credito: z.number().min(0, 'Debe ser mayor o igual a 0').optional().default(0),
  saldo_deudor: z.number().min(0).optional().default(0),
  activo: z.boolean().optional().default(true),
}).superRefine((data, ctx) => {
  if (!data.nro_documento) return

  if (data.tipo_documento === 'DNI') {
    if (!/^\d{8}$/.test(data.nro_documento)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El DNI debe tener exactamente 8 dígitos',
        path: ['nro_documento'],
      })
    }
  } else if (data.tipo_documento === 'RUC') {
    if (!/^(10|15|17|20)\d{9}$/.test(data.nro_documento)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El RUC debe tener 11 dígitos y empezar con 10, 15, 17 o 20',
        path: ['nro_documento'],
      })
    }
  }
})

export type ClienteInput = z.infer<typeof clienteSchema>
