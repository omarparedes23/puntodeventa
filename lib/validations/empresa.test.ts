import { describe, it, expect } from 'vitest'
import { onboardingSchema } from './empresa'

describe('onboardingSchema', () => {
  it('acepta datos válidos con RUC de 11 dígitos', () => {
    const result = onboardingSchema.safeParse({
      ruc: '20123456789',
      razon_social: 'Empresa SAC',
      nombre_comercial: 'Empresa',
    })
    expect(result.success).toBe(true)
  })

  it('rechaza RUC con menos de 11 dígitos', () => {
    const result = onboardingSchema.safeParse({
      ruc: '2012345678',
      razon_social: 'Empresa SAC',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza RUC con más de 11 dígitos', () => {
    const result = onboardingSchema.safeParse({
      ruc: '201234567890',
      razon_social: 'Empresa SAC',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza RUC con letras', () => {
    const result = onboardingSchema.safeParse({
      ruc: '2012345678A',
      razon_social: 'Empresa SAC',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza razon_social vacía', () => {
    const result = onboardingSchema.safeParse({
      ruc: '20123456789',
      razon_social: '',
    })
    expect(result.success).toBe(false)
  })

  it('acepta sin nombre_comercial (opcional)', () => {
    const result = onboardingSchema.safeParse({
      ruc: '20123456789',
      razon_social: 'Empresa SAC',
    })
    expect(result.success).toBe(true)
    expect(result.data?.nombre_comercial).toBeUndefined()
  })
})
