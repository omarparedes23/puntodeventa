'use client'

import Link from 'next/link'
import type { CompraConProveedor } from '../actions'

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

export function ComprasList({ compras }: { compras: CompraConProveedor[] }) {
  if (compras.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-12 text-center text-gray-400 text-sm">
        No hay compras registradas aún.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Fecha</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Proveedor</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Documento</th>
            <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Productos</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Total</th>
            <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Estado pago</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {compras.map((compra) => (
            <tr key={compra.id} className="hover:bg-gray-50 transition">
              <td className="px-4 py-3 text-gray-700">
                {fmtDate(compra.fecha_compra)}
              </td>
              <td className="px-4 py-3">
                {compra.proveedor?.nombre ?? (
                  <span className="text-gray-400 italic">Sin proveedor</span>
                )}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-gray-500">
                {compra.nro_documento ?? '—'}
              </td>
              <td className="px-4 py-3 text-center text-gray-500">
                {compra.items_count}
              </td>
              <td className="px-4 py-3 text-right font-mono font-semibold">
                {fmtMoney(compra.total)}
              </td>
              <td className="px-4 py-3 text-center">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${ESTADO_BADGE[compra.estado_pago]}`}>
                  {compra.estado_pago}
                </span>
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/compras/${compra.id}`}
                  className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                >
                  Ver →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
