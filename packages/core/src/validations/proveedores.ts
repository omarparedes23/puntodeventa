import { z } from 'zod';

export const proveedorSchema = z.object({
  ruc: z
    .string()
    .length(11, 'El RUC debe tener exactamente 11 dígitos')
    .regex(/^\d+$/, 'El RUC solo debe contener números')
    .optional()
    .or(z.literal('')),
  nombre: z.string().min(2, 'El nombre/razón social debe tener al menos 2 caracteres'),
  contacto: z.string().optional().or(z.literal('')),
  telefono: z.string().optional().or(z.literal('')),
  email: z.string().email('Debe ser un email válido').optional().or(z.literal('')),
  direccion: z.string().optional().or(z.literal('')),
  activo: z.boolean().default(true),
});

export type ProveedorFormValues = z.input<typeof proveedorSchema>;
