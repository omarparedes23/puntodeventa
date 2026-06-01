'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { categoriaSchema, type CategoriaFormData } from '@/lib/validations/inventario'
import { Button } from '@/components/ui/button'
import { z } from 'zod'
import { createCategoria, updateCategoria } from '../../actions'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Categoria } from '@/types/database'

interface CategoriaFormProps {
  initialData?: Categoria | null
  allCategories: Categoria[]
  onClose: () => void
}

export function CategoriaForm({ initialData, allCategories, onClose }: CategoriaFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  type FormInput = z.input<typeof categoriaSchema>

  const { register, handleSubmit, formState: { errors } } = useForm<FormInput>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: {
      nombre: initialData?.nombre || '',
      parent_id: initialData?.parent_id || undefined,
      activo: initialData?.activo ?? true,
    }
  })

  const onSubmit = async (data: FormInput) => {
    setIsPending(true)
    setError(null)
    try {
      // Convert empty string to null for parent_id if user selects "None"
      const payload = {
        ...data,
        parent_id: data.parent_id === '' ? null : data.parent_id,
        activo: data.activo ?? true
      }
      
      const result = initialData 
        ? await updateCategoria(initialData.id, payload)
        : await createCategoria(payload)

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
          placeholder="Nombre de la categoría"
        />
        {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Categoría Padre (Opcional)</label>
        <select 
          {...register('parent_id')}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Ninguna</option>
          {allCategories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.nombre}</option>
          ))}
        </select>
        {errors.parent_id && <p className="text-red-500 text-xs mt-1">{errors.parent_id.message}</p>}
      </div>

      <div className="flex items-center space-x-2">
        <input 
          type="checkbox" 
          id="activo"
          {...register('activo')}
          className="rounded border-gray-300"
        />
        <label htmlFor="activo" className="text-sm font-medium">Activo</label>
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
