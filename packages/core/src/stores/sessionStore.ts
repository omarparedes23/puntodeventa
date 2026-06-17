import { create } from 'zustand'
import type { Empresa, Perfil } from '../types/database'

interface SessionState {
  perfil: Perfil | null
  empresa: Empresa | null
  cajaActiva: string | null
  setPerfil: (perfil: Perfil) => void
  setEmpresa: (empresa: Empresa) => void
  setCajaActiva: (id: string | null) => void
  clear: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  perfil: null,
  empresa: null,
  cajaActiva: null,
  setPerfil: (perfil) => set({ perfil }),
  setEmpresa: (empresa) => set({ empresa }),
  setCajaActiva: (id) => set({ cajaActiva: id }),
  clear: () => set({ perfil: null, empresa: null, cajaActiva: null }),
}))
