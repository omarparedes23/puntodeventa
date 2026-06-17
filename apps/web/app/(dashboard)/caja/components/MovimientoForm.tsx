'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { movimientoSchema } from '@marketpos/core'
import { registrarMovimiento } from '../actions'
import { useRouter } from 'next/navigation'

type FormInput = z.input<typeof movimientoSchema>

const METODOS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'yape', label: 'Yape' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'credito', label: 'Crédito' },
]

export function MovimientoForm({ cajaId, onClose }: { cajaId: string; onClose: () => void }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormInput>({
    resolver: zodResolver(movimientoSchema),
    defaultValues: { tipo: 'ingreso', concepto: '', monto: '', metodo_pago: 'efectivo' },
  })

  const tipo = watch('tipo')

  const onSubmit = (data: FormInput) => {
    setError(null)
    startTransition(async () => {
      const res = await registrarMovimiento(cajaId, data as any)
      if (res.error) {
        setError(res.error)
      } else {
        router.refresh()
        onClose()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Tipo</label>
        <div className="grid grid-cols-2 gap-2">
          <label className={`flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition
            ${tipo === 'ingreso' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200'}`}>
            <input type="radio" value="ingreso" {...register('tipo')} className="sr-only" />
            + Ingreso
          </label>
          <label className={`flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition
            ${tipo === 'egreso' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200'}`}>
            <input type="radio" value="egreso" {...register('tipo')} className="sr-only" />
            - Egreso
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Concepto</label>
        <input
          {...register('concepto')}
          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Descripción del movimiento..."
        />
        {errors.concepto && <p className="text-red-500 text-xs mt-1">{errors.concepto.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Monto (S/.)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            {...register('monto')}
            className="w-full rounded-lg border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
          />
          {errors.monto && <p className="text-red-500 text-xs mt-1">{errors.monto.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Método de pago</label>
          <select
            {...register('metodo_pago')}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {METODOS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="flex-1 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className={`flex-1 py-2 rounded-lg text-sm text-white font-medium disabled:opacity-50
            ${tipo === 'egreso' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
        >
          {isPending ? 'Guardando...' : 'Registrar'}
        </button>
      </div>
    </form>
  )
}
