import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ClientesScreen } from './components/ClientesScreen'
import type { Cliente } from '@marketpos/core'

export default async function ClientesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('ptovta_perfiles')
    .select('empresa_id')
    .eq('id', user.id)
    .single()

  if (!perfil?.empresa_id) redirect('/onboarding')

  const { data: clientes } = await supabase
    .from('ptovta_clientes')
    .select('*')
    .eq('empresa_id', perfil.empresa_id)
    .order('nombre')
    .limit(100)

  return <ClientesScreen initialClientes={(clientes ?? []) as Cliente[]} />
}
