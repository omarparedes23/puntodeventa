'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productoSchema, type ProductoFormData } from '@marketpos/core'
import { Button } from '@/components/ui/button'
import { z } from 'zod'
import { createProducto, updateProducto } from '../../actions'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Producto, Categoria, UnidadMedida } from '@marketpos/core'

interface ProductoFormProps {
  initialData?: Producto | null
  categorias: Categoria[]
  unidades: UnidadMedida[]
  onClose: () => void
}

export function ProductoForm({ initialData, categorias, unidades, onClose }: ProductoFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  type FormInput = z.input<typeof productoSchema>

  const { register, handleSubmit, formState: { errors } } = useForm<FormInput>({
    resolver: zodResolver(productoSchema),
    defaultValues: {
      nombre: initialData?.nombre || '',
      codigo: initialData?.codigo || '',
      categoria_id: initialData?.categoria_id || undefined,
      unidad_medida_id: initialData?.unidad_medida_id || undefined,
      descripcion: initialData?.descripcion || '',
      precio_compra: initialData?.precio_compra?.toString() || '',
      precio_minorista: initialData?.precio_minorista?.toString() || '',
      precio_mayorista: initialData?.precio_mayorista?.toString() || '',
      stock_actual: initialData?.stock_actual?.toString() || '0',
      stock_minimo: initialData?.stock_minimo?.toString() || '',
      activo: initialData?.activo ?? true,
      afecto_igv: initialData?.afecto_igv ?? true,
      codigo_sunat: initialData?.codigo_sunat || '10',
    }
  })

  const onSubmit = async (data: FormInput) => {
    setIsPending(true)
    setError(null)
    try {
      const payload = {
        ...data,
        codigo: data.codigo === '' ? null : (data.codigo ?? null),
        categoria_id: data.categoria_id === '' ? null : (data.categoria_id ?? null),
        unidad_medida_id: data.unidad_medida_id === '' ? null : (data.unidad_medida_id ?? null),
        descripcion: data.descripcion === '' ? null : (data.descripcion ?? null),
        stock_actual: data.stock_actual ?? '0',
        stock_minimo: data.stock_minimo === '' ? null : (data.stock_minimo ?? null),
        codigo_sunat: data.codigo_sunat || '10',
        activo: data.activo ?? true,
        afecto_igv: data.afecto_igv ?? true,
      }
      
      const result = initialData 
        ? await updateProducto(initialData.id, payload)
        : await createProducto(payload)

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium mb-1">Nombre *</label>
          <input 
            {...register('nombre')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nombre del producto"
          />
          {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Código (SKU/Barras)</label>
          <input 
            {...register('codigo')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ej: PROD-001"
          />
          {errors.codigo && <p className="text-red-500 text-xs mt-1">{errors.codigo.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Código SUNAT</label>
          <input 
            {...register('codigo_sunat')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Por defecto: 10"
          />
          {errors.codigo_sunat && <p className="text-red-500 text-xs mt-1">{errors.codigo_sunat.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Categoría</label>
          <select 
            {...register('categoria_id')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccione una categoría</option>
            {categorias.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.nombre}</option>
            ))}
          </select>
          {errors.categoria_id && <p className="text-red-500 text-xs mt-1">{errors.categoria_id.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Unidad de Medida</label>
          <select 
            {...register('unidad_medida_id')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccione una unidad</option>
            {unidades.map(u => (
              <option key={u.id} value={u.id}>{u.nombre} ({u.simbolo})</option>
            ))}
          </select>
          {errors.unidad_medida_id && <p className="text-red-500 text-xs mt-1">{errors.unidad_medida_id.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Precio de Compra *</label>
          <input 
            type="number" step="0.01" min="0"
            {...register('precio_compra')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
          />
          {errors.precio_compra && <p className="text-red-500 text-xs mt-1">{errors.precio_compra.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Precio Minorista *</label>
          <input 
            type="number" step="0.01" min="0"
            {...register('precio_minorista')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
          />
          {errors.precio_minorista && <p className="text-red-500 text-xs mt-1">{errors.precio_minorista.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Precio Mayorista *</label>
          <input 
            type="number" step="0.01" min="0"
            {...register('precio_mayorista')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
          />
          {errors.precio_mayorista && <p className="text-red-500 text-xs mt-1">{errors.precio_mayorista.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Stock Actual *</label>
          <input 
            type="number" step="0.01" min="0"
            {...register('stock_actual')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0"
            disabled={!!initialData} // Usually you don't edit stock directly, but through adjustments. For simplicity, allow if new, disable if edit.
          />
          {errors.stock_actual && <p className="text-red-500 text-xs mt-1">{errors.stock_actual.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Stock Mínimo (Opcional)</label>
          <input 
            type="number" step="0.01" min="0"
            {...register('stock_minimo')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0"
          />
          {errors.stock_minimo && <p className="text-red-500 text-xs mt-1">{errors.stock_minimo.message}</p>}
        </div>
      </div>
      
      <div className="col-span-2">
        <label className="block text-sm font-medium mb-1">Descripción</label>
        <textarea 
          {...register('descripcion')}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Descripción del producto..."
          rows={3}
        />
        {errors.descripcion && <p className="text-red-500 text-xs mt-1">{errors.descripcion.message}</p>}
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <input 
            type="checkbox" 
            id="activo"
            {...register('activo')}
            className="rounded border-gray-300"
          />
          <label htmlFor="activo" className="text-sm font-medium">Activo</label>
        </div>

        <div className="flex items-center space-x-2">
          <input 
            type="checkbox" 
            id="afecto_igv"
            {...register('afecto_igv')}
            className="rounded border-gray-300"
          />
          <label htmlFor="afecto_igv" className="text-sm font-medium">Afecto a IGV</label>
        </div>
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
