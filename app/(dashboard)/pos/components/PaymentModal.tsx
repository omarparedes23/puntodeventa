'use client'

import { useState, useTransition } from 'react'
import Decimal from 'decimal.js'
import { useCartStore } from '@/stores/cartStore'
import { useSessionStore } from '@/stores/sessionStore'
import { createClient } from '@/lib/supabase/client'
import { searchClientesOffline, saveVentaPendiente } from '@/lib/offline/sync'
import { procesarVenta, type ClienteSearchResult } from '../actions'

const supabase = createClient()

type Metodo = 'efectivo' | 'yape' | 'tarjeta' | 'transferencia' | 'credito'
type TipoComprobante = 'ticket' | 'boleta' | 'factura'

interface PagoEntry { metodo: Metodo; monto: string }

const METODOS: { value: Metodo; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'yape', label: 'Yape' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'credito', label: 'Crédito' },
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
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Buscar cliente por nombre o DNI/RUC..."
          readOnly={!!selected}
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {selected && (
          <button onClick={clear} className="text-sm text-gray-400 hover:text-red-500 px-2">✕</button>
        )}
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => pick(c)}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
              >
                <span className="font-medium">{c.nombre}</span>
                {c.nro_documento && <span className="text-gray-400 ml-2">{c.tipo_documento}: {c.nro_documento}</span>}
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
        <div className="p-5 border-b">
          <h2 className="text-lg font-semibold">Registrar cobro</h2>
          <p className="text-sm text-gray-500">Total a cobrar: <span className="font-mono font-bold text-blue-700">{fmtMoney(total)}</span></p>
        </div>

        <div className="p-5 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          {/* Tipo comprobante */}
          <div>
            <p className="text-sm font-medium mb-2">Tipo de comprobante</p>
            <div className="grid grid-cols-3 gap-2">
              {(['ticket', 'boleta', 'factura'] as TipoComprobante[]).map((tipo) => (
                <button
                  key={tipo}
                  onClick={() => setTipoComprobante(tipo)}
                  className={`py-2 rounded-lg border text-sm font-medium capitalize transition ${
                    tipoComprobante === tipo
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {tipo}
                </button>
              ))}
            </div>
          </div>

          {/* Cliente (opcional para boleta, no aplica para ticket) */}
          {tipoComprobante !== 'ticket' && (
            <div>
              <p className="text-sm font-medium mb-2">
                Cliente <span className="text-gray-400 font-normal">(opcional)</span>
              </p>
              <ClienteSearch onSelect={(c) => setClienteId(c?.id ?? null)} />
            </div>
          )}

          {/* Métodos de pago */}
          <div>
            <p className="text-sm font-medium mb-2">Método de pago</p>
            <div className="space-y-2">
              {pagos.map((pago, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <select
                    value={pago.metodo}
                    onChange={(e) => updatePago(idx, 'metodo', e.target.value as Metodo)}
                    className="border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {METODOS.map((m) => (
                      <option key={m.value} value={m.value}
                        disabled={pagos.some((p, i) => i !== idx && p.metodo === m.value)}
                      >
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={pago.monto}
                    onChange={(e) => updatePago(idx, 'monto', e.target.value)}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                  {pagos.length > 1 && (
                    <button onClick={() => removePago(idx)} className="text-gray-300 hover:text-red-500 text-lg">×</button>
                  )}
                </div>
              ))}
            </div>

            {pagos.length < METODOS.length && (
              <button
                onClick={addPago}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700"
              >
                + Agregar método de pago
              </button>
            )}
          </div>

          {/* Resumen */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total</span>
              <span className="font-mono">{fmtMoney(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Pagado</span>
              <span className={`font-mono ${faltante.lte(0) ? 'text-green-600' : 'text-orange-600'}`}>
                {fmtMoney(totalPagado.toNumber())}
              </span>
            </div>
            {faltante.gt('0.01') && (
              <div className="flex justify-between text-red-600 font-medium">
                <span>Falta</span>
                <span className="font-mono">{fmtMoney(faltante.toNumber())}</span>
              </div>
            )}
            {vuelto.gt(0) && (
              <div className="flex justify-between text-green-700 font-semibold border-t pt-1 mt-1">
                <span>Vuelto</span>
                <span className="font-mono">{fmtMoney(vuelto.toNumber())}</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-5 border-t flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 py-2.5 border rounded-xl text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={isPending || faltante.gt('0.01')}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {isPending ? 'Procesando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}
