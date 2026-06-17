'use client'

import { useState, useTransition, useEffect } from 'react'
import { useCartStore } from '@marketpos/core'
import { usePosStore } from '@/stores/posStore'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ClienteModal } from './ClienteModal'
import { procesarVenta } from '../actions'
import type { ClienteSearchResult } from '../actions'
import type { TipoComprobante } from '@/stores/posStore'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import Decimal from 'decimal.js'

type MetodoPago = 'efectivo' | 'yape' | 'tarjeta' | 'transferencia'

interface PaymentSheetProps {
  open: boolean
  onClose: () => void
}

const METODOS: { key: MetodoPago; label: string; icon: React.ReactNode; selectedStyle: React.CSSProperties; selectedBorder: string; selectedBg: string }[] = [
  {
    key: 'efectivo',
    label: 'Efectivo',
    selectedStyle: { background: 'linear-gradient(135deg, oklch(0.45 0.18 155), oklch(0.50 0.16 165))' },
    selectedBorder: 'border-emerald-500',
    selectedBg: 'bg-emerald-500',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="12" x="2" y="6" rx="2" />
        <circle cx="12" cy="12" r="2" />
        <path d="M6 12h.01M18 12h.01" />
      </svg>
    ),
  },
  {
    key: 'yape',
    label: 'Yape',
    selectedStyle: { background: 'linear-gradient(135deg, oklch(0.45 0.18 300), oklch(0.50 0.16 310))' },
    selectedBorder: 'border-purple-500',
    selectedBg: 'bg-purple-500',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
        <path d="M21.2 8a10 10 0 0 0-9.2-6v8h9.2z" fill="currentColor" opacity="0.2" />
      </svg>
    ),
  },
  {
    key: 'tarjeta',
    label: 'Tarjeta',
    selectedStyle: { background: 'linear-gradient(135deg, oklch(0.50 0.18 255), oklch(0.55 0.20 265))' },
    selectedBorder: 'border-blue-500',
    selectedBg: 'bg-blue-500',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="14" x="2" y="5" rx="2" />
        <line x1="2" x2="22" y1="10" y2="10" />
      </svg>
    ),
  },
  {
    key: 'transferencia',
    label: 'Transferencia',
    selectedStyle: { background: 'linear-gradient(135deg, oklch(0.40 0.06 264), oklch(0.45 0.08 270))' },
    selectedBorder: 'border-slate-500',
    selectedBg: 'bg-slate-500',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 1l4 4-4 4" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <path d="M7 23l-4-4 4-4" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
      </svg>
    ),
  },
]

export function PaymentSheet({ open, onClose }: PaymentSheetProps) {
  const items = useCartStore((s) => s.items)
  const getTotals = useCartStore((s) => s.getTotals)
  const tipoVenta = useCartStore((s) => s.tipoVenta)
  const clearCart = useCartStore((s) => s.clear)

  const { cliente, tipoComprobante, setCliente, setTipoComprobante, resetPosState } =
    usePosStore()

  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo')
  const [montoRecibido, setMontoRecibido] = useState('')
  const [clienteModalOpen, setClienteModalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ numero_completo: string | null; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
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

  const totals = getTotals()

  const vuelto =
    metodoPago === 'efectivo' && montoRecibido
      ? new Decimal(montoRecibido || '0').minus(totals.total).toDecimalPlaces(2).toNumber()
      : null

  function handleClienteSelect(c: ClienteSearchResult | null) {
    setCliente(c)
  }

  const montoRecibidoNum = parseFloat(montoRecibido || '0')
  const efectivoInsuficiente =
    metodoPago === 'efectivo' &&
    (!montoRecibido || montoRecibidoNum < totals.total - 0.001)

  function handleCobrar() {
    setError(null)
    if (items.length === 0) {
      setError('El carrito está vacío')
      return
    }
    if (efectivoInsuficiente) {
      setError(`El monto recibido (S/ ${montoRecibidoNum.toFixed(2)}) no cubre el total`)
      return
    }

    startTransition(async () => {
      const pagos: { metodo_pago: MetodoPago; monto: number }[] = [
        { metodo_pago: metodoPago, monto: totals.total },
      ]

      const res = await procesarVenta({
        tipo_venta: tipoVenta,
        tipo_comprobante: tipoComprobante,
        cliente_id: cliente?.id ?? null,
        items: items.map((i) => ({
          producto_id: i.producto_id,
          cantidad: i.cantidad,
          descuento: i.descuento,
        })),
        pagos,
      })

      if (res.error) {
        setError(res.error)
        return
      }

      if (res.data) {
        setResult({ numero_completo: res.data.numero_completo, total: res.data.total })
        clearCart()
        resetPosState()

        setTimeout(() => {
          setResult(null)
          setError(null)
          setMontoRecibido('')
          setMetodoPago('efectivo')
          onClose()
        }, 3000)
      }
    })
  }

  function handleClose() {
    if (isPending || result) return
    setError(null)
    onClose()
  }

  if (!shouldRender) return null

  return (
    <>
      {/* Custom fullscreen overlay — no Dialog dependency */}
      <div
        className={cn(
          'fixed inset-0 z-[100] flex items-end sm:items-center justify-center',
          'transition-all duration-300',
          mounted ? 'opacity-100' : 'opacity-0'
        )}
      >
        {/* Backdrop */}
        <div
          className={cn(
            'absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity duration-300',
            mounted ? 'opacity-100' : 'opacity-0'
          )}
          onClick={handleClose}
        />

        {/* Panel */}
        <div
          className={cn(
            'relative z-10 w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-3xl',
            'bg-white flex flex-col overflow-hidden',
            'shadow-[0_-4px_40px_oklch(0_0_0/0.15)]',
            'transition-all duration-300 ease-out',
            mounted
              ? 'sm:translate-y-0 sm:scale-100 translate-y-0'
              : 'sm:translate-y-8 sm:scale-95 translate-y-full'
          )}
        >
          {result ? (
            /* ── Success screen ── */
            <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center">
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-xl animate-pop-in" style={{ background: 'var(--gradient-success)' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="animate-slide-up">
                <p className="text-2xl font-extrabold text-foreground">¡Venta registrada!</p>
                {result.numero_completo && (
                  <p className="text-lg text-muted-foreground mt-1 font-medium">{result.numero_completo}</p>
                )}
                <p className="text-4xl font-extrabold text-success mt-3 tabular-nums">
                  S/ {result.total.toFixed(2)}
                </p>
              </div>
              <p className="text-sm text-muted-foreground/60 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                Cerrando en 3 segundos...
              </p>
            </div>
          ) : (
            <>
              {/* ── Header ── */}
              <div className="header-premium px-6 py-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="14" x="2" y="5" rx="2" />
                      <line x1="2" x2="22" y1="10" y2="10" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Cobrar venta</h2>
                    <p className="text-xs text-white/70">{items.length} producto{items.length !== 1 ? 's' : ''} · {tipoVenta === 'mayorista' ? 'Mayorista' : 'Minorista'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[10px] text-white/60 uppercase tracking-wider">Total</p>
                    <p className="text-2xl font-extrabold text-white tabular-nums leading-none">S/ {totals.total.toFixed(2)}</p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors flex-shrink-0"
                    disabled={isPending}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* ── Scrollable content ── */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-thin">
                {/* Cliente */}
                <section className="animate-slide-up" style={{ animationDelay: '0.03s' }}>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Cliente</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-h-[48px] flex items-center px-4 rounded-xl border border-border/60 bg-secondary/50">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                            cliente ? 'text-white' : 'bg-muted text-muted-foreground'
                          )}
                          style={cliente ? { background: 'var(--gradient-primary)' } : undefined}
                        >
                          {cliente ? cliente.nombre.charAt(0).toUpperCase() : '?'}
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {cliente ? cliente.nombre : 'Consumidor final'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setClienteModalOpen(true)}
                      className="min-h-[48px] rounded-xl border-border/60 px-4"
                    >
                      Cambiar
                    </Button>
                  </div>
                </section>

                {/* Tipo comprobante */}
                <section className="animate-slide-up" style={{ animationDelay: '0.06s' }}>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Comprobante</p>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: 'ticket' as TipoComprobante, label: 'Ticket', desc: 'Sin datos', selectedStyle: { background: 'linear-gradient(135deg, oklch(0.40 0.03 264), oklch(0.45 0.04 270))' }, selectedBorder: 'border-slate-400', selectedBg: 'bg-slate-400' },
                      { value: 'boleta' as TipoComprobante, label: 'Boleta', desc: 'DNI', selectedStyle: { background: 'linear-gradient(135deg, oklch(0.50 0.18 255), oklch(0.55 0.20 265))' }, selectedBorder: 'border-blue-500', selectedBg: 'bg-blue-500' },
                      { value: 'factura' as TipoComprobante, label: 'Factura', desc: 'RUC', selectedStyle: { background: 'linear-gradient(135deg, oklch(0.35 0.14 280), oklch(0.40 0.16 290))' }, selectedBorder: 'border-indigo-500', selectedBg: 'bg-indigo-500' },
                    ]).map((c) => {
                      const isActive = tipoComprobante === c.value
                      return (
                        <button
                          key={c.value}
                          onClick={() => setTipoComprobante(c.value)}
                          className={cn(
                            'relative min-h-[48px] rounded-xl border-2 text-sm font-semibold transition-all duration-150',
                            isActive
                              ? `${c.selectedBorder} text-white shadow-md`
                              : 'border-border/60 bg-card text-foreground hover:bg-accent'
                          )}
                          style={isActive ? c.selectedStyle : undefined}
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            <span>{c.label}</span>
                            <span className={cn('text-[10px] font-normal', isActive ? 'text-white/70' : 'text-muted-foreground')}>{c.desc}</span>
                          </div>
                          {isActive && (
                            <div className={cn('absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow-sm', c.selectedBg)}>
                              <Check className="w-3 h-3 text-white" strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </section>

                {/* Método de pago */}
                <section className="animate-slide-up" style={{ animationDelay: '0.09s' }}>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Método de pago</p>
                  <div className="grid grid-cols-2 gap-2">
                    {METODOS.map(({ key, label, icon, selectedStyle, selectedBorder, selectedBg }) => {
                      const isActive = metodoPago === key
                      return (
                        <button
                          key={key}
                          onClick={() => setMetodoPago(key)}
                          className={cn(
                            'relative min-h-[48px] rounded-xl border-2 text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2',
                            isActive
                              ? `${selectedBorder} text-white shadow-md`
                              : 'border-border/60 bg-card text-foreground hover:bg-accent'
                          )}
                          style={isActive ? selectedStyle : undefined}
                        >
                          {icon}
                          {label}
                          {isActive && (
                            <div className={cn('absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow-sm', selectedBg)}>
                              <Check className="w-3 h-3 text-white" strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </section>

                {/* Efectivo: monto recibido + vuelto */}
                {metodoPago === 'efectivo' && (
                  <section className="animate-slide-up" style={{ animationDelay: '0.12s' }}>
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Monto recibido</p>
                    <Input
                      type="number"
                      value={montoRecibido}
                      onChange={(e) => setMontoRecibido(e.target.value)}
                      placeholder={totals.total.toFixed(2)}
                      min={totals.total}
                      step={0.10}
                      className="h-14 text-xl text-right font-bold rounded-xl"
                    />
                    {vuelto !== null && vuelto >= 0 && (
                      <div className="mt-3 flex justify-between items-center text-white rounded-xl px-4 py-3 animate-pop-in" style={{ background: 'var(--gradient-success)' }}>
                        <span className="text-sm font-semibold">Vuelto</span>
                        <span className="text-xl font-extrabold tabular-nums">S/ {vuelto.toFixed(2)}</span>
                      </div>
                    )}
                    {vuelto !== null && vuelto < 0 && (
                      <div className="mt-3 flex justify-between items-center bg-destructive/10 text-destructive rounded-xl px-4 py-3">
                        <span className="text-sm font-semibold">Falta</span>
                        <span className="text-xl font-extrabold tabular-nums">S/ {Math.abs(vuelto).toFixed(2)}</span>
                      </div>
                    )}
                  </section>
                )}

                {error && (
                  <div className="bg-destructive/10 text-destructive text-sm rounded-xl px-4 py-3 font-medium animate-slide-up">
                    {error}
                  </div>
                )}
              </div>

              {/* ── Footer ── */}
              <div className="px-6 pb-4 pt-3 border-t border-border/60 flex gap-3 flex-shrink-0 bg-background">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1 min-h-[52px] text-base rounded-xl border-border/60"
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <button
                  onClick={handleCobrar}
                  disabled={isPending || items.length === 0 || efectivoInsuficiente}
                  className={cn(
                    'flex-1 min-h-[52px] text-base font-bold rounded-xl',
                    'text-success-foreground',
                    'shadow-lg',
                    'hover:opacity-90 active:scale-[0.98] transition-all duration-150',
                    'disabled:opacity-50 disabled:pointer-events-none',
                    'touch-target flex items-center justify-center gap-2'
                  )}
                  style={{ background: 'var(--gradient-success)' }}
                >
                  {isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Procesando...
                    </span>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="12" x="2" y="6" rx="2" />
                        <circle cx="12" cy="12" r="2" />
                      </svg>
                      COBRAR S/ {totals.total.toFixed(2)}
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <ClienteModal
        open={clienteModalOpen}
        onClose={() => setClienteModalOpen(false)}
        onSelect={handleClienteSelect}
      />
    </>
  )
}
