import { createClient } from '@/lib/supabase/server'
import { CategoriasClient } from './components/categorias-client'

export const metadata = {
  title: 'Categorías | Inventario',
}

export default async function CategoriasPage() {
  const supabase = await createClient()
  
  const { data: categorias, error } = await supabase
    .from('ptovta_categorias')
    .select('*')
    .order('nombre')
    
  if (error) {
    console.error('Error fetching categorias:', error)
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Categorías</h2>
      </div>
      <CategoriasClient data={categorias || []} />
    </div>
  )
}
