'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { clienteSchema, ClienteInput } from '@/lib/validations/clientes'
import { useState, useTransition } from 'react'
import { createCliente, updateCliente } from '@/app/(dashboard)/clientes/actions'

interface ClienteFormProps {
  initialData?: ClienteInput & { id?: string }
  onSuccess?: () => void
  onCancel?: () => void
}

export function ClienteForm({ initialData, onSuccess, onCancel }: ClienteFormProps) {
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  type FormInput = z.input<typeof clienteSchema>

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput>({
    resolver: zodResolver(clienteSchema),
    defaultValues: initialData || {
      tipo_documento: 'DNI',
      nro_documento: '',
      nombre: '',
      direccion: '',
      email: '',
      telefono: '',
      tipo_cliente: 'minorista',
      tiene_credito: false,
      limite_credito: 0,
      saldo_deudor: 0,
      activo: true,
    },
  })

  const onSubmit = (data: FormInput) => {
    setErrorMsg(null)
    startTransition(async () => {
      const action = initialData?.id
        ? updateCliente(initialData.id, data as ClienteInput)
        : createCliente(data as ClienteInput)
      
      const res = await action

      if (res.error) {
        setErrorMsg(res.error)
      } else {
        onSuccess?.()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Tipo Documento</label>
          <select 
            {...register('tipo_documento')} 
            className="w-full p-2 border rounded-md"
          >
            <option value="DNI">DNI</option>
            <option value="RUC">RUC</option>
            <option value="CE">CE</option>
            <option value="PASAPORTE">PASAPORTE</option>
            <option value="OTROS">OTROS</option>
          </select>
          {errors.tipo_documento && <p className="text-red-500 text-xs">{errors.tipo_documento.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Nro. Documento</label>
          <input 
            {...register('nro_documento')} 
            className="w-full p-2 border rounded-md" 
            placeholder="Documento..."
          />
          {errors.nro_documento && <p className="text-red-500 text-xs">{errors.nro_documento.message}</p>}
        </div>

        <div className="space-y-2 col-span-2">
          <label className="text-sm font-medium">Nombre o Razón Social</label>
          <input 
            {...register('nombre')} 
            className="w-full p-2 border rounded-md" 
            placeholder="Nombre..."
          />
          {errors.nombre && <p className="text-red-500 text-xs">{errors.nombre.message}</p>}
        </div>

        <div className="space-y-2 col-span-2">
          <label className="text-sm font-medium">Dirección</label>
          <input 
            {...register('direccion')} 
            className="w-full p-2 border rounded-md" 
            placeholder="Dirección..."
          />
          {errors.direccion && <p className="text-red-500 text-xs">{errors.direccion.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Teléfono</label>
          <input 
            {...register('telefono')} 
            className="w-full p-2 border rounded-md" 
            placeholder="Teléfono..."
          />
          {errors.telefono && <p className="text-red-500 text-xs">{errors.telefono.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <input 
            type="email"
            {...register('email')} 
            className="w-full p-2 border rounded-md" 
            placeholder="Email..."
          />
          {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
        </div>

        <div className="space-y-2 col-span-2">
          <label className="text-sm font-medium">Tipo de Cliente</label>
          <select 
            {...register('tipo_cliente')} 
            className="w-full p-2 border rounded-md"
          >
            <option value="minorista">Minorista</option>
            <option value="mayorista">Mayorista</option>
          </select>
          {errors.tipo_cliente && <p className="text-red-500 text-xs">{errors.tipo_cliente.message}</p>}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}
