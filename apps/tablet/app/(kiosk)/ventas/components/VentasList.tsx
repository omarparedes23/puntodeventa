'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useSessionStore } from '@marketpos/core'
import type { VentaResumen } from '../actions'

const TIPO_LABEL: Record<string, string> = {
  boleta: 'Boleta',
  factura: 'Factura',
  ticket: 'Ticket',
  nota_credito: 'Nota de Crédito',
}

const TIPO_BADGE: Record<string, string> = {
  boleta: 'bg-blue-50 text-blue-600',
  factura: 'bg-indigo-50 text-indigo-600',
  ticket: 'bg-slate-100 text-slate-500',
  nota_credito: 'bg-orange-50 text-orange-600',
}

const ESTADO_BADGE: Record<string, { cls: string; label: string }> = {
  emitida:     { cls: 'bg-emerald-100 text-emerald-700', label: 'Emitida' },
  pendiente:   { cls: 'bg-amber-100 text-amber-700',     label: 'Pendiente' },
  error_sunat: { cls: 'bg-red-100 text-red-700',         label: 'Error SUNAT' },
  anulada:     { cls: 'bg-slate-100 text-slate-500',     label: 'Anulada' },
}

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Lima',
  })
}

export function VentasList({ ventas }: { ventas: VentaResumen[] }) {
  const isAdmin = useSessionStore((s) => s.perfil?.rol === 'administrador')

  if (ventas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground p-8">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-30">
          <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>
          <path d="M16 8h-6"/><path d="M14 12H8"/><path d="M12 16H8"/>
        </svg>
        <p className="text-sm font-medium">No hay ventas registradas hoy</p>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-72px)] overflow-y-auto">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/60 bg-card/80 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-base font-bold text-foreground">{isAdmin ? 'Ventas de hoy' : 'Mis ventas de hoy'}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{ventas.length} venta{ventas.length !== 1 ? 's' : ''} registrada{ventas.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Lista */}
      <div className="p-4 space-y-2.5">
        {ventas.map((v) => {
          const estadoBadge = ESTADO_BADGE[v.estado] ?? ESTADO_BADGE.pendiente
          return (
            <Link
              key={v.id}
              href={`/ventas/${v.id}`}
              className={cn(
                'flex items-center gap-4 px-4 rounded-2xl border border-border/60 bg-card shadow-sm',
                'min-h-[64px] hover:bg-accent active:scale-[0.98] transition-all duration-150'
              )}
            >
              {/* Número y tipo */}
              <div className="flex-1 min-w-0 py-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-semibold text-foreground truncate">
                    {v.numero_completo ?? 'Sin número'}
                  </span>
                  <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', TIPO_BADGE[v.tipo_comprobante] ?? 'bg-slate-100 text-slate-500')}>
                    {TIPO_LABEL[v.tipo_comprobante] ?? v.tipo_comprobante}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {v.cliente_nombre ?? 'Consumidor final'} · {fmtHora(v.created_at)}
                </p>
              </div>

              {/* Total y estado */}
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0 py-3">
                <span className="text-base font-bold tabular-nums text-foreground">
                  S/ {v.total.toFixed(2)}
                </span>
                <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', estadoBadge.cls)}>
                  {estadoBadge.label}
                </span>
              </div>

              {/* Chevron */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground flex-shrink-0">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
