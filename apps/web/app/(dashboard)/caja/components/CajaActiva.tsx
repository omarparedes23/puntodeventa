'use client'

import { useState } from 'react'
import type { Caja, MovimientoCaja } from '@marketpos/core'
import { MovimientoForm } from './MovimientoForm'
import { CierreModal } from './CierreModal'

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtMoney(n: number) {
  return `S/. ${n.toFixed(2)}`
}

export function CajaActiva({
  caja,
  movimientos,
}: {
  caja: Caja
  movimientos: MovimientoCaja[]
}) {
  const [showMovForm, setShowMovForm] = useState(false)
  const [showCierre, setShowCierre] = useState(false)

  const totalIngresos = movimientos
    .filter(m => m.tipo === 'ingreso')
    .reduce((acc, m) => acc + m.monto, 0)

  const totalEgresos = movimientos
    .filter(m => m.tipo === 'egreso')
    .reduce((acc, m) => acc + m.monto, 0)

  const saldoEstimado = caja.monto_inicial + totalIngresos - totalEgresos

  return (
    <div className="max-w-2xl mx-auto space-y-4 py-6 px-4">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-green-700">Caja Abierta</span>
            </div>
            <p className="text-xs text-gray-500">Desde {formatDateTime(caja.fecha_apertura)}</p>
          </div>
          <button
            onClick={() => setShowCierre(true)}
            className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition"
          >
            Cerrar Caja
          </button>
        </div>

        {/* Resumen de saldos */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Monto inicial</p>
            <p className="font-mono font-semibold">{fmtMoney(caja.monto_inicial)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Movimientos</p>
            <p className="font-mono font-semibold">
              <span className="text-green-600">+{fmtMoney(totalIngresos)}</span>
              {' / '}
              <span className="text-red-600">-{fmtMoney(totalEgresos)}</span>
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xs text-blue-600 mb-1">Saldo estimado</p>
            <p className="font-mono font-semibold text-blue-700">{fmtMoney(saldoEstimado)}</p>
          </div>
        </div>
      </div>

      {/* Movimientos */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-medium text-sm">Movimientos del turno</h3>
          <button
            onClick={() => setShowMovForm(true)}
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition"
          >
            + Registrar
          </button>
        </div>

        {showMovForm && (
          <div className="p-4 border-b bg-gray-50">
            <MovimientoForm cajaId={caja.id} onClose={() => setShowMovForm(false)} />
          </div>
        )}

        {movimientos.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">
            Sin movimientos registrados aún.
          </p>
        ) : (
          <ul className="divide-y">
            {movimientos.map(m => (
              <li key={m.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{m.concepto}</p>
                  <p className="text-xs text-gray-400 capitalize">
                    {m.metodo_pago} · {formatDateTime(m.created_at)}
                  </p>
                </div>
                <span className={`font-mono text-sm font-semibold ${
                  m.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {m.tipo === 'ingreso' ? '+' : '-'}{fmtMoney(m.monto)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showCierre && (
        <CierreModal cajaId={caja.id} onClose={() => setShowCierre(false)} />
      )}
    </div>
  )
}
