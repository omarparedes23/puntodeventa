import { getEmpresas } from './actions'
import { OnboardingClient } from './OnboardingClient'

export default async function OnboardingPage() {
  const { data: empresas, error } = await getEmpresas()

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col">
      <div className="max-w-2xl mx-auto w-full space-y-8 flex-1">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Selecciona tu empresa</h1>
          <p className="text-muted-foreground">
            Elige la empresa a la que perteneces para continuar
          </p>
        </div>
        <OnboardingClient empresas={empresas ?? []} />
      </div>
    </div>
  )
}
