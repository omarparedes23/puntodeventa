'use client'

import { useState, useTransition, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createProveedor, updateProveedor } from '../actions'
import type { Proveedor } from '@marketpos/core'
import { cn } from '@/lib/utils'

interface ProveedorFormProps {
  open: boolean
  onClose: () => void
  onSaved: (proveedor: Proveedor) => void
  proveedor?: Proveedor | null
}

export function ProveedorForm({ open, onClose, onSaved, proveedor }: ProveedorFormProps) {
  const editing = !!proveedor
  const [nombre, setNombre] = useState(proveedor?.nombre ?? '')
  const [ruc, setRuc] = useState(proveedor?.ruc ?? '')
  const [contacto, setContacto] = useState(proveedor?.contacto ?? '')
  const [telefono, setTelefono] = useState(proveedor?.telefono ?? '')
  const [email, setEmail] = useState(proveedor?.email ?? '')
  const [direccion, setDireccion] = useState(proveedor?.direccion ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [mounted, setMounted] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    if (open) {
      setShouldRender(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setMounted(true)))
    } else {
      setMounted(false)
      const timer = setTimeout(() => setShouldRender(false), 300)
      return () => clearTimeout(timer)
    }
  }, [open])

  // Reset form when proveedor changes
  useEffect(() => {
    if (open) {
      setNombre(proveedor?.nombre ?? '')
      setRuc(proveedor?.ruc ?? '')
      setContacto(proveedor?.contacto ?? '')
      setTelefono(proveedor?.telefono ?? '')
      setEmail(proveedor?.email ?? '')
      setDireccion(proveedor?.direccion ?? '')
      setError(null)
    }
  }, [open, proveedor])

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const input = {
        nombre: nombre.trim(),
        ruc: ruc.trim() || undefined,
        contacto: contacto.trim() || undefined,
        telefono: telefono.trim() || undefined,
        email: email.trim() || undefined,
        direccion: direccion.trim() || undefined,
        activo: true,
      }

      const res = editing
        ? await updateProveedor(proveedor!.id, input)
        : await createProveedor(input)

      if (res.error) {
        setError(res.error)
        return
      }
      if (res.data) {
        onSaved(res.data)
        onClose()
      }
    })
  }

  if (!shouldRender) return null

  const fields = [
    { label: 'Nombre / Razón social', value: nombre, onChange: setNombre, placeholder: 'Proveedor SAC', required: true },
    { label: 'RUC', value: ruc, onChange: setRuc, placeholder: '20XXXXXXXXX' },
    { label: 'Contacto', value: contacto, onChange: setContacto, placeholder: 'Nombre de contacto' },
    { label: 'Teléfono', value: telefono, onChange: setTelefono, placeholder: '9XXXXXXXX', type: 'tel' },
    { label: 'Email', value: email, onChange: setEmail, placeholder: 'correo@ejemplo.com', type: 'email' },
    { label: 'Dirección', value: direccion, onChange: setDireccion, placeholder: 'Dirección' },
  ]

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300',
          mounted ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'relative z-10 w-full h-[90vh] sm:h-auto sm:max-h-[85vh] sm:max-w-lg sm:rounded-3xl',
          'bg-background flex flex-col overflow-hidden',
          'sm:shadow-[0_8px_40px_oklch(0_0_0/0.25)]',
          'transition-all duration-300 ease-out',
          mounted
            ? 'sm:translate-y-0 sm:scale-100 translate-y-0'
            : 'sm:translate-y-8 sm:scale-95 translate-y-full'
        )}
      >
        {/* Header */}
        <div className="header-premium px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                {editing && <path d="M22 11h-4l-3 9" />}
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white">
              {editing ? 'Editar proveedor' : 'Nuevo proveedor'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
            disabled={isPending}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 scrollbar-thin">
          {fields.map(({ label, value, onChange, placeholder, type = 'text', required }) => (
            <div key={label} className="animate-fade-in">
              <label className="text-sm font-semibold text-foreground mb-1.5 block">
                {label}{required && <span className="text-destructive ml-0.5">*</span>}
              </label>
              <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="h-12 rounded-xl bg-secondary/50 border-border/60 focus-visible:ring-primary/30"
                type={type}
              />
            </div>
          ))}

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-xl px-4 py-3 font-medium animate-slide-up">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-4 border-t border-border/60 flex gap-3 flex-shrink-0 bg-background">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 h-14 text-base rounded-xl border-border/60"
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 h-14 text-base font-bold rounded-xl text-white shadow-md"
            style={{ background: 'var(--gradient-primary)' }}
            disabled={isPending || !nombre.trim()}
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Guardando...
              </span>
            ) : (
              editing ? 'Guardar cambios' : 'Crear proveedor'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
