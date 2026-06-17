import { redirect } from 'next/navigation'
import { getEmpresa, getUsuarios } from './actions'
import { ConfiguracionClient } from './components/ConfiguracionClient'

export default async function ConfiguracionPage() {
  const [{ data: empresa, error }, { data: usuarios }] = await Promise.all([
    getEmpresa(),
    getUsuarios(),
  ])

  if (error) redirect('/pos')

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <h1 className="text-lg font-semibold mb-6">Configuración</h1>
      <ConfiguracionClient empresa={empresa!} usuarios={usuarios ?? []} />
    </div>
  )
}
