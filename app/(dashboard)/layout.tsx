import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SessionHydrator from './SessionHydrator'
import { Sidebar } from '@/components/shared/Sidebar'
import { OfflineSyncProvider } from '@/components/shared/OfflineSyncProvider'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('ptovta_perfiles')
    .select('id, nombre, rol, activo, empresa_id, created_at, updated_at')
    .eq('id', user.id)
    .single()

  if (!perfil?.empresa_id) redirect('/onboarding')

  const { data: empresa } = await supabase
    .from('ptovta_empresas')
    .select('*')
    .eq('id', perfil.empresa_id)
    .single()

  if (!empresa) redirect('/onboarding')

  const { data: cajaAbierta } = await supabase
    .from('ptovta_cajas')
    .select('id')
    .eq('usuario_id', user.id)
    .eq('empresa_id', perfil.empresa_id)
    .eq('estado', 'abierta')
    .maybeSingle()

  return (
    <SessionHydrator perfil={perfil} empresa={empresa} cajaActivaId={cajaAbierta?.id ?? null}>
      <OfflineSyncProvider empresaId={perfil.empresa_id} />
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </SessionHydrator>
  )
}
