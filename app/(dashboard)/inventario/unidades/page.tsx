import { createClient } from '@/lib/supabase/server'
import { UnidadesClient } from './components/unidades-client'

export const metadata = {
  title: 'Unidades de Medida | Inventario',
}

export default async function UnidadesPage() {
  const supabase = await createClient()
  
  const { data: unidades, error } = await supabase
    .from('ptovta_unidades_medida')
    .select('*')
    .order('nombre')
    
  if (error) {
    console.error('Error fetching unidades de medida:', error)
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Unidades de Medida</h2>
      </div>
      <UnidadesClient data={unidades || []} />
    </div>
  )
}
