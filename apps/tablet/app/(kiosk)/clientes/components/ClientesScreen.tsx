'use client'

import { useState, useTransition, useEffect } from 'react'
import { getClientes } from '../actions'
import { ClienteForm } from './ClienteForm'
import { Input } from '@/components/ui/input'
import type { Cliente } from '@marketpos/core'
import { cn } from '@/lib/utils'

interface ClientesScreenProps {
  initialClientes: Cliente[]
}

function getClienteColor(nombre: string) {
  const colors = [
    'from-blue-500 to-blue-600',
    'from-emerald-500 to-emerald-600',
    'from-violet-500 to-violet-600',
    'from-amber-500 to-amber-600',
    'from-rose-500 to-rose-600',
    'from-cyan-500 to-cyan-600',
    'from-fuchsia-500 to-fuchsia-600',
  ]
  let hash = 0
  for (let i = 0; i < nombre.length; i++) {
    hash = nombre.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export function ClientesScreen({ initialClientes }: ClientesScreenProps) {
  const [clientes, setClientes] = useState<Cliente[]>(initialClientes)
  const [query, setQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Cliente | null>(null)

  useEffect(() => {
    const timeout = setTimeout(() => {
      startTransition(async () => {
        const res = await getClientes(query)
        if (res.data) setClientes(res.data)
      })
    }, 300)
    return () => clearTimeout(timeout)
  }, [query])

  function handleSaved(saved: Cliente) {
    setClientes((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [saved, ...prev]
    })
  }

  function handleEdit(c: Cliente) {
    setEditing(c)
    setFormOpen(true)
  }

  function handleNew() {
    setEditing(null)
    setFormOpen(true)
  }

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Premium Header */}
        <div className="relative overflow-hidden">
          <div className="header-premium px-5 pt-5 pb-12">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-sm">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white tracking-wide">Clientes</h1>
                  <p className="text-xs text-white/60">{clientes.length} registros</p>
                </div>
              </div>
            </div>
          </div>
          {/* Decorative curve */}
          <div className="absolute -bottom-1 left-0 right-0 h-4 bg-background rounded-t-2xl" />
        </div>

        {/* Search — elevated over the curve */}
        <div className="px-4 -mt-4 pb-3 relative z-10">
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50"
              width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o documento..."
              className="h-13 text-base pl-12 rounded-xl bg-white border-border/50 shadow-md"
            />
          </div>
        </div>

        {/* Client list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 pb-24">
          {isPending && (
            <div className="flex items-center justify-center gap-2 py-6">
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">Buscando...</span>
            </div>
          )}
          {!isPending && clientes.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 py-16 animate-fade-in">
              <div className="w-20 h-20 rounded-3xl bg-primary/5 flex items-center justify-center border border-primary/10">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-primary/25">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground/80">No hay clientes</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Toca el botón + para crear uno</p>
              </div>
            </div>
          )}
          {!isPending && clientes.map((c, idx) => (
            <button
              key={c.id}
              onClick={() => handleEdit(c)}
              className={cn(
                'w-full flex items-center justify-between gap-3 py-3.5 px-3 mb-2',
                'bg-white rounded-xl border border-border/30 shadow-sm',
                'hover:shadow-md hover:border-border/60 active:scale-[0.98]',
                'transition-all duration-150 animate-fade-in text-left'
              )}
              style={{ animationDelay: `${Math.min(idx, 8) * 0.03}s` }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn(
                  'w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm bg-gradient-to-br flex-shrink-0',
                  getClienteColor(c.nombre)
                )}>
                  {c.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{c.nombre}</p>
                  {c.nro_documento && (
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      {c.tipo_documento}: {c.nro_documento}
                    </p>
                  )}
                </div>
              </div>
              <span
                className={cn(
                  'text-[11px] px-2.5 py-1 rounded-full font-semibold flex-shrink-0 border',
                  c.tipo_cliente === 'mayorista'
                    ? 'bg-primary/10 text-primary border-primary/20'
                    : 'bg-secondary text-secondary-foreground border-border/30'
                )}
              >
                {c.tipo_cliente}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Premium FAB */}
      <button
        onClick={handleNew}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center text-2xl font-light active:scale-90 transition-all z-20 animate-pop-in"
        style={{
          background: 'var(--gradient-primary)',
          boxShadow: '0 4px 20px oklch(0.28 0.10 264 / 0.35)',
        }}
        aria-label="Nuevo cliente"
      >
        +
      </button>

      <ClienteForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
        cliente={editing}
      />
    </>
  )
}
