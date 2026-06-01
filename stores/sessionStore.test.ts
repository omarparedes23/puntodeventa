import { describe, it, expect, beforeEach } from 'vitest'
import { useSessionStore } from './sessionStore'
import type { Perfil, Empresa } from '@/types/database'

const mockPerfil: Perfil = {
  id: 'user-1',
  nombre: 'Admin Test',
  rol: 'administrador',
  activo: true,
  empresa_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const mockEmpresa: Empresa = {
  id: 'empresa-1',
  razon_social: 'Test SAC',
  nombre_comercial: 'Test',
  ruc: '20123456789',
  direccion: null,
  telefono: null,
  email: null,
  logo_url: null,
  serie_boleta: 'B001',
  serie_factura: 'F001',
  nubefact_token: null,
  nubefact_modo: 'demo',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

describe('sessionStore', () => {
  beforeEach(() => {
    useSessionStore.getState().clear()
  })

  it('inicia con estado vacío', () => {
    const { perfil, empresa, cajaActiva } = useSessionStore.getState()
    expect(perfil).toBeNull()
    expect(empresa).toBeNull()
    expect(cajaActiva).toBeNull()
  })

  it('setPerfil actualiza el perfil', () => {
    useSessionStore.getState().setPerfil(mockPerfil)
    expect(useSessionStore.getState().perfil).toEqual(mockPerfil)
  })

  it('setEmpresa actualiza la empresa', () => {
    useSessionStore.getState().setEmpresa(mockEmpresa)
    expect(useSessionStore.getState().empresa).toEqual(mockEmpresa)
  })

  it('setCajaActiva actualiza el UUID de caja', () => {
    useSessionStore.getState().setCajaActiva('caja-uuid-123')
    expect(useSessionStore.getState().cajaActiva).toBe('caja-uuid-123')
  })

  it('clear resetea todo el estado', () => {
    useSessionStore.getState().setPerfil(mockPerfil)
    useSessionStore.getState().setEmpresa(mockEmpresa)
    useSessionStore.getState().setCajaActiva('caja-1')
    useSessionStore.getState().clear()

    const { perfil, empresa, cajaActiva } = useSessionStore.getState()
    expect(perfil).toBeNull()
    expect(empresa).toBeNull()
    expect(cajaActiva).toBeNull()
  })
})
