import { notFound } from 'next/navigation'
import { getCompra } from '../actions'

export const dynamic = 'force-dynamic'
import { CompraDetalle } from '../components/CompraDetalle'

export default async function CompraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: compra, error } = await getCompra(id)

  if (error || !compra) notFound()

  return <CompraDetalle compra={compra} />
}
