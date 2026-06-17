'use client'

import { useCartStore } from '@marketpos/core'

export function TipoClienteToggle() {
  const tipoVenta = useCartStore((s) => s.tipoVenta)
  const setTipoVenta = useCartStore((s) => s.setTipoVenta)

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => setTipoVenta('minorista')}
        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition ${
          tipoVenta === 'minorista'
            ? 'bg-white shadow text-gray-900'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        Minorista
      </button>
      <button
        onClick={() => setTipoVenta('mayorista')}
        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition ${
          tipoVenta === 'mayorista'
            ? 'bg-white shadow text-blue-700'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        Mayorista
      </button>
    </div>
  )
}
