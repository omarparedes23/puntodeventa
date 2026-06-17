import Link from 'next/link'
import { getCompras } from './actions'

export const dynamic = 'force-dynamic'
import { ComprasList } from './components/ComprasList'

export default async function ComprasPage() {
  const { data: compras, error } = await getCompras()

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Compras</h1>
        <Link
          href="/compras/nueva"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          + Nueva compra
        </Link>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      <ComprasList compras={compras ?? []} />
    </div>
  )
}
