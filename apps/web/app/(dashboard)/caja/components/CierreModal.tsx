'use client'

import { useState, useTransition, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cerrarCajaSchema } from '@marketpos/core'
import { cerrarCaja, getResumen, type ResumenCaja } from '../actions'
import { useRouter } from 'next/navigation'

type FormInput = z.input<typeof cerrarCajaSchema>

function fmtMoney(val: string) {
  return `S/. ${parseFloat(val).toFixed(2)}`
}

function DiferenciaTag({ diferencia }: { diferencia: string }) {
  const val = parseFloat(diferencia)
  if (val === 0) return <span className="text-green-600 font-medium">Cuadra exacto ✓</span>
  if (val > 0) return <span className="text-blue-600 font-medium">Sobrante: {fmtMoney(diferencia)}</span>
  return <span className="text-red-600 font-medium">Faltante: {fmtMoney(Math.abs(val).toString())}</span>
}

export function CierreModal({ cajaId, onClose }: { cajaId: string; onClose: () => void }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [resumen, setResumen] = useState<ResumenCaja | null>(null)
  const [isPending, startTransition] = useTransition()

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormInput>({
    resolver: zodResolver(cerrarCajaSchema),
    defaultValues: { monto_final: '0', notas: '' },
  })

  const montoFinalWatch = watch('monto_final')

  // Recalcular resumen cuando cambia el monto_final
  useEffect(() => {
    const val = montoFinalWatch?.toString() ?? '0'
    if (!val || isNaN(parseFloat(val))) return

    getResumen(cajaId, val).then(({ data }) => {
      if (data) setResumen(data)
    })
  }, [cajaId, montoFinalWatch])

  const onSubmit = (data: FormInput) => {
    setError(null)
    startTransition(async () => {
      const res = await cerrarCaja(cajaId, data as any)
      if (res.error) {
        setError(res.error)
      } else {
        router.refresh()
        onClose()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Cerrar Caja</h2>
          <p className="text-sm text-gray-500">Realiza el arqueo antes de cerrar el turno.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="p-6 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
            )}

            {/* Resumen */}
            {resumen && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Monto inicial</span>
                  <span className="font-mono">{fmtMoney(resumen.monto_inicial)}</span>
                </div>
                <div className="flex justify-between text-green-700">
                  <span>+ Total ingresos</span>
                  <span className="font-mono">{fmtMoney(resumen.total_ingresos)}</span>
                </div>
                <div className="flex justify-between text-red-700">
                  <span>- Total egresos</span>
                  <span className="font-mono">{fmtMoney(resumen.total_egresos)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Saldo esperado</span>
                  <span className="font-mono">{fmtMoney(resumen.saldo_esperado)}</span>
                </div>
                {resumen.por_metodo.length > 0 && (
                  <div className="border-t pt-2 space-y-1">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Por método</p>
                    {resumen.por_metodo.map(m => (
                      <div key={m.metodo} className="flex justify-between capitalize text-xs">
                        <span>{m.metodo}</span>
                        <span>
                          {parseFloat(m.ingresos) > 0 && <span className="text-green-600">+{fmtMoney(m.ingresos)} </span>}
                          {parseFloat(m.egresos) > 0 && <span className="text-red-600">-{fmtMoney(m.egresos)}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {resumen.diferencia !== null && (
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600">Diferencia</span>
                    <DiferenciaTag diferencia={resumen.diferencia} />
                  </div>
                )}
              </div>
            )}

            {/* Arqueo */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Monto real en caja (S/.) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register('monto_final')}
                className="w-full rounded-lg border px-3 py-2 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
              {errors.monto_final && (
                <p className="text-red-500 text-xs mt-1">{errors.monto_final.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notas de cierre (opcional)</label>
              <textarea
                {...register('notas')}
                rows={2}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Observaciones del turno..."
              />
            </div>
          </div>

          <div className="p-6 border-t flex gap-3">
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
              className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {isPending ? 'Cerrando...' : 'Confirmar Cierre'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
