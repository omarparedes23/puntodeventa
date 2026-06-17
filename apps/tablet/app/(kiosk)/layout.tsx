import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SessionHydrator from './SessionHydrator'
import { OfflineSyncProvider } from '@/components/shared/OfflineSyncProvider'
import { AbrirCajaScreen } from './caja/components/AbrirCajaScreen'
import { TabBar } from '@/components/shared/TabBar'

export default async function KioskLayout({
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
    .select('*')
    .eq('usuario_id', user.id)
    .eq('empresa_id', perfil.empresa_id)
    .eq('estado', 'abierta')
    .maybeSingle()

  if (!cajaAbierta) {
    return (
      <SessionHydrator perfil={perfil} empresa={empresa} cajaActivaId={null}>
        <OfflineSyncProvider empresaId={perfil.empresa_id} />
        <AbrirCajaScreen />
      </SessionHydrator>
    )
  }

  return (
    <SessionHydrator perfil={perfil} empresa={empresa} cajaActivaId={cajaAbierta.id}>
      <OfflineSyncProvider empresaId={perfil.empresa_id} />
      <div className="flex flex-col min-h-screen bg-background">
        <main className="flex-1 overflow-hidden pb-[72px]">
          {children}
        </main>
        <TabBar />
      </div>
    </SessionHydrator>
  )
}
