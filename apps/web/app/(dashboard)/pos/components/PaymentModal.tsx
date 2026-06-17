'use client'

import { useState, useTransition } from 'react'
import Decimal from 'decimal.js'
import { useCartStore } from '@marketpos/core'
import { useSessionStore } from '@marketpos/core'
import { createClient } from '@marketpos/core'
import { searchClientesOffline, saveVentaPendiente } from '@/lib/offline/sync'
import { procesarVenta, type ClienteSearchResult } from '../actions'

const supabase = createClient()

type Metodo = 'efectivo' | 'yape' | 'tarjeta' | 'transferencia' | 'credito'
type TipoComprobante = 'ticket' | 'boleta' | 'factura'

interface PagoEntry { metodo: Metodo; monto: string }

import { Banknote, Smartphone, CreditCard, Landmark, Receipt, Check } from 'lucide-react'

type MetodoIcon = React.ComponentType<{ className?: string }>

const METODOS: { value: Metodo; label: string; Icon: MetodoIcon; color: string; bg: string; ring: string }[] = [
  { value: 'efectivo', label: 'Efectivo', Icon: Banknote, color: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'ring-emerald-500' },
  { value: 'yape', label: 'Yape', Icon: Smartphone, color: 'text-purple-700', bg: 'bg-purple-50', ring: 'ring-purple-500' },
  { value: 'tarjeta', label: 'Tarjeta', Icon: CreditCard, color: 'text-blue-700', bg: 'bg-blue-50', ring: 'ring-blue-500' },
  { value: 'transferencia', label: 'Transferencia', Icon: Landmark, color: 'text-slate-700', bg: 'bg-slate-50', ring: 'ring-slate-500' },
  { value: 'credito', label: 'Crédito', Icon: Receipt, color: 'text-amber-700', bg: 'bg-amber-50', ring: 'ring-amber-500' },
]

const COMPROBANTES: { value: TipoComprobante; label: string; desc: string; color: string; bg: string; border: string; selectedBg: string }[] = [
  { value: 'ticket', label: 'Ticket', desc: 'Sin datos', color: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-400', selectedBg: 'bg-slate-400' },
  { value: 'boleta', label: 'Boleta', desc: 'DNI', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-500', selectedBg: 'bg-blue-500' },
  { value: 'factura', label: 'Factura', desc: 'RUC', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-500', selectedBg: 'bg-indigo-500' },
]

function fmtMoney(n: number) { return `S/. ${n.toFixed(2)}` }

function ClienteSearch({ onSelect }: { onSelect: (c: ClienteSearchResult | null) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ClienteSearchResult[]>([])
  const [selected, setSelected] = useState<ClienteSearchResult | null>(null)
  const [open, setOpen] = useState(false)
  const empresaId = useSessionStore((s) => s.empresa?.id)

  async function handleChange(q: string) {
    setQuery(q)
    if (!selected) {
      if (q.length >= 2 && empresaId) {
        if (!navigator.onLine) {
          const local = await searchClientesOffline(empresaId, q)
          setResults(local as ClienteSearchResult[])
          setOpen(local.length > 0)
          return
        }
        const { data } = await supabase
          .from('ptovta_clientes')
          .select('id, nombre, tipo_documento, nro_documento, tipo_cliente')
          .eq('empresa_id', empresaId)
          .eq('activo', true)
          .or(`nombre.ilike.%${q}%,nro_documento.ilike.%${q}%`)
          .order('nombre')
          .limit(10)
        setResults((data as ClienteSearchResult[]) ?? [])
        setOpen(true)
      } else {
        setResults([])
        setOpen(false)
      }
    }
  }

  function pick(c: ClienteSearchResult) {
    setSelected(c)
    setQuery(c.nombre)
    setOpen(false)
    onSelect(c)
  }

  function clear() {
    setSelected(null)
    setQuery('')
    setResults([])
    onSelect(null)
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Buscar por nombre o DNI/RUC..."
            readOnly={!!selected}
            className="w-full border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
          />
        </div>
        {selected && (
          <button onClick={clear} className="text-muted-foreground hover:text-destructive px-2 rounded-lg hover:bg-destructive/10 transition" title="Limpiar">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1.5 bg-popover border border-border rounded-xl shadow-xl max-h-44 overflow-y-auto">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => pick(c)}
                className="w-full text-left px-4 py-2.5 hover:bg-accent text-sm transition"
              >
                <span className="font-medium text-foreground">{c.nombre}</span>
                {c.nro_documento && (
                  <span className="text-muted-foreground ml-2 text-xs">{c.tipo_documento}: {c.nro_documento}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function PaymentModal({
  total,
  onClose,
  onSuccess,
}: {
  total: number
  onClose: () => void
  onSuccess: (resultado: { id: string; numero_completo: string | null; total: number; tipo_comprobante: string; pendiente?: boolean }) => void
}) {
  const [tipoComprobante, setTipoComprobante] = useState<TipoComprobante>('ticket')
  const [pagos, setPagos] = useState<PagoEntry[]>([{ metodo: 'efectivo', monto: total.toFixed(2) }])
  const [clienteId, setClienteId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const items = useCartStore((s) => s.items)
  const tipoVenta = useCartStore((s) => s.tipoVenta)
  const clear = useCartStore((s) => s.clear)
  const empresaId = useSessionStore((s) => s.empresa?.id)

  const totalPagado = pagos.reduce((acc, p) => {
    try { return acc.plus(new Decimal(p.monto || '0')) } catch { return acc }
  }, new Decimal(0))

  const totalEfectivo = pagos
    .filter((p) => p.metodo === 'efectivo')
    .reduce((acc, p) => {
      try { return acc.plus(new Decimal(p.monto || '0')) } catch { return acc }
    }, new Decimal(0))

  const vuelto = totalEfectivo.minus(
    new Decimal(total).minus(
      pagos.filter((p) => p.metodo !== 'efectivo').reduce(
        (acc, p) => { try { return acc.plus(new Decimal(p.monto || '0')) } catch { return acc } },
        new Decimal(0)
      )
    )
  )

  const faltante = new Decimal(total).minus(totalPagado)

  function addPago() {
    const usedMetodos = pagos.map((p) => p.metodo)
    const available = METODOS.find((m) => !usedMetodos.includes(m.value))
    if (available) {
      setPagos([...pagos, { metodo: available.value, monto: '' }])
    }
  }

  function updatePago(idx: number, field: 'metodo' | 'monto', value: string) {
    setPagos(pagos.map((p, i) => i === idx ? { ...p, [field]: value } : p))
  }

  function removePago(idx: number) {
    if (pagos.length === 1) return
    setPagos(pagos.filter((_, i) => i !== idx))
  }

  function handleConfirmar() {
    setError(null)

    if (faltante.gt('0.01')) {
      setError(`Falta cubrir ${fmtMoney(faltante.toNumber())}`)
      return
    }

    const ventaPayload = {
      tipo_venta: tipoVenta,
      tipo_comprobante: tipoComprobante,
      cliente_id: clienteId ?? undefined,
      items: items.map((i) => ({
        producto_id: i.producto_id,
        cantidad: i.cantidad,
        descuento: i.descuento,
      })),
      pagos: pagos
        .filter((p) => p.monto && parseFloat(p.monto) > 0)
        .map((p) => ({ metodo_pago: p.metodo, monto: p.monto })),
    }

    if (!navigator.onLine && empresaId) {
      saveVentaPendiente(empresaId, ventaPayload).then(() => {
        clear()
        onSuccess({
          id: crypto.randomUUID(),
          numero_completo: null,
          total,
          tipo_comprobante: tipoComprobante,
          pendiente: true,
        })
      })
      return
    }

    startTransition(async () => {
      const res = await procesarVenta(ventaPayload)

      if (res.error) {
        setError(res.error)
        return
      }

      clear()
      onSuccess({ ...res.data!, pendiente: false })
    })
  }

  const isPaid = faltante.lte(0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-hidden flex flex-col border border-border">
        {/* ─── Header ─── */}
        <div className="px-6 py-5 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">Cobrar venta</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {items.length} producto{items.length !== 1 ? 's' : ''} · {tipoVenta === 'mayorista' ? 'Mayorista' : 'Minorista'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-background/80 text-muted-foreground hover:text-foreground transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ─── Content ─── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {error && (
            <div className="flex items-center gap-2.5 p-3 bg-destructive/10 text-destructive rounded-xl text-sm font-medium">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              {error}
            </div>
          )}

          {/* ─── Tipo comprobante ─── */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2.5">Comprobante</label>
            <div className="grid grid-cols-3 gap-2">
              {COMPROBANTES.map((c) => {
                const isActive = tipoComprobante === c.value
                return (
                  <button
                    key={c.value}
                    onClick={() => setTipoComprobante(c.value)}
                    className={`relative py-3 rounded-xl border-2 text-center transition-all duration-150 ${
                      isActive
                        ? `${c.border} ${c.bg} ${c.color} shadow-sm`
                        : 'border-border hover:border-muted-foreground/30 bg-background text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    <div className={`text-sm font-semibold ${isActive ? c.color : ''}`}>{c.label}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{c.desc}</div>
                    {isActive && (
                      <div className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full ${c.selectedBg} flex items-center justify-center`}>
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ─── Cliente ─── */}
          {tipoComprobante !== 'ticket' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2.5">
                Cliente <span className="text-muted-foreground/60 font-normal normal-case">(opcional para boleta)</span>
              </label>
              <ClienteSearch onSelect={(c) => setClienteId(c?.id ?? null)} />
            </div>
          )}

          {/* ─── Métodos de pago ─── */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2.5">Método de pago</label>
            <div className="space-y-3">
              {pagos.map((pago, idx) => {
                return (
                  <div key={idx} className="bg-muted/40 rounded-xl p-3 space-y-2.5">
                    {/* Selector de método — chips */}
                    <div className="flex gap-1.5 flex-wrap">
                      {METODOS.map((m) => {
                        const isSelected = pago.metodo === m.value
                        const isUsed = pagos.some((p, i) => i !== idx && p.metodo === m.value)
                        return (
                          <button
                            key={m.value}
                            type="button"
                            onClick={() => updatePago(idx, 'metodo', m.value)}
                            disabled={isUsed}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                              isSelected
                                ? `${m.bg} ${m.color} ring-1 ${m.ring}/30 shadow-sm`
                                : isUsed
                                  ? 'bg-background/50 text-muted-foreground/40 cursor-not-allowed'
                                  : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <m.Icon className="w-3.5 h-3.5" />
                            <span>{m.label}</span>
                          </button>
                        )
                      })}
                    </div>

                    {/* Input monto + eliminar */}
                    <div className="flex gap-2 items-center">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">S/.</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={pago.monto}
                          onChange={(e) => updatePago(idx, 'monto', e.target.value)}
                          className="w-full bg-background border border-border rounded-xl pl-10 pr-3 py-2.5 text-sm font-mono font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                          placeholder="0.00"
                        />
                      </div>
                      {pagos.length > 1 && (
                        <button
                          onClick={() => removePago(idx)}
                          className="p-2.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                          title="Eliminar método"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {pagos.length < METODOS.length && (
              <button
                onClick={addPago}
                className="mt-3 flex items-center gap-1.5 text-sm text-primary font-medium hover:text-primary/80 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Agregar método de pago
              </button>
            )}
          </div>

          {/* ─── Resumen ─── */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-sm border border-border/50">
            <div className="flex justify-between text-muted-foreground">
              <span>Total</span>
              <span className="font-mono font-medium text-foreground">{fmtMoney(total)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Pagado</span>
              <span className={`font-mono font-medium ${isPaid ? 'text-success' : 'text-amber-600'}`}>
                {fmtMoney(totalPagado.toNumber())}
              </span>
            </div>
            {faltante.gt('0.01') && (
              <div className="flex justify-between text-destructive font-medium">
                <span>Falta</span>
                <span className="font-mono">{fmtMoney(faltante.toNumber())}</span>
              </div>
            )}
            {vuelto.gt(0) && (
              <div className="flex justify-between text-success font-semibold border-t border-border/50 pt-2 mt-1">
                <span>Vuelto</span>
                <span className="font-mono">{fmtMoney(vuelto.toNumber())}</span>
              </div>
            )}
          </div>
        </div>

        {/* ─── Footer ─── */}
        <div className="px-6 py-4 border-t border-border bg-muted/30 shrink-0">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 py-3 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmar}
              disabled={isPending || faltante.gt('0.01')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-150 disabled:opacity-50 ${
                isPaid
                  ? 'bg-success hover:bg-success/90 text-success-foreground shadow-lg shadow-success/20'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20'
              }`}
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Procesando...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  COBRAR {fmtMoney(total)}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
