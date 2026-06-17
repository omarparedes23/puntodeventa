import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { KioskPosClient } from './components/KioskPosClient'

export default async function PosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: caja } = await supabase
    .from('ptovta_cajas')
    .select('id')
    .eq('usuario_id', user.id)
    .eq('estado', 'abierta')
    .maybeSingle()

  if (!caja) redirect('/caja')

  return <KioskPosClient cajaId={caja.id} />
}
