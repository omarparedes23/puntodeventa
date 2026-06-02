'use client'

import { useEffect } from 'react'
import { syncAll, procesarVentasPendientes } from '@/lib/offline/sync'

export function OfflineSyncProvider({ empresaId }: { empresaId: string }) {
  useEffect(() => {
    if (navigator.onLine) {
      syncAll(empresaId).catch(() => {})
    }

    function handleOnline() {
      syncAll(empresaId).catch(() => {})
      procesarVentasPendientes(empresaId).catch(() => {})
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [empresaId])

  return null
}
