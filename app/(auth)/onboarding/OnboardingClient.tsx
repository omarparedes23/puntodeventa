'use client'

import { useState, useTransition } from 'react'
import { vincularEmpresa, type EmpresaOpcion } from './actions'

export function OnboardingClient({ empresas }: { empresas: EmpresaOpcion[] }) {
  const [selected, setSelected] = useState<string | null>(
    empresas.length === 1 ? empresas[0].id : null
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (!selected) return
    setError(null)
    startTransition(async () => {
      const res = await vincularEmpresa(selected)
      if (res?.error) setError(res.error)
    })
  }

  if (empresas.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-6 text-center space-y-3">
        <p className="text-sm text-gray-500">No hay empresas registradas en el sistema.</p>
        <p className="text-xs text-gray-400">Contacta al administrador para que agregue tu empresa.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
      <div className="space-y-2">
        {empresas.map((empresa) => (
          <button
            key={empresa.id}
            type="button"
            onClick={() => setSelected(empresa.id)}
            className={`w-full text-left px-4 py-3 rounded-xl border-2 transition ${
              selected === empresa.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <p className="text-sm font-semibold text-gray-900">
              {empresa.nombre_comercial ?? empresa.razon_social}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {empresa.razon_social} — RUC {empresa.ruc}
            </p>
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!selected || isPending}
        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition"
      >
        {isPending ? 'Entrando...' : 'Ingresar'}
      </button>
    </div>
  )
}
