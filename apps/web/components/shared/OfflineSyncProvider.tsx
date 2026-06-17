'use client'

import { useEffect } from 'react'
import { syncAll, procesarVentasPendientes } from '@marketpos/core'
import { procesarVenta } from '@/app/(dashboard)/pos/actions'

export function OfflineSyncProvider({ empresaId }: { empresaId: string }) {
  useEffect(() => {
    if (navigator.onLine) {
      syncAll(empresaId).catch(() => {})
    }

    function handleOnline() {
      syncAll(empresaId).catch(() => {})
      // Cast to match ProcesarVentaFn signature — payload is validated inside procesarVenta
      procesarVentasPendientes(empresaId, procesarVenta as (payload: unknown) => Promise<{ error: string | null }>).catch(() => {})
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [empresaId])

  return null
}
