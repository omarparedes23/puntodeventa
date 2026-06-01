import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PosClient } from './components/PosClient'

export default async function PosPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('ptovta_perfiles')
    .select('empresa_id, rol')
    .eq('id', user.id)
    .single()

  if (!perfil?.empresa_id) redirect('/onboarding')

  // Verificar que hay caja abierta para este usuario
  const { data: caja } = await supabase
    .from('ptovta_cajas')
    .select('id')
    .eq('usuario_id', user.id)
    .eq('empresa_id', perfil.empresa_id)
    .eq('estado', 'abierta')
    .maybeSingle()

  if (!caja) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 text-center px-6">
        <div className="text-4xl">🔒</div>
        <h2 className="text-xl font-semibold">Caja cerrada</h2>
        <p className="text-sm text-gray-500 max-w-xs">
          Para registrar ventas necesitas abrir una caja primero.
        </p>
        <a
          href="/caja"
          className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-3 rounded-xl transition"
        >
          Ir a Caja
        </a>
      </div>
    )
  }

  return <PosClient />
}
