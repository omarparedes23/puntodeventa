'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { reenviarSunat, type VentaCompleta } from '../../actions'

const TIPO_LABEL: Record<string, string> = {
  boleta: 'Boleta',
  factura: 'Factura',
  ticket: 'Ticket',
  nota_credito: 'Nota de Crédito',
}

const METODO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  yape: 'Yape',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  credito: 'Crédito',
}

const ESTADO_CONFIG: Record<string, { cls: string; label: string }> = {
  emitida:     { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Emitida' },
  pendiente:   { cls: 'bg-amber-100 text-amber-700 border-amber-200',       label: 'Pendiente SUNAT' },
  error_sunat: { cls: 'bg-red-100 text-red-700 border-red-200',             label: 'Error SUNAT' },
  anulada:     { cls: 'bg-slate-100 text-slate-500 border-slate-200',       label: 'Anulada' },
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Lima',
  })
}

function fmtMoney(n: number) { return `S/ ${n.toFixed(2)}` }

export function VentaDetalle({ venta: initialVenta }: { venta: VentaCompleta }) {
  const router = useRouter()
  const [venta, setVenta] = useState(initialVenta)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const estadoConfig = ESTADO_CONFIG[venta.estado] ?? ESTADO_CONFIG.pendiente
  const puedeReenviar = ['error_sunat', 'pendiente'].includes(venta.estado) && venta.tipo_comprobante !== 'ticket'

  function handleReenviar() {
    setError(null)
    startTransition(async () => {
      const res = await reenviarSunat(venta.id)
      if (res.error) {
        setError(res.error)
        return
      }
      setVenta((prev) => ({ ...prev, estado: 'emitida', sunat_estado: 'aceptada' }))
    })
  }

  return (
    <div className="h-[calc(100vh-72px)] overflow-y-auto">
      {/* Header premium */}
      <div className="header-premium px-5 py-4 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors flex-shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-base truncate">
            {venta.numero_completo ?? 'Sin número'}
          </p>
          <p className="text-white/70 text-xs">{TIPO_LABEL[venta.tipo_comprobante] ?? venta.tipo_comprobante} · {fmtDateTime(venta.created_at)}</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Estado SUNAT */}
        <div className={cn('flex items-center justify-between px-4 py-3 rounded-2xl border', estadoConfig.cls)}>
          <div>
            <p className="font-bold text-sm">{estadoConfig.label}</p>
            {venta.sunat_estado && (
              <p className="text-xs opacity-70 mt-0.5">SUNAT: {venta.sunat_estado}</p>
            )}
          </div>
          {puedeReenviar && (
            <button
              onClick={handleReenviar}
              disabled={isPending}
              className="px-3 py-2 bg-white/70 hover:bg-white/90 rounded-xl text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {isPending ? (
                <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                  <path d="M21 3v5h-5"/>
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                  <path d="M3 21v-5h5"/>
                </svg>
              )}
              Reenviar a SUNAT
            </button>
          )}
        </div>

        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Cliente */}
        <div className="bg-card rounded-2xl border border-border/60 px-4 py-3">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Cliente</p>
          <p className="text-sm font-medium text-foreground">
            {venta.cliente?.nombre ?? 'Consumidor final'}
          </p>
          {venta.cliente?.nro_documento && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {venta.cliente.tipo_documento}: {venta.cliente.nro_documento}
            </p>
          )}
        </div>

        {/* Productos */}
        <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Productos</p>
          </div>
          <div className="divide-y divide-border/40">
            {venta.items.map((item) => (
              <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.producto_nombre}</p>
                  {item.producto_codigo && (
                    <p className="text-xs text-muted-foreground">{item.producto_codigo}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold tabular-nums">{fmtMoney(item.total)}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {item.cantidad} × {fmtMoney(item.precio_unitario)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Totales */}
          <div className="border-t border-border/60 px-4 py-3 space-y-1.5 bg-muted/30">
            {venta.descuento_total > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Descuento</span>
                <span className="tabular-nums font-mono text-orange-600">−{fmtMoney(venta.descuento_total)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums font-mono">{fmtMoney(venta.subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>IGV (18%)</span>
              <span className="tabular-nums font-mono">{fmtMoney(venta.igv)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-foreground pt-1 border-t border-border/60">
              <span>Total</span>
              <span className="tabular-nums font-mono text-primary">{fmtMoney(venta.total)}</span>
            </div>
          </div>
        </div>

        {/* Pagos */}
        <div className="bg-card rounded-2xl border border-border/60 px-4 py-3">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Formas de pago</p>
          <div className="space-y-1.5">
            {venta.pagos.map((pago) => (
              <div key={pago.id} className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{METODO_LABEL[pago.metodo_pago] ?? pago.metodo_pago}</span>
                <span className="font-semibold tabular-nums font-mono">{fmtMoney(pago.monto)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
