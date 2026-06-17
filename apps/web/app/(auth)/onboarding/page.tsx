import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEmpresas } from './actions'
import { OnboardingClient } from './OnboardingClient'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: empresas } = await getEmpresas()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">MarketPos</h1>
          <p className="text-sm text-gray-500 mt-1">Selecciona tu empresa para continuar</p>
        </div>
        <OnboardingClient empresas={empresas ?? []} />
      </div>
    </div>
  )
}
