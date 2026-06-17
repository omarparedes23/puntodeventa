'use client'

import { useState } from 'react'
import { vincularEmpresa, type EmpresaOpcion } from './actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface OnboardingClientProps {
  empresas: EmpresaOpcion[]
}

export function OnboardingClient({ empresas }: OnboardingClientProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (empresas.length === 0) {
    return (
      <div className="text-center space-y-2">
        <h2 className="text-lg font-semibold">Sin empresas disponibles</h2>
        <p className="text-muted-foreground text-sm">
          Contacta al administrador para ser agregado a una empresa.
        </p>
      </div>
    )
  }

  async function handleSelect(empresaId: string) {
    setError(null)
    setLoading(empresaId)
    const result = await vincularEmpresa(empresaId)
    if (result?.error) {
      setError(result.error)
      setLoading(null)
    }
    // On success, vincularEmpresa redirects to /pos via next/navigation redirect
  }

  return (
    <div className="grid gap-4">
      {empresas.map((empresa) => (
        <button
          key={empresa.id}
          className="w-full text-left disabled:opacity-50"
          disabled={loading !== null}
          onClick={() => handleSelect(empresa.id)}
        >
          <Card className="hover:border-primary transition-colors cursor-pointer active:scale-[0.99] touch-manipulation">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                {empresa.nombre_comercial ?? empresa.razon_social}
              </CardTitle>
              <CardDescription>
                RUC: {empresa.ruc}
                {empresa.nombre_comercial && (
                  <span className="ml-2 text-xs opacity-70">{empresa.razon_social}</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-xs text-muted-foreground">
                {loading === empresa.id ? 'Vinculando...' : 'Toca para seleccionar'}
              </span>
            </CardContent>
          </Card>
        </button>
      ))}
      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
    </div>
  )
}
