'use client'

import { useState, useTransition } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getReporteCaja, type PagoMetodo, type PeriodoFiltro } from '../actions'

const PERIODOS: { label: string; value: PeriodoFiltro }[] = [
  { label: 'Hoy', value: 'hoy' },
  { label: 'Semana', value: 'semana' },
  { label: 'Mes', value: 'mes' },
  { label: 'Año', value: 'anio' },
]

const COLORES: Record<string, string> = {
  efectivo: '#16a34a',
  yape: '#7c3aed',
  tarjeta: '#2563eb',
  transferencia: '#0891b2',
  credito: '#dc2626',
}

const COLOR_DEFAULT = '#6b7280'

function fmtMoney(n: number) {
  return `S/. ${n.toFixed(2)}`
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function ReporteCaja({ inicial }: { inicial: PagoMetodo[] }) {
  const [datos, setDatos] = useState(inicial)
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('mes')
  const [pending, startTransition] = useTransition()

  function cambiarPeriodo(p: PeriodoFiltro) {
    setPeriodo(p)
    startTransition(async () => {
      const { data } = await getReporteCaja(p)
      if (data) setDatos(data)
    })
  }

  const totalGeneral = datos.reduce((s, d) => s + d.total, 0)

  const pieData = datos.map((d) => ({
    name: capitalize(d.metodo),
    value: d.total,
    metodo: d.metodo,
  }))

  return (
    <div className="bg-white rounded-xl border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">Caja por método de pago</h2>
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

      {datos.length > 0 ? (
        <div className="flex gap-4 items-center">
          <ResponsiveContainer width="50%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={COLORES[entry.metodo] ?? COLOR_DEFAULT}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(v) => fmtMoney(Number(v ?? 0))} />
            </PieChart>
          </ResponsiveContainer>

          <div className="flex-1 space-y-2">
            {datos.map((d) => (
              <div key={d.metodo} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLORES[d.metodo] ?? COLOR_DEFAULT }}
                  />
                  <span className="text-sm font-medium">{capitalize(d.metodo)}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-semibold">{fmtMoney(d.total)}</p>
                  <p className="text-xs text-gray-400">
                    {totalGeneral > 0 ? Math.round((d.total / totalGeneral) * 100) : 0}%
                  </p>
                </div>
              </div>
            ))}
            <div className="border-t pt-2 flex justify-between">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-sm font-mono font-bold text-blue-700">{fmtMoney(totalGeneral)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
          Sin pagos en este período
        </div>
      )}
    </div>
  )
}
