'use client'

import { useState } from 'react'
import { TipoClienteToggle } from './TipoClienteToggle'
import { ProductSearch } from './ProductSearch'
import { Cart } from './Cart'
import { PaymentModal } from './PaymentModal'
import { useCartStore } from '@marketpos/core'

type VentaExitosa = {
  id: string
  numero_completo: string | null
  total: number
  tipo_comprobante: string
  pendiente?: boolean
}

function fmtMoney(n: number) { return `S/. ${n.toFixed(2)}` }

function SuccessScreen({ venta, onNuevaVenta }: { venta: VentaExitosa; onNuevaVenta: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center gap-4">
      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${venta.pendiente ? 'bg-orange-100 text-orange-600' : 'bg-success/10 text-success'}`}>
        {venta.pendiente ? '⏳' : '✓'}
      </div>
      <div>
        <h2 className={`text-xl font-bold ${venta.pendiente ? 'text-orange-600' : 'text-success'}`}>
          {venta.pendiente ? 'Venta guardada sin internet' : 'Venta registrada'}
        </h2>
        {venta.pendiente ? (
          <p className="text-sm text-muted-foreground mt-1">Se enviará automáticamente al reconectar</p>
        ) : (
          venta.numero_completo && (
            <p className="text-sm text-muted-foreground mt-1 font-mono">{venta.numero_completo}</p>
          )
        )}
        <p className="text-2xl font-bold mt-2">{fmtMoney(venta.total)}</p>
        <p className="text-sm text-muted-foreground capitalize mt-1">{venta.tipo_comprobante}</p>
      </div>
      <button
        onClick={onNuevaVenta}
        className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-3 rounded-xl transition"
      >
        Nueva venta
      </button>
    </div>
  )
}

export function PosClient() {
  const [showPayment, setShowPayment] = useState(false)
  const [ventaExitosa, setVentaExitosa] = useState<VentaExitosa | null>(null)
  const getTotals = useCartStore((s) => s.getTotals)
  const items = useCartStore((s) => s.items)

  if (ventaExitosa) {
    return (
      <SuccessScreen
        venta={ventaExitosa}
        onNuevaVenta={() => setVentaExitosa(null)}
      />
    )
  }

  const { total } = getTotals()

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-muted/30">
      {/* LEFT PANEL: Búsqueda (55%) */}
      <div className="w-full lg:w-[55%] flex flex-col lg:h-full border-r border-border">
        <div className="flex items-center justify-between px-6 py-4 bg-background border-b border-border shrink-0">
          <h1 className="text-lg font-bold text-foreground">Punto de Venta</h1>
          <TipoClienteToggle />
        </div>
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <ProductSearch />
        </div>
      </div>

      {/* RIGHT PANEL: Ticket de Venta (45%) */}
      <div className="w-full lg:w-[45%] flex flex-col min-h-[50vh] lg:h-full bg-background shrink-0 shadow-[-4px_0_24px_-12px_rgba(0,0,0,0.05)] z-10">
        <Cart onCobrar={() => setShowPayment(true)} />
      </div>

      {showPayment && (
        <PaymentModal
          total={total}
          onClose={() => setShowPayment(false)}
          onSuccess={(resultado) => {
            setShowPayment(false)
            setVentaExitosa(resultado)
          }}
        />
      )}
    </div>
  )
}
