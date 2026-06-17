import { notFound } from 'next/navigation'
import { getVentaDetalle } from '../actions'
import { VentaDetalle } from './components/VentaDetalle'

export const dynamic = 'force-dynamic'

export default async function VentaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: venta, error } = await getVentaDetalle(id)

  if (error || !venta) notFound()

  return <VentaDetalle venta={venta} />
}
