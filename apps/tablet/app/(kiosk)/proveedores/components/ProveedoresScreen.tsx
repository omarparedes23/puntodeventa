'use client'

import { useState, useTransition } from 'react'
import { getProveedores } from '../actions'
import { ProveedorForm } from './ProveedorForm'
import { Input } from '@/components/ui/input'
import type { Proveedor } from '@marketpos/core'
import { cn } from '@/lib/utils'

interface ProveedoresScreenProps {
  initialProveedores: Proveedor[]
}

function getProveedorColor(nombre: string) {
  const colors = [
    'from-blue-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-violet-500 to-purple-600',
    'from-cyan-500 to-sky-600',
  ]
  let hash = 0
  for (let i = 0; i < nombre.length; i++) {
    hash = nombre.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export function ProveedoresScreen({ initialProveedores }: ProveedoresScreenProps) {
  const [proveedores, setProveedores] = useState<Proveedor[]>(initialProveedores)
  const [query, setQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Proveedor | null>(null)

  const filtered = query.trim()
    ? proveedores.filter(
        (p) =>
          p.nombre.toLowerCase().includes(query.toLowerCase()) ||
          p.ruc?.includes(query)
      )
    : proveedores

  function handleRefresh() {
    startTransition(async () => {
      const res = await getProveedores()
      if (res.data) setProveedores(res.data)
    })
  }

  function handleSaved(saved: Proveedor) {
    setProveedores((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [saved, ...prev]
    })
  }

  function handleEdit(p: Proveedor) {
    setEditing(p)
    setFormOpen(true)
  }

  function handleNew() {
    setEditing(null)
    setFormOpen(true)
  }

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">
        {/* ── Premium Header ── */}
        <div className="header-premium px-5 pt-5 pb-8 relative overflow-hidden flex-shrink-0">
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-white/5" />

          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Proveedores</h1>
                  <p className="text-xs text-white/60">{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ── Search bar ── */}
        <div className="px-5 pt-4 mb-4 relative z-10 flex-shrink-0">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o RUC..."
              className="h-14 pl-12 rounded-xl bg-white border-border/60 shadow-sm"
            />
          </div>
        </div>

        {/* ── List ── */}
        <div className="flex-1 overflow-y-auto px-5 pb-24 space-y-3 scrollbar-thin">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              </div>
              <p className="text-sm font-medium text-muted-foreground">No hay proveedores</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Agrega uno con el botón +</p>
            </div>
          ) : (
            filtered.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => handleEdit(p)}
                className="block w-full text-left animate-fade-in"
                style={{ animationDelay: `${Math.min(idx, 8) * 0.03}s` }}
              >
                <div className="card-elevated p-4 active:scale-[0.985] transition-transform">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-lg font-bold text-white flex-shrink-0',
                      getProveedorColor(p.nombre)
                    )}>
                      {p.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">{p.nombre}</p>
                      {p.ruc && (
                        <p className="text-xs text-muted-foreground mt-0.5">RUC: {p.ruc}</p>
                      )}
                      {p.telefono && (
                        <p className="text-xs text-muted-foreground/70 mt-0.5">{p.telefono}</p>
                      )}
                    </div>
                    {p.saldo_deudor > 0 && (
                      <span className="text-[11px] bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 flex-shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        S/ {p.saldo_deudor.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── FAB ── */}
      <button
        onClick={handleNew}
        className="fixed bottom-20 right-5 w-14 h-14 rounded-2xl flex items-center justify-center text-white animate-fade-in z-20 active:scale-90 transition-transform"
        style={{
          background: 'var(--gradient-primary)',
          boxShadow: '0 4px 16px oklch(0.28 0.10 264 / 0.35)',
        }}
        aria-label="Nuevo proveedor"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      <ProveedorForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
        proveedor={editing}
      />
    </>
  )
}
