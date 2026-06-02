import { getClientes } from '@/app/(dashboard)/clientes/actions'
import { ClientesContainer } from '@/components/clientes/ClientesContainer'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Clientes | MarketPos',
  description: 'Gestión de clientes del sistema',
}

export default async function ClientesPage() {
  const { data: initialClientes } = await getClientes()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Clientes</h1>
      <ClientesContainer initialClientes={initialClientes || []} />
    </div>
  )
}
