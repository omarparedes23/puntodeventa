'use client'

import { useEffect } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import type { Empresa, Perfil } from '@/types/database'

export default function SessionHydrator({
  perfil,
  empresa,
  cajaActivaId,
  children,
}: {
  perfil: Perfil
  empresa: Empresa
  cajaActivaId: string | null
  children: React.ReactNode
}) {
  const setPerfil = useSessionStore((s) => s.setPerfil)
  const setEmpresa = useSessionStore((s) => s.setEmpresa)
  const setCajaActiva = useSessionStore((s) => s.setCajaActiva)

  useEffect(() => {
    setPerfil(perfil)
    setEmpresa(empresa)
    setCajaActiva(cajaActivaId)
  }, [perfil, empresa, cajaActivaId, setPerfil, setEmpresa, setCajaActiva])

  return <>{children}</>
}
