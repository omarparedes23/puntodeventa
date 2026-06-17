import { getProveedores } from '@/app/actions/proveedores'
import { ProveedoresContainer } from '@/components/proveedores/ProveedoresContainer'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Proveedores | MarketPos',
  description: 'Gestión de proveedores',
}

export default async function ProveedoresPage() {
  const { data, error } = await getProveedores()

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
          <h2 className="text-lg font-bold mb-2">Error cargando proveedores</h2>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <ProveedoresContainer initialData={data || []} />
    </div>
  )
}
