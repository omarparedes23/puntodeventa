'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Decimal from 'decimal.js'
import { registrarPago, type CompraDetalle as CompraDetalleType } from '../actions'

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}
function fmtMoney(n: number) { return `S/. ${n.toFixed(2)}` }

const ESTADO_BADGE: Record<string, string> = {
  pendiente: 'bg-orange-100 text-orange-700',
  parcial:   'bg-blue-100 text-blue-700',
  pagado:    'bg-green-100 text-green-700',
}

function PagoModal({
  compra,
  onClose,
  onPaid,
}: {
  compra: CompraDetalleType
  onClose: () => void
  onPaid: () => void
}) {
  const [monto, setMonto] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const pendiente = new Decimal(compra.total).minus(compra.monto_pagado).toDecimalPlaces(2).toNumber()

  function handlePagar() {
    setError(null)
    const val = parseFloat(monto)
    if (isNaN(val) || val <= 0) { setError('Ingresa un monto válido'); return }

    startTransition(async () => {
      const res = await registrarPago(compra.id, { monto: monto })
      if (res.error) { setError(res.error); return }
      onPaid()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h3 className="text-base font-semibold">Registrar pago</h3>

        <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-500">Total compra</span>
            <span className="font-mono">{fmtMoney(compra.total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Ya pagado</span>
            <span className="font-mono text-green-600">{fmtMoney(compra.monto_pagado)}</span>
          </div>
          <div className="flex justify-between font-semibold border-t pt-1">
            <span>Pendiente</span>
            <span className="font-mono text-orange-600">{fmtMoney(pendiente)}</span>
          </div>
        </div>

        {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        <div>
          <label className="block text-xs text-gray-500 mb-1">Monto a pagar (S/.)</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            max={pendiente}
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder={pendiente.toFixed(2)}
            className="w-full border rounded-lg px-3 py-2 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setMonto(pendiente.toFixed(2))}
            className="mt-1 text-xs text-blue-600 hover:text-blue-700"
          >
            Pagar todo ({fmtMoney(pendiente)})
          </button>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 py-2.5 border rounded-xl text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handlePagar}
            disabled={isPending}
            className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {isPending ? 'Registrando...' : 'Registrar pago'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function CompraDetalle({ compra: initialCompra }: { compra: CompraDetalleType }) {
  const router = useRouter()
  const [compra, setCompra] = useState(initialCompra)
  const [showPago, setShowPago] = useState(false)

  const pendiente = new Decimal(compra.total).minus(compra.monto_pagado).toDecimalPlaces(2).toNumber()

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
          <div>
            <h1 className="text-lg font-semibold">
              Compra {compra.nro_documento ? `· ${compra.nro_documento}` : ''}
            </h1>
            <p className="text-xs text-gray-400">
              {fmtDate(compra.fecha_compra)}
              {compra.proveedor && ` · ${compra.proveedor.nombre}`}
              {compra.proveedor?.ruc && ` (RUC ${compra.proveedor.ruc})`}
            </p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${ESTADO_BADGE[compra.estado_pago]}`}>
          {compra.estado_pago}
        </span>
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-medium">Productos</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Producto</th>
              <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Cantidad</th>
              <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">P. Compra</th>
              <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {compra.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">
                  <p className="font-medium">{item.producto_nombre}</p>
                  {item.producto_codigo && <p className="text-xs text-gray-400">{item.producto_codigo}</p>}
                </td>
                <td className="px-4 py-3 text-right font-mono">{item.cantidad}</td>
                <td className="px-4 py-3 text-right font-mono">{fmtMoney(item.precio_unitario)}</td>
                <td className="px-4 py-3 text-right font-mono font-semibold">{fmtMoney(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t bg-gray-50">
            <tr>
              <td colSpan={3} className="px-4 py-3 text-right font-semibold">Total</td>
              <td className="px-4 py-3 text-right font-mono font-bold text-blue-700">
                {fmtMoney(compra.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Pago */}
      <div className="bg-white rounded-xl shadow-sm border p-5 space-y-3">
        <h2 className="text-sm font-medium">Estado de pago</h2>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Total</p>
            <p className="font-mono font-semibold">{fmtMoney(compra.total)}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-xs text-green-600 mb-1">Pagado</p>
            <p className="font-mono font-semibold text-green-700">{fmtMoney(compra.monto_pagado)}</p>
          </div>
          <div className={`rounded-lg p-3 text-center ${pendiente > 0 ? 'bg-orange-50' : 'bg-gray-50'}`}>
            <p className={`text-xs mb-1 ${pendiente > 0 ? 'text-orange-600' : 'text-gray-500'}`}>Pendiente</p>
            <p className={`font-mono font-semibold ${pendiente > 0 ? 'text-orange-700' : 'text-gray-700'}`}>
              {fmtMoney(pendiente)}
            </p>
          </div>
        </div>

        {compra.estado_pago !== 'pagado' && (
          <button
            onClick={() => setShowPago(true)}
            className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition"
          >
            Registrar pago
          </button>
        )}
      </div>

      {compra.notas && (
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <p className="text-xs text-gray-500 mb-1">Notas</p>
          <p className="text-sm text-gray-700">{compra.notas}</p>
        </div>
      )}

      {showPago && (
        <PagoModal
          compra={compra}
          onClose={() => setShowPago(false)}
          onPaid={() => {
            setShowPago(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
