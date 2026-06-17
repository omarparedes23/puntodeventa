'use client'

import { useState, useTransition, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Decimal from 'decimal.js'
import {
  registrarCompra,
  buscarProductosParaCompra,
  buscarProveedores,
  type ProductoParaCompra,
} from '../actions'

interface ItemLocal {
  producto_id: string
  nombre: string
  codigo: string | null
  cantidad: number
  precio_unitario: number
  subtotal: number
}

function fmtMoney(n: number) { return `S/. ${n.toFixed(2)}` }

function recalcSubtotal(cantidad: number, precio: number): number {
  return new Decimal(cantidad).times(precio).toDecimalPlaces(2).toNumber()
}

// ---- Buscador de proveedor ----
function ProveedorSearch({ onSelect }: { onSelect: (id: string | null, nombre: string) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ id: string; nombre: string; ruc: string | null }[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleChange(q: string) {
    setQuery(q)
    if (!selected && q.length >= 2) {
      const { data } = await buscarProveedores(q)
      setResults(data ?? [])
      setOpen(true)
    }
  }

  function pick(p: { id: string; nombre: string; ruc: string | null }) {
    setSelected(p.id)
    setQuery(p.nombre)
    setOpen(false)
    onSelect(p.id, p.nombre)
  }

  function clear() {
    setSelected(null)
    setQuery('')
    setResults([])
    onSelect(null, '')
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          readOnly={!!selected}
          placeholder="Buscar proveedor (opcional)..."
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {selected && (
          <button type="button" onClick={clear} className="text-gray-400 hover:text-red-500 px-2">✕</button>
        )}
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {results.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => pick(p)}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm">
                <span className="font-medium">{p.nombre}</span>
                {p.ruc && <span className="text-gray-400 ml-2">RUC: {p.ruc}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ---- Buscador de productos ----
function ProductoSearch({ onAdd }: { onAdd: (p: ProductoParaCompra) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ProductoParaCompra[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return }
    setLoading(true)
    const { data } = await buscarProductosParaCompra(q)
    setResults(data ?? [])
    setOpen(true)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(prod: ProductoParaCompra) {
    onAdd(prod)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar producto por nombre o código..."
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {loading && <span className="absolute right-3 top-2.5 text-xs text-gray-400">Buscando...</span>}

      {open && results.length > 0 && (
        <ul className="absolute z-20 w-full mt-1 bg-white border rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {results.map((prod) => (
            <li key={prod.id}>
              <button type="button" onClick={() => handleSelect(prod)}
                className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-sm flex justify-between gap-4">
                <div>
                  <p className="font-medium">{prod.nombre}</p>
                  <p className="text-xs text-gray-400">
                    {prod.codigo && <span className="mr-2">{prod.codigo}</span>}
                    Stock: {prod.stock_actual}
                  </p>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  Últ. compra: {fmtMoney(prod.precio_compra)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && query && results.length === 0 && !loading && (
        <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow px-4 py-3 text-sm text-gray-400">
          No se encontraron productos.
        </div>
      )}
    </div>
  )
}

// ---- Formulario principal ----
export function NuevaCompraForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [proveedorId, setProveedorId] = useState<string | null>(null)
  const [nroDoc, setNroDoc] = useState('')
  const [fechaCompra, setFechaCompra] = useState(new Date().toISOString().split('T')[0])
  const [notas, setNotas] = useState('')
  const [items, setItems] = useState<ItemLocal[]>([])

  function handleAddProducto(prod: ProductoParaCompra) {
    setItems((prev) => {
      const existing = prev.find((i) => i.producto_id === prod.id)
      if (existing) {
        return prev.map((i) =>
          i.producto_id === prod.id
            ? { ...i, cantidad: i.cantidad + 1, subtotal: recalcSubtotal(i.cantidad + 1, i.precio_unitario) }
            : i
        )
      }
      return [
        ...prev,
        {
          producto_id: prod.id,
          nombre: prod.nombre,
          codigo: prod.codigo,
          cantidad: 1,
          precio_unitario: prod.precio_compra || 0,
          subtotal: prod.precio_compra || 0,
        },
      ]
    })
  }

  function updateItem(idx: number, field: 'cantidad' | 'precio_unitario', val: number) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item
        const next = { ...item, [field]: val }
        next.subtotal = recalcSubtotal(next.cantidad, next.precio_unitario)
        return next
      })
    )
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  const total = items.reduce((acc, i) => acc + i.subtotal, 0)

  function handleSubmit() {
    setError(null)
    if (items.length === 0) { setError('Agrega al menos un producto'); return }

    startTransition(async () => {
      const res = await registrarCompra({
        proveedor_id: proveedorId,
        nro_documento: nroDoc || null,
        fecha_compra: fechaCompra,
        items: items.map((i) => ({
          producto_id: i.producto_id,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
        })),
        notas: notas || null,
      })

      if (res.error) {
        setError(res.error)
        return
      }

      router.push(`/compras/${res.data!.id}`)
    })
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
        <h1 className="text-lg font-semibold">Nueva Compra</h1>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {/* Datos generales */}
      <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
        <h2 className="text-sm font-medium text-gray-700">Datos de la compra</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fecha</label>
            <input
              type="date"
              value={fechaCompra}
              onChange={(e) => setFechaCompra(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">N° Documento proveedor</label>
            <input
              type="text"
              value={nroDoc}
              onChange={(e) => setNroDoc(e.target.value)}
              placeholder="Ej: F001-00012345"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Proveedor</label>
          <ProveedorSearch onSelect={(id) => setProveedorId(id)} />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Notas</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
            placeholder="Observaciones..."
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Productos */}
      <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
        <h2 className="text-sm font-medium text-gray-700">Productos</h2>
        <ProductoSearch onAdd={handleAddProducto} />

        {items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b">
                  <th className="text-left py-2 font-medium">Producto</th>
                  <th className="text-center py-2 font-medium w-24">Cantidad</th>
                  <th className="text-center py-2 font-medium w-32">P. Compra (S/.)</th>
                  <th className="text-right py-2 font-medium w-28">Subtotal</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item, idx) => (
                  <tr key={item.producto_id}>
                    <td className="py-2.5">
                      <p className="font-medium">{item.nombre}</p>
                      {item.codigo && <p className="text-xs text-gray-400">{item.codigo}</p>}
                    </td>
                    <td className="py-2.5 px-2">
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={item.cantidad}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value)
                          if (!isNaN(v) && v > 0) updateItem(idx, 'cantidad', v)
                        }}
                        className="w-full border rounded px-2 py-1 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-2.5 px-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.precio_unitario}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value)
                          if (!isNaN(v) && v >= 0) updateItem(idx, 'precio_unitario', v)
                        }}
                        className="w-full border rounded px-2 py-1 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-2.5 text-right font-mono font-semibold">
                      {fmtMoney(item.subtotal)}
                    </td>
                    <td className="py-2.5 pl-2">
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-gray-300 hover:text-red-500 text-lg leading-none"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t">
                  <td colSpan={3} className="pt-3 text-right font-semibold text-sm pr-2">Total:</td>
                  <td className="pt-3 text-right font-mono font-bold text-blue-700">{fmtMoney(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {items.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-4">
            Busca productos para agregar a la compra
          </p>
        )}
      </div>

      {/* Acciones */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isPending}
          className="px-5 py-2.5 border rounded-xl text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || items.length === 0}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
        >
          {isPending ? 'Registrando...' : `Registrar compra · ${fmtMoney(total)}`}
        </button>
      </div>
    </div>
  )
}
