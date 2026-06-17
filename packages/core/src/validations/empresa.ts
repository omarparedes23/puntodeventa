import { z } from 'zod'

export const onboardingSchema = z.object({
  ruc: z
    .string()
    .regex(/^\d{11}$/, 'El RUC debe tener exactamente 11 dígitos numéricos'),
  razon_social: z.string().min(1, 'La razón social es requerida'),
  nombre_comercial: z.string().optional(),
})

export type OnboardingInput = z.infer<typeof onboardingSchema>
