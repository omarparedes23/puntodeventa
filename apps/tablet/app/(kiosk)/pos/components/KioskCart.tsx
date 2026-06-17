'use client'

import { useState } from 'react'
import { useCartStore } from '@marketpos/core'
import { cn } from '@/lib/utils'
import { PaymentSheet } from './PaymentSheet'

export function KioskCart() {
  const items = useCartStore((s) => s.items)
  const updateCantidad = useCartStore((s) => s.updateCantidad)
  const removeItem = useCartStore((s) => s.removeItem)
  const clear = useCartStore((s) => s.clear)
  const getTotals = useCartStore((s) => s.getTotals)
  const [paymentOpen, setPaymentOpen] = useState(false)

  const totals = getTotals()
  const itemCount = items.reduce((acc, i) => acc + i.cantidad, 0)

  return (
    <>
      <div className="flex flex-col h-full surface-cart border-l border-border/40">
        {/* Header — Premium gradient */}
        <div className="relative overflow-hidden">
          <div className="header-premium px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-sm">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="8" cy="21" r="1" />
                    <circle cx="19" cy="21" r="1" />
                    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                  </svg>
                </div>
                <div>
                  <span className="font-bold text-[15px] text-white tracking-wide">Carrito</span>
                  {itemCount > 0 && (
                    <span className="ml-2 text-[11px] bg-white/25 backdrop-blur-sm text-white px-2 py-0.5 rounded-full font-semibold">
                      {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </span>
                  )}
                </div>
              </div>
              {items.length > 0 && (
                <button
                  onClick={clear}
                  className="text-xs text-white/70 hover:text-white font-medium transition-colors touch-target px-3 py-1.5 rounded-lg hover:bg-white/15"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Items */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/35">
              <circle cx="8" cy="21" r="1" />
              <circle cx="19" cy="21" r="1" />
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
            </svg>
            <p className="text-sm text-muted-foreground/50">Carrito vacío</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto scrollbar-thin px-3 pt-3 pb-2">
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={item.producto_id}
                  className="bg-white rounded-xl px-4 py-3 border border-border/30 shadow-sm animate-cart-item-in"
                  style={{ animationDelay: `${idx * 0.03}s` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-foreground line-clamp-2 leading-snug">
                        {item.nombre}
                      </p>
                      <p className="text-[11px] text-muted-foreground/70 tabular-nums mt-0.5">
                        S/ {item.precio_unitario.toFixed(2)} c/u
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(item.producto_id)}
                      className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl hover:bg-destructive/10 active:scale-90"
                      aria-label="Eliminar"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          item.cantidad > 1
                            ? updateCantidad(item.producto_id, item.cantidad - 1)
                            : removeItem(item.producto_id)
                        }
                        className="w-10 h-10 rounded-xl bg-primary/8 text-primary flex items-center justify-center text-lg font-bold hover:bg-primary/15 active:scale-90 transition-all"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={item.cantidad}
                        min={1}
                        step={item.permite_decimal ? 0.1 : 1}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value)
                          if (val > 0) updateCantidad(item.producto_id, val)
                        }}
                        className={cn(
                          'w-14 h-10 text-center text-sm font-bold border border-border/50 rounded-xl bg-secondary/50',
                          'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all'
                        )}
                      />
                      <button
                        onClick={() => updateCantidad(item.producto_id, item.cantidad + 1)}
                        className="w-10 h-10 rounded-xl bg-primary/8 text-primary flex items-center justify-center text-lg font-bold hover:bg-primary/15 active:scale-90 transition-all"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-[15px] font-extrabold text-foreground tabular-nums">
                      S/ {item.line_total.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer — Totals + COBRAR button */}
        {items.length > 0 && (
          <div className="border-t border-border/40 px-5 py-4 space-y-3 bg-card">
            {/* Summary rows */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums font-medium">S/ {totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>IGV (18%)</span>
                <span className="tabular-nums font-medium">S/ {totals.igv.toFixed(2)}</span>
              </div>
              {totals.descuento_total > 0 && (
                <div className="flex justify-between text-xs font-semibold text-emerald-600">
                  <span>Descuento</span>
                  <span className="tabular-nums">− S/ {totals.descuento_total.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Total */}
            <div className="flex justify-between items-baseline pt-2 border-t border-border/50">
              <span className="text-sm font-bold text-foreground tracking-wide">TOTAL</span>
              <span className="text-2xl font-extrabold text-foreground tabular-nums tracking-tight">
                S/ {totals.total.toFixed(2)}
              </span>
            </div>

            {/* COBRAR — Large prominent gradient button */}
            <button
              onClick={() => setPaymentOpen(true)}
              className={cn(
                'w-full min-h-[68px] text-lg font-extrabold rounded-2xl',
                'text-white tracking-wide',
                'hover:brightness-110 active:scale-[0.97] transition-all duration-150',
                'touch-target flex items-center justify-center gap-2.5'
              )}
              style={{
                background: 'var(--cobrar-gradient)',
                boxShadow: 'var(--cobrar-shadow)',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
              </svg>
              COBRAR S/ {totals.total.toFixed(2)}
            </button>
          </div>
        )}
      </div>

      <PaymentSheet open={paymentOpen} onClose={() => setPaymentOpen(false)} />
    </>
  )
}
