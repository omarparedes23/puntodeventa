import { getComprobantes } from './actions'

export const dynamic = 'force-dynamic'
import { ComprobantesLista } from './components/ComprobantesLista'

export default async function ComprobantesPage() {
  const { data: comprobantes } = await getComprobantes()
  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-5">
      <h1 className="text-lg font-semibold">Comprobantes</h1>
      <ComprobantesLista comprobantes={comprobantes ?? []} />
    </div>
  )
}
