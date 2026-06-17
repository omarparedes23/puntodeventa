'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { nubefactConfigSchema, type NubefactConfigFormValues } from '@marketpos/core'
import { updateNubefact } from '../actions'
import type { EmpresaConfig } from '../actions'

export function NubefactForm({ empresa }: { empresa: EmpresaConfig }) {
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [showTokenInput, setShowTokenInput] = useState(!empresa.has_nubefact_token)

  const { register, handleSubmit, formState: { errors } } = useForm<NubefactConfigFormValues>({
    resolver: zodResolver(nubefactConfigSchema),
    defaultValues: {
      nubefact_modo: empresa.nubefact_modo,
      nubefact_token: '',
    },
  })

  function onSubmit(data: NubefactConfigFormValues) {
    setSuccess(false)
    setServerError(null)
    startTransition(async () => {
      const res = await updateNubefact(data)
      if (res.error) { setServerError(res.error); return }
      setSuccess(true)
      setShowTokenInput(false)
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border p-6 space-y-5">
      <div className="flex items-start justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Configuración Nubefact / SUNAT</h2>
        <a
          href="https://nubefact.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline"
        >
          nubefact.com ↗
        </a>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Modo de operación</label>
        <select {...register('nubefact_modo')}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="demo">Demo (pruebas — no emite comprobantes reales)</option>
          <option value="produccion">Producción (emite comprobantes ante SUNAT)</option>
        </select>
        {errors.nubefact_modo && <p className="text-xs text-red-500 mt-1">{errors.nubefact_modo.message}</p>}
      </div>

      <div className="space-y-2">
        <label className="block text-xs text-gray-500">Token de API</label>
        {empresa.has_nubefact_token && !showTokenInput ? (
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono text-gray-700 bg-gray-50 border rounded-lg px-3 py-2 flex-1">
              {empresa.nubefact_token_hint}
            </span>
            <button
              type="button"
              onClick={() => setShowTokenInput(true)}
              className="px-3 py-2 text-xs border rounded-lg hover:bg-gray-50 text-gray-600"
            >
              Cambiar
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            <input
              {...register('nubefact_token')}
              type="password"
              placeholder={empresa.has_nubefact_token ? 'Ingresa el nuevo token' : 'Token de API de Nubefact'}
              className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {empresa.has_nubefact_token && (
              <button
                type="button"
                onClick={() => setShowTokenInput(false)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Cancelar cambio
              </button>
            )}
            <p className="text-xs text-gray-400">
              Obtén tu token desde el panel de Nubefact → Configuración → Token de acceso.
            </p>
          </div>
        )}
      </div>

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
        <p className="font-semibold">Importante:</p>
        <p>En modo <strong>Producción</strong>, cada boleta y factura emitida tiene validez legal ante SUNAT. Asegúrate de tener el token correcto antes de cambiar el modo.</p>
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      {success && <p className="text-sm text-green-600">Configuración guardada correctamente.</p>}

      <div className="flex justify-end">
        <button type="submit" disabled={isPending}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50">
          {isPending ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </div>
    </form>
  )
}
