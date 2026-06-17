'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { ComprobanteResumen, FiltrosComprobante } from '../actions'

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function fmtMoney(n: number) { return `S/. ${n.toFixed(2)}` }

const ESTADO_BADGE: Record<string, { cls: string; label: string }> = {
  emitida:    { cls: 'bg-green-100 text-green-700',  label: 'Emitida' },
  pendiente:  { cls: 'bg-yellow-100 text-yellow-700', label: 'Pendiente' },
  error_sunat:{ cls: 'bg-red-100 text-red-700',      label: 'Error SUNAT' },
  anulada:    { cls: 'bg-gray-100 text-gray-500',    label: 'Anulada' },
}

const TIPO_BADGE: Record<string, string> = {
  boleta:       'bg-blue-50 text-blue-600',
  factura:      'bg-purple-50 text-purple-600',
  ticket:       'bg-gray-50 text-gray-600',
  nota_credito: 'bg-orange-50 text-orange-600',
  nota_debito:  'bg-red-50 text-red-600',
}

const TIPO_LABEL: Record<string, string> = {
  boleta:       'Boleta',
  factura:      'Factura',
  ticket:       'Ticket',
  nota_credito: 'Nota de Crédito',
  nota_debito:  'Nota de Débito',
}

export function ComprobantesLista({ comprobantes }: { comprobantes: ComprobanteResumen[] }) {
  const [tipo, setTipo] = useState<string>('todos')
  const [estado, setEstado] = useState<string>('todos')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const filtered = comprobantes.filter((c) => {
    if (tipo !== 'todos' && c.tipo_comprobante !== tipo) return false
    if (estado !== 'todos' && c.estado !== estado) return false
    if (desde && c.fecha_emision < desde) return false
    if (hasta && c.fecha_emision > hasta) return false
    return true
  })

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos</option>
            <option value="boleta">Boletas</option>
            <option value="factura">Facturas</option>
            <option value="ticket">Tickets</option>
            <option value="nota_credito">Notas de Crédito</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Estado</label>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos</option>
            <option value="emitida">Emitida</option>
            <option value="pendiente">Pendiente</option>
            <option value="error_sunat">Error SUNAT</option>
            <option value="anulada">Anulada</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Desde</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hasta</label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {(tipo !== 'todos' || estado !== 'todos' || desde || hasta) && (
          <button
            onClick={() => { setTipo('todos'); setEstado('todos'); setDesde(''); setHasta('') }}
            className="text-xs text-gray-400 hover:text-gray-600 underline self-end pb-2"
          >
            Limpiar filtros
          </button>
        )}
        <div className="ml-auto self-end pb-1">
          <span className="text-xs text-gray-400">{filtered.length} comprobante{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-400 text-sm">
          No hay comprobantes con los filtros seleccionados.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">N° Comprobante</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Cliente</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Total</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((c) => {
                const badge = ESTADO_BADGE[c.estado] ?? ESTADO_BADGE.pendiente
                return (
                  <tr key={c.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-mono text-xs">
                      {c.numero_completo ?? <span className="text-gray-400 italic font-sans">Sin número</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${TIPO_BADGE[c.tipo_comprobante] ?? 'bg-gray-50 text-gray-600'}`}>
                        {TIPO_LABEL[c.tipo_comprobante] ?? c.tipo_comprobante}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{fmtDate(c.fecha_emision)}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">
                      {c.cliente_nombre ?? <span className="text-gray-400 italic">Consumidor final</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">{fmtMoney(c.total)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/comprobantes/${c.id}`}
                        className="text-blue-600 hover:text-blue-700 text-xs font-medium whitespace-nowrap">
                        Ver →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
