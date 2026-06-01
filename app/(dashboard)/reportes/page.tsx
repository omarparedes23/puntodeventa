import { getReporteVentas, getReporteProductos, getReporteCaja } from './actions'
import { ReporteVentas } from './components/ReporteVentas'
import { ReporteProductos } from './components/ReporteProductos'
import { ReporteCaja } from './components/ReporteCaja'

export default async function ReportesPage() {
  const [ventas, productos, caja] = await Promise.all([
    getReporteVentas('mes'),
    getReporteProductos('mes'),
    getReporteCaja('mes'),
  ])

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-5">
      <h1 className="text-lg font-semibold">Reportes</h1>

      <ReporteVentas inicial={ventas.data ?? { total_periodo: 0, cantidad_ventas: 0, ticket_promedio: 0, por_dia: [] }} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ReporteProductos inicial={productos.data ?? []} />
        <ReporteCaja inicial={caja.data ?? []} />
      </div>
    </div>
  )
}
