'use client'

import { useState, useTransition } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { getReporteProductos, type ProductoVendido, type PeriodoFiltro } from '../actions'

const PERIODOS: { label: string; value: PeriodoFiltro }[] = [
  { label: 'Hoy', value: 'hoy' },
  { label: 'Semana', value: 'semana' },
  { label: 'Mes', value: 'mes' },
  { label: 'Año', value: 'anio' },
]

const COLORES = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe',
                 '#1d4ed8', '#1e40af', '#1e3a8a', '#172554', '#dbeafe']

function fmtMoney(n: number) {
  return `S/. ${n.toFixed(2)}`
}

export function ReporteProductos({ inicial }: { inicial: ProductoVendido[] }) {
  const [datos, setDatos] = useState(inicial)
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('mes')
  const [pending, startTransition] = useTransition()

  function cambiarPeriodo(p: PeriodoFiltro) {
    setPeriodo(p)
    startTransition(async () => {
      const { data } = await getReporteProductos(p)
      if (data) setDatos(data)
    })
  }

  return (
    <div className="bg-white rounded-xl border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">Productos más vendidos</h2>
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
        <>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={datos} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis
                type="number"
                tickFormatter={(v) => `S/.${v}`}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="nombre"
                tick={{ fontSize: 11 }}
                width={76}
              />
              <Tooltip
                formatter={(v: number) => [fmtMoney(v), 'Vendido']}
              />
              <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                {datos.map((_, i) => (
                  <Cell key={i} fill={COLORES[i % COLORES.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Tabla */}
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b">
                <th className="text-left py-1">#</th>
                <th className="text-left py-1">Producto</th>
                <th className="text-right py-1">Cantidad</th>
                <th className="text-right py-1">Total</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((p, i) => (
                <tr key={p.nombre} className="border-b last:border-0">
                  <td className="py-1.5 text-gray-400 text-xs">{i + 1}</td>
                  <td className="py-1.5 font-medium">{p.nombre}</td>
                  <td className="py-1.5 text-right font-mono text-gray-600">{p.cantidad}</td>
                  <td className="py-1.5 text-right font-mono font-semibold text-blue-700">{fmtMoney(p.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
          Sin ventas en este período
        </div>
      )}
    </div>
  )
}
