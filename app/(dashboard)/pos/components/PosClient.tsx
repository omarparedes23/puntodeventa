'use client'

import { useState } from 'react'
import { TipoClienteToggle } from './TipoClienteToggle'
import { ProductSearch } from './ProductSearch'
import { Cart } from './Cart'
import { PaymentModal } from './PaymentModal'
import { useCartStore } from '@/stores/cartStore'

type VentaExitosa = {
  id: string
  numero_completo: string | null
  total: number
  tipo_comprobante: string
}

function fmtMoney(n: number) { return `S/. ${n.toFixed(2)}` }

function SuccessScreen({ venta, onNuevaVenta }: { venta: VentaExitosa; onNuevaVenta: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center gap-4">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl">✓</div>
      <div>
        <h2 className="text-xl font-bold text-green-700">Venta registrada</h2>
        {venta.numero_completo && (
          <p className="text-sm text-gray-600 mt-1 font-mono">{venta.numero_completo}</p>
        )}
        <p className="text-2xl font-bold mt-2">{fmtMoney(venta.total)}</p>
        <p className="text-sm text-gray-400 capitalize mt-1">{venta.tipo_comprobante}</p>
      </div>
      <button
        onClick={onNuevaVenta}
        className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-xl transition"
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
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
        <h1 className="text-base font-semibold">Punto de Venta</h1>
        <TipoClienteToggle />
      </div>

      {/* Search */}
      <div className="px-4 py-3 bg-white border-b">
        <ProductSearch />
      </div>

      {/* Cart — ocupa el resto del espacio */}
      <div className="flex-1 bg-white flex flex-col min-h-0">
        {items.length > 0 && (
          <div className="px-4 py-2 border-b">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
              Carrito — {items.length} {items.length === 1 ? 'producto' : 'productos'}
            </p>
          </div>
        )}
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
