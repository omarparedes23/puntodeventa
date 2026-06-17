'use client'

import { useEffect, useState } from 'react'
import { usePosStore } from '@/stores/posStore'
import { useSessionStore, useCartStore } from '@marketpos/core'
import { TipoVentaToggle } from './TipoVentaToggle'
import { ProductGrid } from './ProductGrid'
import { KioskCart } from './KioskCart'

interface KioskPosClientProps {
  cajaId: string
}

function LiveClock() {
  const [time, setTime] = useState('')

  useEffect(() => {
    function tick() {
      setTime(
        new Date().toLocaleTimeString('es-PE', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'America/Lima',
        })
      )
    }
    tick()
    const id = setInterval(tick, 10_000)
    return () => clearInterval(id)
  }, [])

  return <span className="tabular-nums">{time}</span>
}

export function KioskPosClient({ cajaId }: KioskPosClientProps) {
  const setCajaId = usePosStore((s) => s.setCajaId)
  const empresa = useSessionStore((s) => s.empresa)
  const items = useCartStore((s) => s.items)
  const itemCount = items.reduce((acc, i) => acc + i.cantidad, 0)

  useEffect(() => {
    setCajaId(cajaId)
  }, [cajaId, setCajaId])

  return (
    <div className="flex h-[calc(100vh-72px)] overflow-hidden">
      {/* Left panel — 62% */}
      <div className="flex flex-col flex-[62] overflow-hidden">
        {/* Premium header */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-border/60 bg-card/80 gap-3 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {empresa && (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0" style={{ background: 'var(--gradient-primary)' }}>
                  {(empresa.nombre_comercial ?? empresa.razon_social ?? 'M').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 hidden sm:block">
                  <p className="text-sm font-bold text-foreground truncate leading-tight">
                    {empresa.nombre_comercial ?? empresa.razon_social}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    RUC {empresa.ruc}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs text-muted-foreground font-medium tabular-nums hidden sm:block">
              <LiveClock />
            </div>

            <TipoVentaToggle />

            {itemCount > 0 && (
              <span className="sm:hidden text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold">
                {itemCount}
              </span>
            )}
          </div>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-hidden">
          <ProductGrid />
        </div>
      </div>

      {/* Right panel — 38% */}
      <div className="flex-[38] overflow-hidden">
        <KioskCart />
      </div>
    </div>
  )
}
