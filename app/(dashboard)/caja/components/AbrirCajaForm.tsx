'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { abrirCajaSchema } from '@/lib/validations/caja'
import { abrirCaja } from '../actions'
import { useRouter } from 'next/navigation'

type FormInput = z.input<typeof abrirCajaSchema>

export function AbrirCajaForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const { register, handleSubmit, formState: { errors } } = useForm<FormInput>({
    resolver: zodResolver(abrirCajaSchema),
    defaultValues: { monto_inicial: '0', notas: '' },
  })

  const onSubmit = (data: FormInput) => {
    setError(null)
    startTransition(async () => {
      const res = await abrirCaja(data as any)
      if (res.error) {
        setError(res.error)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="max-w-md mx-auto mt-16">
      <div className="bg-white rounded-xl shadow-sm border p-8">
        <h2 className="text-xl font-semibold mb-1">Abrir Caja</h2>
        <p className="text-sm text-gray-500 mb-6">
          Ingresa el monto en efectivo con el que inicias el turno.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Monto inicial en efectivo (S/.)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register('monto_inicial')}
              className="w-full rounded-lg border px-3 py-2 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
            {errors.monto_inicial && (
              <p className="text-red-500 text-xs mt-1">{errors.monto_inicial.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Notas (opcional)
            </label>
            <textarea
              {...register('notas')}
              rows={2}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Observaciones al inicio del turno..."
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition disabled:opacity-50"
          >
            {isPending ? 'Abriendo caja...' : 'Abrir Caja'}
          </button>
        </form>
      </div>
    </div>
  )
}
