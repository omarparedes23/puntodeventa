'use client'

import { useSessionStore } from '@marketpos/core'

export function useSession() {
  const perfil = useSessionStore((s) => s.perfil)
  const empresa = useSessionStore((s) => s.empresa)
  const cajaActiva = useSessionStore((s) => s.cajaActiva)
  const setPerfil = useSessionStore((s) => s.setPerfil)
  const setEmpresa = useSessionStore((s) => s.setEmpresa)
  const setCajaActiva = useSessionStore((s) => s.setCajaActiva)
  const clear = useSessionStore((s) => s.clear)

  return { perfil, empresa, cajaActiva, setPerfil, setEmpresa, setCajaActiva, clear }
}
