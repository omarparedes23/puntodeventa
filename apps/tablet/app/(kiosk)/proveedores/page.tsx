import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProveedoresScreen } from './components/ProveedoresScreen'
import type { Proveedor } from '@marketpos/core'

export default async function ProveedoresPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('ptovta_perfiles')
    .select('empresa_id')
    .eq('id', user.id)
    .single()

  if (!perfil?.empresa_id) redirect('/onboarding')

  const { data: proveedores } = await supabase
    .from('ptovta_proveedores')
    .select('*')
    .eq('empresa_id', perfil.empresa_id)
    .order('nombre')

  return <ProveedoresScreen initialProveedores={(proveedores ?? []) as Proveedor[]} />
}
