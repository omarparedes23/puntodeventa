'use client'

import { useState, useTransition } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { getReporteVentas, type ResumenVentas, type PeriodoFiltro } from '../actions'

const PERIODOS: { label: string; value: PeriodoFiltro }[] = [
  { label: 'Hoy', value: 'hoy' },
  { label: 'Semana', value: 'semana' },
  { label: 'Mes', value: 'mes' },
  { label: 'Año', value: 'anio' },
]

function fmtMoney(n: number) {
  return `S/. ${n.toFixed(2)}`
}

function fmtFecha(iso: string) {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

export function ReporteVentas({ inicial }: { inicial: ResumenVentas }) {
  const [datos, setDatos] = useState(inicial)
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('mes')
  const [pending, startTransition] = useTransition()

  function cambiarPeriodo(p: PeriodoFiltro) {
    setPeriodo(p)
    startTransition(async () => {
      const { data } = await getReporteVentas(p)
      if (data) setDatos(data)
    })
  }

  return (
    <div className="bg-white rounded-xl border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">Ventas</h2>
        <div className="flex gap-1">
          {PERIODOS.map((p) => (
            <button
              key={p.value}
              onClick={() => cambiarPeriodo(p.value)}
              disabled={pending}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                periodo === p.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs text-blue-600 font-medium">Total</p>
          <p className="text-lg font-bold text-blue-700 font-mono">{fmtMoney(datos.total_periodo)}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <p className="text-xs text-green-600 font-medium">Ventas</p>
          <p className="text-lg font-bold text-green-700 font-mono">{datos.cantidad_ventas}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-3">
          <p className="text-xs text-purple-600 font-medium">Ticket promedio</p>
          <p className="text-lg font-bold text-purple-700 font-mono">{fmtMoney(datos.ticket_promedio)}</p>
        </div>
      </div>

      {/* Gráfico */}
      {datos.por_dia.length > 0 ? (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={datos.por_dia} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="fecha"
              tickFormatter={fmtFecha}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              tickFormatter={(v) => `S/.${v}`}
              tick={{ fontSize: 11 }}
              width={60}
            />
            <Tooltip
              formatter={(v) => [fmtMoney(Number(v ?? 0)), 'Total']}
              labelFormatter={(l) => `Fecha: ${l}`}
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
          Sin ventas en este período
        </div>
      )}
    </div>
  )
}
