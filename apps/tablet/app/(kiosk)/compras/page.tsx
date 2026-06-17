import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCompras } from './actions'
import { ComprasScreen } from './components/ComprasScreen'

export default async function ComprasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const res = await getCompras()

  return <ComprasScreen initialCompras={res.data ?? []} />
}
