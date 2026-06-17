'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { CompraConProveedor } from '../actions'
import { cn } from '@/lib/utils'

interface ComprasScreenProps {
  initialCompras: CompraConProveedor[]
}

const estadoConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  pendiente: { label: 'Pendiente', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  parcial: { label: 'Parcial', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  pagado: { label: 'Pagado', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
}

export function ComprasScreen({ initialCompras }: ComprasScreenProps) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? initialCompras.filter(
        (c) =>
          c.proveedor?.nombre.toLowerCase().includes(query.toLowerCase()) ||
          c.nro_documento?.includes(query)
      )
    : initialCompras

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Premium Header ── */}
      <div className="header-premium px-5 pt-5 pb-8 relative overflow-hidden flex-shrink-0">
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-white/5" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Compras</h1>
                <p className="text-xs text-white/60">{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <Link
              href="/compras/nueva"
              className="min-h-[44px] px-4 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-semibold flex items-center gap-2 transition-colors backdrop-blur-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Nueva
            </Link>
          </div>
        </div>

      </div>

      {/* ── Search bar ── */}
      <div className="px-5 pt-4 mb-4 relative z-10 flex-shrink-0">
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por proveedor o documento..."
            className="flex h-14 w-full rounded-xl border border-border/60 bg-white pl-12 pr-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40 shadow-sm transition-all"
          />
        </div>
      </div>

      {/* ── List ── */}
      <div className="flex-1 overflow-y-auto px-5 pb-24 space-y-3 scrollbar-thin">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
            <p className="text-sm font-medium text-muted-foreground">No hay compras registradas</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Crea una nueva compra para comenzar</p>
          </div>
        ) : (
          filtered.map((c, idx) => {
            const estado = estadoConfig[c.estado_pago]
            return (
              <Link
                key={c.id}
                href={`/compras/${c.id}`}
                className="block animate-fade-in"
                style={{ animationDelay: `${Math.min(idx, 8) * 0.03}s` }}
              >
                <div className="card-elevated p-4 active:scale-[0.985] transition-transform">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface-warm)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600">
                          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                          <line x1="3" y1="6" x2="21" y2="6" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {c.proveedor?.nombre ?? 'Sin proveedor'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {c.fecha_compra}
                          {c.nro_documento && ` · ${c.nro_documento}`}
                          {` · ${c.items_count} producto${c.items_count !== 1 ? 's' : ''}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className="text-base font-bold text-foreground tabular-nums">S/ {c.total.toFixed(2)}</span>
                      {estado && (
                        <span className={cn('text-[11px] px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1', estado.bg, estado.text)}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', estado.dot)} />
                          {estado.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
