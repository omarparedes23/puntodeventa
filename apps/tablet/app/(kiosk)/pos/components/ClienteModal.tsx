'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { buscarClientes, getOrCreateClienteGenerico, createCliente } from '../actions'
import type { ClienteSearchResult } from '../actions'
import { cn } from '@/lib/utils'

interface ClienteModalProps {
  open: boolean
  onClose: () => void
  onSelect: (cliente: ClienteSearchResult | null) => void
}

type TipoDocumento = 'DNI' | 'RUC' | 'CE' | 'PASAPORTE'
type TipoCliente = 'mayorista' | 'minorista'

// SVG Icons
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  )
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function UserPlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function PersonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

export function ClienteModal({ open, onClose, onSelect }: ClienteModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ClienteSearchResult[]>([])
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  // Mini-form state
  const [nombre, setNombre] = useState('')
  const [tipoDoc, setTipoDoc] = useState<TipoDocumento>('DNI')
  const [nroDoc, setNroDoc] = useState('')
  const [tipoCliente, setTipoCliente] = useState<TipoCliente>('minorista')
  const [formError, setFormError] = useState<string | null>(null)
  const [formPending, startFormTransition] = useTransition()

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setShowForm(false)
      setFormError(null)
      setNombre('')
      setNroDoc('')
      setTipoDoc('DNI')
      setTipoCliente('minorista')
      // Auto-focus search after animation
      setTimeout(() => searchRef.current?.focus(), 300)
    }
  }, [open])

  // Search effect
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    const timeout = setTimeout(() => {
      startTransition(async () => {
        const res = await buscarClientes(query)
        if (res.data) setResults(res.data)
      })
    }, 300)
    return () => clearTimeout(timeout)
  }, [query])

  function handleSelectGenerico() {
    startTransition(async () => {
      const res = await getOrCreateClienteGenerico()
      if (res.data) {
        onSelect({
          id: res.data.id,
          nombre: res.data.nombre,
          tipo_documento: res.data.tipo_documento,
          nro_documento: res.data.nro_documento,
          tipo_cliente: res.data.tipo_cliente as TipoCliente,
        })
        onClose()
      }
    })
  }

  function handleSelect(cliente: ClienteSearchResult) {
    onSelect(cliente)
    onClose()
  }

  function handleCreateCliente() {
    setFormError(null)
    if (!nombre.trim()) {
      setFormError('El nombre es requerido')
      return
    }
    startFormTransition(async () => {
      const res = await createCliente({
        nombre: nombre.trim(),
        tipo_documento: tipoDoc,
        nro_documento: nroDoc.trim() || undefined,
        tipo_cliente: tipoCliente,
        activo: true,
      } as any)
      if (res.error) {
        setFormError(res.error)
        return
      }
      if (res.data) {
        onSelect({
          id: res.data.id,
          nombre: res.data.nombre,
          tipo_documento: res.data.tipo_documento,
          nro_documento: res.data.nro_documento,
          tipo_cliente: res.data.tipo_cliente as TipoCliente,
        })
        onClose()
      }
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-lg mx-4 bg-white rounded-2xl shadow-[0_8px_40px_oklch(0_0_0/0.15)] border border-gray-100 animate-slide-up overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
              <PersonIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Seleccionar cliente</h2>
              <p className="text-xs text-gray-500">Busca o crea un cliente para la venta</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Quick Action: Cliente Genérico */}
          <button
            onClick={handleSelectGenerico}
            disabled={isPending}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-blue-100 group-hover:to-blue-200 flex items-center justify-center transition-all">
              <span className="text-lg font-bold text-gray-500 group-hover:text-blue-600 transition-colors">G</span>
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">Cliente genérico</p>
              <p className="text-xs text-gray-500">Sin identificación — venta rápida</p>
            </div>
            {isPending && (
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            )}
          </button>

          {/* Search Bar */}
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o documento..."
              className="w-full h-14 pl-12 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
            />
          </div>

          {/* Results */}
          {isPending && query.trim() && (
            <div className="flex items-center justify-center gap-2 py-4">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-500">Buscando clientes...</span>
            </div>
          )}

          {!isPending && results.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider px-1">
                {results.length} resultado{results.length !== 1 ? 's' : ''}
              </p>
              <div className="space-y-2">
                {results.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelect(c)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all text-left animate-fade-in"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-gray-600">
                        {c.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{c.nombre}</p>
                      {c.nro_documento && (
                        <p className="text-xs text-gray-500">
                          {c.tipo_documento}: {c.nro_documento}
                        </p>
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-xs px-3 py-1 rounded-full font-medium flex-shrink-0',
                        c.tipo_cliente === 'mayorista'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      )}
                    >
                      {c.tipo_cliente}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isPending && query.trim() && results.length === 0 && (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <SearchIcon className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-600">No se encontraron clientes</p>
              <p className="text-xs text-gray-500 mt-1">Intenta con otro nombre o documento</p>
            </div>
          )}

          {/* Create New Client */}
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-gray-200 text-sm font-medium text-gray-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 transition-all"
            >
              <UserPlusIcon className="w-5 h-5" />
              Crear nuevo cliente
            </button>
          ) : (
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-3 animate-slide-up">
              <div className="flex items-center gap-2 mb-1">
                <UserPlusIcon className="w-4 h-4 text-blue-600" />
                <p className="text-sm font-semibold text-gray-900">Nuevo cliente</p>
              </div>

              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre completo *"
                className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />

              <div className="flex gap-2">
                <select
                  value={tipoDoc}
                  onChange={(e) => setTipoDoc(e.target.value as TipoDocumento)}
                  className="h-12 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  {(['DNI', 'RUC', 'CE', 'PASAPORTE'] as TipoDocumento[]).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={nroDoc}
                  onChange={(e) => setNroDoc(e.target.value)}
                  placeholder="N° documento"
                  className="flex-1 h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Tipo Cliente Toggle */}
              <div className="flex gap-2">
                {(['minorista', 'mayorista'] as TipoCliente[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTipoCliente(t)}
                    className={cn(
                      'flex-1 h-11 rounded-xl border text-sm font-medium capitalize transition-all',
                      tipoCliente === t
                        ? 'border-blue-500 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {formError && (
                <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setShowForm(false); setFormError(null) }}
                  className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateCliente}
                  disabled={formPending}
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                >
                  {formPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Guardando...
                    </span>
                  ) : (
                    'Guardar cliente'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
