'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { empresaConfigSchema, type EmpresaConfigFormValues } from '@marketpos/core'
import { updateEmpresa } from '../actions'
import type { EmpresaConfig } from '../actions'

export function EmpresaForm({ empresa }: { empresa: EmpresaConfig }) {
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<EmpresaConfigFormValues>({
    resolver: zodResolver(empresaConfigSchema),
    defaultValues: {
      razon_social: empresa.razon_social,
      nombre_comercial: empresa.nombre_comercial ?? '',
      ruc: empresa.ruc,
      direccion: empresa.direccion ?? '',
      telefono: empresa.telefono ?? '',
      email: empresa.email ?? '',
      serie_boleta: empresa.serie_boleta,
      serie_factura: empresa.serie_factura,
    },
  })

  function onSubmit(data: EmpresaConfigFormValues) {
    setSuccess(false)
    setServerError(null)
    startTransition(async () => {
      const res = await updateEmpresa(data)
      if (res.error) { setServerError(res.error); return }
      setSuccess(true)
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border p-6 space-y-5">
      <h2 className="text-sm font-semibold text-gray-700">Datos de la empresa</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Razón social *</label>
          <input {...register('razon_social')}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {errors.razon_social && <p className="text-xs text-red-500 mt-1">{errors.razon_social.message}</p>}
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Nombre comercial</label>
          <input {...register('nombre_comercial')}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">RUC *</label>
          <input {...register('ruc')} maxLength={11}
            className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {errors.ruc && <p className="text-xs text-red-500 mt-1">{errors.ruc.message}</p>}
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Teléfono</label>
          <input {...register('telefono')}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Email</label>
          <input {...register('email')} type="email"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Dirección</label>
          <input {...register('direccion')}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="border-t pt-4 space-y-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Series de comprobantes</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Serie boleta *</label>
            <input {...register('serie_boleta')} placeholder="B001"
              className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {errors.serie_boleta && <p className="text-xs text-red-500 mt-1">{errors.serie_boleta.message}</p>}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Serie factura *</label>
            <input {...register('serie_factura')} placeholder="F001"
              className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {errors.serie_factura && <p className="text-xs text-red-500 mt-1">{errors.serie_factura.message}</p>}
          </div>
        </div>
        <p className="text-xs text-gray-400">Advertencia: cambiar la serie después de haber emitido comprobantes puede causar inconsistencias en SUNAT.</p>
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      {success && <p className="text-sm text-green-600">Guardado correctamente.</p>}

      <div className="flex justify-end">
        <button type="submit" disabled={isPending}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50">
          {isPending ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}
