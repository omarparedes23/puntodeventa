'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { createCliente, updateCliente } from '../actions'
import type { Cliente } from '@marketpos/core'
import { cn } from '@/lib/utils'
import { Check, User, FileText, Phone, Mail, X } from 'lucide-react'

type TipoDocumento = 'DNI' | 'RUC' | 'CE' | 'PASAPORTE'
type TipoCliente = 'mayorista' | 'minorista'

interface ClienteFormProps {
  open: boolean
  onClose: () => void
  onSaved: (cliente: Cliente) => void
  cliente?: Cliente | null
}

const TIPOS_CLIENTE: {
  value: TipoCliente
  label: string
  icon: React.ReactNode
  selectedStyle: React.CSSProperties
  selectedBorder: string
  selectedBg: string
}[] = [
  {
    value: 'minorista',
    label: 'Minorista',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    selectedStyle: { background: 'linear-gradient(135deg, oklch(0.50 0.18 255), oklch(0.55 0.20 265))' },
    selectedBorder: 'border-blue-500',
    selectedBg: 'bg-blue-500',
  },
  {
    value: 'mayorista',
    label: 'Mayorista',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    selectedStyle: { background: 'linear-gradient(135deg, oklch(0.35 0.14 280), oklch(0.40 0.16 290))' },
    selectedBorder: 'border-indigo-500',
    selectedBg: 'bg-indigo-500',
  },
]

const TIPOS_DOC: TipoDocumento[] = ['DNI', 'RUC', 'CE', 'PASAPORTE']

export function ClienteForm({ open, onClose, onSaved, cliente }: ClienteFormProps) {
  const editing = !!cliente
  const [nombre, setNombre] = useState(cliente?.nombre ?? '')
  const [tipoDoc, setTipoDoc] = useState<TipoDocumento>((cliente?.tipo_documento as TipoDocumento) ?? 'DNI')
  const [nroDoc, setNroDoc] = useState(cliente?.nro_documento ?? '')
  const [tipoCliente, setTipoCliente] = useState<TipoCliente>((cliente?.tipo_cliente as TipoCliente) ?? 'minorista')
  const [telefono, setTelefono] = useState(cliente?.telefono ?? '')
  const [email, setEmail] = useState(cliente?.email ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [mounted, setMounted] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    if (open) {
      setShouldRender(true)
      // Reset form state when opening
      setNombre(cliente?.nombre ?? '')
      setTipoDoc((cliente?.tipo_documento as TipoDocumento) ?? 'DNI')
      setNroDoc(cliente?.nro_documento ?? '')
      setTipoCliente((cliente?.tipo_cliente as TipoCliente) ?? 'minorista')
      setTelefono(cliente?.telefono ?? '')
      setEmail(cliente?.email ?? '')
      setError(null)
      requestAnimationFrame(() => requestAnimationFrame(() => setMounted(true)))
    } else {
      setMounted(false)
      const timer = setTimeout(() => setShouldRender(false), 300)
      return () => clearTimeout(timer)
    }
  }, [open, cliente])

  const handleClose = useCallback(() => {
    if (isPending) return
    setError(null)
    onClose()
  }, [isPending, onClose])

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const input = {
        nombre: nombre.trim(),
        tipo_documento: tipoDoc,
        nro_documento: nroDoc.trim() || null,
        tipo_cliente: tipoCliente,
        telefono: telefono.trim() || null,
        email: email.trim() || null,
        activo: true,
      }

      const res = editing
        ? await updateCliente(cliente!.id, input as any)
        : await createCliente(input as any)

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

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 z-[100] flex items-end sm:items-center justify-center',
          'transition-all duration-300',
          mounted ? 'opacity-100' : 'opacity-0'
        )}
      >
        <div
          className={cn(
            'absolute inset-0 backdrop-blur-sm transition-opacity duration-300',
            mounted ? 'opacity-100' : 'opacity-0'
          )}
          style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
          onClick={handleClose}
        />

        {/* Panel */}
        <div
          className={cn(
            'relative z-10 w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-3xl',
            'flex flex-col overflow-hidden',
            'shadow-[0_-4px_40px_oklch(0_0_0/0.25)]',
            'transition-all duration-300 ease-out',
            mounted
              ? 'sm:translate-y-0 sm:scale-100 translate-y-0'
              : 'sm:translate-y-8 sm:scale-95 translate-y-full'
          )}
          style={{ backgroundColor: '#ffffff' }}
        >
          {/* Header */}
          <div className="header-premium px-6 py-5 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  {editing ? 'Editar cliente' : 'Nuevo cliente'}
                </h2>
                <p className="text-xs text-white/60">
                  {editing ? 'Actualiza los datos' : 'Completa los datos del cliente'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
              disabled={isPending}
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Scrollable form */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 scrollbar-thin">
            {/* Nombre */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                Nombre *
              </label>
              <div className="relative">
                <Input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre completo o razón social"
                  className="h-12 pl-11 rounded-xl border-gray-200 bg-gray-50"
                />
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              </div>
            </div>

            {/* Tipo de cliente */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                Tipo de cliente
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TIPOS_CLIENTE.map((t) => {
                  const isActive = tipoCliente === t.value
                  return (
                    <button
                      key={t.value}
                      onClick={() => setTipoCliente(t.value)}
                      className={cn(
                        'relative min-h-[52px] rounded-xl border-2 text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2',
                        isActive
                          ? `${t.selectedBorder} text-white shadow-md`
                          : 'border-border/60 bg-card text-foreground hover:bg-accent'
                      )}
                      style={isActive ? t.selectedStyle : undefined}
                    >
                      {t.icon}
                      {t.label}
                      {isActive && (
                        <div className={cn('absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-sm', t.selectedBg)}>
                          <Check className="w-3 h-3 text-white" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Documento */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                Documento
              </label>
              <div className="flex gap-2">
                <div className="relative flex-shrink-0">
                  <select
                    value={tipoDoc}
                    onChange={(e) => setTipoDoc(e.target.value as TipoDocumento)}
                    className={cn(
                      'h-12 rounded-xl border-2 border-gray-200 bg-white px-4 pr-8 text-sm font-medium',
                      'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
                      'appearance-none cursor-pointer transition-all'
                    )}
                  >
                    {TIPOS_DOC.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
                <div className="relative flex-1">
                  <Input
                    value={nroDoc}
                    onChange={(e) => setNroDoc(e.target.value)}
                    placeholder="Número"
                    className="h-12 pl-11 rounded-xl border-gray-200 bg-gray-50"
                  />
                  <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                </div>
              </div>
            </div>

            {/* Teléfono */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                Teléfono
              </label>
              <div className="relative">
                <Input
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Teléfono"
                  className="h-12 pl-11 rounded-xl border-gray-200 bg-gray-50"
                  type="tel"
                />
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                Email
              </label>
              <div className="relative">
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="h-12 pl-11 rounded-xl border-gray-200 bg-gray-50"
                  type="email"
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive text-sm rounded-xl px-4 py-3 font-medium">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 pt-4 border-t border-gray-100 flex gap-3 flex-shrink-0" style={{ backgroundColor: '#ffffff' }}>
            <button
              onClick={handleClose}
              className="flex-1 min-h-[52px] text-sm font-semibold rounded-xl border-2 border-gray-200 bg-white text-foreground hover:bg-gray-50 transition-all"
              disabled={isPending}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending || !nombre.trim()}
              className={cn(
                'flex-1 min-h-[52px] text-sm font-bold rounded-xl',
                'text-success-foreground',
                'shadow-lg',
                'hover:opacity-90 active:scale-[0.98] transition-all duration-150',
                'disabled:opacity-50 disabled:pointer-events-none',
                'flex items-center justify-center gap-2'
              )}
              style={{ background: 'var(--gradient-success)' }}
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Guardando...
                </span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {editing ? 'Guardar cambios' : 'Crear cliente'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
