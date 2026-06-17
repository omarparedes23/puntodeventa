'use client'

import { useEffect, useState } from 'react'
import { syncAll, procesarVentasPendientes } from '@marketpos/core'
import { procesarVenta } from '@/app/(kiosk)/pos/actions'

export function OfflineSyncProvider({ empresaId }: { empresaId: string }) {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine)

    if (navigator.onLine) {
      syncAll(empresaId).catch(() => {})
    }

    function handleOnline() {
      setIsOnline(true)
      syncAll(empresaId).catch(() => {})
      procesarVentasPendientes(empresaId, procesarVenta as (payload: unknown) => Promise<{ error: string | null }>).catch(() => {})
    }

    function handleOffline() {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [empresaId])

  if (isOnline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-400 text-amber-900 text-sm font-medium text-center px-4 py-2">
      Sin conexión — las ventas se guardarán localmente
    </div>
  )
}
