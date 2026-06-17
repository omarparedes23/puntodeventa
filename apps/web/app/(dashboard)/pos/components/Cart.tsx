'use client'

import { useState, useEffect } from 'react'
import { useCartStore } from '@marketpos/core'
import { useSessionStore } from '@marketpos/core'

function fmtMoney(n: number) {
  return `S/. ${n.toFixed(2)}`
}

function CantidadInput({
  productoId,
  cantidad,
  permiteDecimal,
  onCommit,
}: {
  productoId: string
  cantidad: number
  permiteDecimal: boolean
  onCommit: (v: number) => void
}) {
  const [raw, setRaw] = useState(String(cantidad))

  // Sincronizar si el store cambia desde afuera (ej: mismo producto agregado dos veces)
  useEffect(() => {
    setRaw(String(cantidad))
  }, [cantidad])

  function commit(value: string) {
    const v = permiteDecimal ? parseFloat(value) : parseInt(value, 10)
    if (!isNaN(v) && v > 0) {
      onCommit(v)
      setRaw(String(v))
    } else {
      setRaw(String(cantidad)) // revertir si inválido
    }
  }

  return (
    <input
      type="number"
      min={permiteDecimal ? '0.001' : '1'}
      step={permiteDecimal ? '0.001' : '1'}
      value={raw}
      onChange={(e) => setRaw(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && commit(raw)}
      onFocus={(e) => e.target.select()}
      className="w-full border rounded-lg px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
    />
  )
}

export function Cart({ onCobrar }: { onCobrar: () => void }) {
  const items = useCartStore((s) => s.items)
  const updateCantidad = useCartStore((s) => s.updateCantidad)
  const updateDescuento = useCartStore((s) => s.updateDescuento)
  const removeItem = useCartStore((s) => s.removeItem)
  const clear = useCartStore((s) => s.clear)
  const getTotals = useCartStore((s) => s.getTotals)
  const rol = useSessionStore((s) => s.perfil?.rol)

  const { subtotal, igv, total, descuento_total } = getTotals()
  const MAX_DESC_PCT = rol === 'vendedor' ? 10 : 100

  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm py-16">
        Busca un producto para agregar al ticket
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header carrito */}
      <div className="px-6 py-4 border-b border-border bg-muted flex items-center justify-between shrink-0">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Ticket de Venta</h2>
        <div className="flex items-center gap-4">
          <span className="text-xs font-medium text-muted-foreground bg-background px-2 py-1 rounded-md border shadow-sm">{items.length} item{items.length !== 1 ? 's' : ''}</span>
          <button
            onClick={clear}
            className="text-xs text-red-500 hover:text-red-700 font-medium transition"
          >
            Vaciar
          </button>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        <ul className="divide-y">
          {items.map((item) => {
            const maxDescuento = (item.precio_unitario * item.cantidad * MAX_DESC_PCT) / 100

            return (
              <li key={item.producto_id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.nombre}</p>
                    {item.codigo && (
                      <p className="text-xs text-muted-foreground">{item.codigo}</p>
                    )}
                  </div>
                  <button
                    onClick={() => removeItem(item.producto_id)}
                    className="text-muted-foreground hover:text-red-600 hover:bg-red-50 transition rounded-lg p-1 flex-shrink-0"
                    aria-label="Eliminar"
                    title="Eliminar del carrito"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2 items-center">
                  {/* Cantidad */}
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Cantidad</label>
                    <CantidadInput
                      productoId={item.producto_id}
                      cantidad={item.cantidad}
                      permiteDecimal={item.permite_decimal}
                      onCommit={(v) => updateCantidad(item.producto_id, v)}
                    />
                  </div>

                  {/* Descuento */}
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      Dto. S/. {rol === 'vendedor' && <span className="text-orange-500">(max {MAX_DESC_PCT}%)</span>}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      max={maxDescuento}
                      value={item.descuento}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value)
                        if (!isNaN(v) && v >= 0) updateDescuento(item.producto_id, Math.min(v, maxDescuento))
                      }}
                      className="w-full border rounded-lg px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  {/* Subtotal */}
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-1">Total línea</p>
                    <p className="text-sm font-mono font-semibold">{fmtMoney(item.line_total)}</p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-1">
                  {fmtMoney(item.precio_unitario)} × {item.cantidad}
                  {item.descuento > 0 && <span className="text-orange-600"> − {fmtMoney(item.descuento)}</span>}
                </p>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Totales */}
      <div className="border-t bg-muted px-4 py-3 space-y-1 text-sm">
        {descuento_total > 0 && (
          <div className="flex justify-between text-orange-600">
            <span>Descuento</span>
            <span className="font-mono">− {fmtMoney(descuento_total)}</span>
          </div>
        )}
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal (sin IGV)</span>
          <span className="font-mono">{fmtMoney(subtotal)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>IGV (18%)</span>
          <span className="font-mono">{fmtMoney(igv)}</span>
        </div>
        <div className="flex justify-between font-bold text-base pt-1 border-t">
          <span>Total</span>
          <span className="font-mono text-primary">{fmtMoney(total)}</span>
        </div>
      </div>

      {/* Botón cobrar */}
      <div className="px-4 pb-4 pt-3">
        <button
          onClick={onCobrar}
          className="w-full bg-success hover:bg-success/90 text-success-foreground font-semibold py-3.5 rounded-xl transition text-base"
        >
          Cobrar {fmtMoney(total)}
        </button>
      </div>
    </div>
  )
}
