'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ProveedorFormValues, proveedorSchema } from '@marketpos/core'
import { Proveedor } from '@marketpos/core'
import { useState } from 'react'

interface Props {
  proveedor?: Proveedor | null
  onSubmit: (data: ProveedorFormValues) => Promise<void>
  onCancel: () => void
}

export function ProveedorForm({ proveedor, onSubmit, onCancel }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<ProveedorFormValues>({
    resolver: zodResolver(proveedorSchema),
    defaultValues: {
      ruc: proveedor?.ruc || '',
      nombre: proveedor?.nombre || '',
      contacto: proveedor?.contacto || '',
      telefono: proveedor?.telefono || '',
      email: proveedor?.email || '',
      direccion: proveedor?.direccion || '',
      activo: proveedor?.activo ?? true,
    },
  })

  const handleSubmit = async (data: ProveedorFormValues) => {
    try {
      setIsSubmitting(true)
      setError(null)
      await onSubmit(data)
    } catch (err: any) {
      setError(err.message || 'Error al guardar')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow border">
      <h2 className="text-xl font-bold mb-4">{proveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
      
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">RUC (11 dígitos, opcional)</label>
          <input
            {...form.register('ruc')}
            className="w-full border rounded px-3 py-2"
            placeholder="10452398452"
          />
          {form.formState.errors.ruc && (
            <p className="text-red-500 text-sm mt-1">{form.formState.errors.ruc.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Razón Social / Nombre *</label>
          <input
            {...form.register('nombre')}
            className="w-full border rounded px-3 py-2"
            placeholder="Distribuidora XYZ"
          />
          {form.formState.errors.nombre && (
            <p className="text-red-500 text-sm mt-1">{form.formState.errors.nombre.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Nombre de Contacto</label>
          <input
            {...form.register('contacto')}
            className="w-full border rounded px-3 py-2"
            placeholder="Juan Pérez"
          />
          {form.formState.errors.contacto && (
            <p className="text-red-500 text-sm mt-1">{form.formState.errors.contacto.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Teléfono</label>
          <input
            {...form.register('telefono')}
            className="w-full border rounded px-3 py-2"
            placeholder="987654321"
          />
          {form.formState.errors.telefono && (
            <p className="text-red-500 text-sm mt-1">{form.formState.errors.telefono.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            {...form.register('email')}
            type="email"
            className="w-full border rounded px-3 py-2"
            placeholder="contacto@empresa.com"
          />
          {form.formState.errors.email && (
            <p className="text-red-500 text-sm mt-1">{form.formState.errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Dirección</label>
          <input
            {...form.register('direccion')}
            className="w-full border rounded px-3 py-2"
            placeholder="Av. Los Pinos 123"
          />
          {form.formState.errors.direccion && (
            <p className="text-red-500 text-sm mt-1">{form.formState.errors.direccion.message}</p>
          )}
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="activo"
            {...form.register('activo')}
            className="mr-2"
          />
          <label htmlFor="activo" className="text-sm font-medium">Proveedor Activo</label>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  )
}
