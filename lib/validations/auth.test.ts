import { describe, it, expect } from 'vitest'
import { loginSchema, registerSchema } from './auth'

describe('loginSchema', () => {
  it('acepta email y password válidos', () => {
    const result = loginSchema.safeParse({ email: 'test@test.com', password: '12345678' })
    expect(result.success).toBe(true)
  })

  it('rechaza email inválido', () => {
    const result = loginSchema.safeParse({ email: 'no-es-email', password: '12345678' })
    expect(result.success).toBe(false)
  })

  it('rechaza password vacío', () => {
    const result = loginSchema.safeParse({ email: 'test@test.com', password: '' })
    expect(result.success).toBe(false)
  })
})

describe('registerSchema', () => {
  it('acepta datos válidos', () => {
    const result = registerSchema.safeParse({
      email: 'test@test.com',
      password: '12345678',
      confirmPassword: '12345678',
    })
    expect(result.success).toBe(true)
  })

  it('rechaza password menor a 8 caracteres', () => {
    const result = registerSchema.safeParse({
      email: 'test@test.com',
      password: '1234567',
      confirmPassword: '1234567',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza passwords que no coinciden', () => {
    const result = registerSchema.safeParse({
      email: 'test@test.com',
      password: '12345678',
      confirmPassword: '87654321',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza email inválido', () => {
    const result = registerSchema.safeParse({
      email: 'invalido',
      password: '12345678',
      confirmPassword: '12345678',
    })
    expect(result.success).toBe(false)
  })
})
