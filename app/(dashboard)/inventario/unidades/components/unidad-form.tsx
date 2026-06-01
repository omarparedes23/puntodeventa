'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { unidadMedidaSchema, type UnidadMedidaFormData } from '@/lib/validations/inventario'
import { Button } from '@/components/ui/button'
import { z } from 'zod'
import { createUnidadMedida, updateUnidadMedida } from '../../actions'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { UnidadMedida } from '@/types/database'

interface UnidadFormProps {
  initialData?: UnidadMedida | null
  onClose: () => void
}

export function UnidadForm({ initialData, onClose }: UnidadFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  type FormInput = z.input<typeof unidadMedidaSchema>

  const { register, handleSubmit, formState: { errors } } = useForm<FormInput>({
    resolver: zodResolver(unidadMedidaSchema),
    defaultValues: {
      nombre: initialData?.nombre || '',
      simbolo: initialData?.simbolo || '',
      permite_decimal: initialData?.permite_decimal ?? false,
    }
  })

  const onSubmit = async (data: FormInput) => {
    setIsPending(true)
    setError(null)
    try {
      const payload = {
        ...data,
        permite_decimal: data.permite_decimal ?? false
      }
      
      const result = initialData 
        ? await updateUnidadMedida(initialData.id, payload)
        : await createUnidadMedida(payload)

      if (result.error) {
        setError(result.error)
      } else {
        router.refresh()
        onClose()
      }
    } catch (err: any) {
      setError(err.message || 'Error inesperado')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Nombre</label>
        <input 
          {...register('nombre')}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ej: Kilogramo"
        />
        {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Símbolo</label>
        <input 
          {...register('simbolo')}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ej: KG"
        />
        {errors.simbolo && <p className="text-red-500 text-xs mt-1">{errors.simbolo.message}</p>}
      </div>

      <div className="flex items-center space-x-2">
        <input 
          type="checkbox" 
          id="permite_decimal"
          {...register('permite_decimal')}
          className="rounded border-gray-300"
        />
        <label htmlFor="permite_decimal" className="text-sm font-medium">Permite fracciones/decimales</label>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </form>
  )
}
