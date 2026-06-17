import { getVentasHoy } from './actions'
import { VentasList } from './components/VentasList'

export const dynamic = 'force-dynamic'

export default async function VentasPage() {
  const { data: ventas, error } = await getVentasHoy()

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground p-8">
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  return <VentasList ventas={ventas ?? []} />
}
