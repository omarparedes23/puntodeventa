import { notFound } from 'next/navigation'
import { getComprobante } from '../actions'

export const dynamic = 'force-dynamic'
import { ComprobanteDetalle } from '../components/ComprobanteDetalle'

export default async function ComprobantePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: comprobante, error } = await getComprobante(id)
  if (error || !comprobante) notFound()
  return <ComprobanteDetalle comprobante={comprobante} />
}
