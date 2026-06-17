import { createClient } from '@/lib/supabase/server'
import { ProductosClient } from './components/productos-client'

export const metadata = {
  title: 'Productos | Inventario',
}

export default async function ProductosPage() {
  const supabase = await createClient()
  
  const [productosRes, categoriasRes, unidadesRes] = await Promise.all([
    supabase.from('ptovta_productos').select('*').order('nombre'),
    supabase.from('ptovta_categorias').select('*').order('nombre'),
    supabase.from('ptovta_unidades_medida').select('*').order('nombre')
  ])
    
  if (productosRes.error) {
    console.error('Error fetching productos:', productosRes.error)
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Productos</h2>
      </div>
      <ProductosClient 
        data={productosRes.data || []} 
        categorias={categoriasRes.data || []}
        unidades={unidadesRes.data || []}
      />
    </div>
  )
}
