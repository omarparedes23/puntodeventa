'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useCartStore } from '@/stores/cartStore'
import { buscarProductos, type ProductoSearchResult } from '../actions'

function fmtMoney(n: number) {
  return `S/. ${n.toFixed(2)}`
}

export function ProductSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ProductoSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const tipoVenta = useCartStore((s) => s.tipoVenta)
  const addItem = useCartStore((s) => s.addItem)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setOpen(false)
      return
    }
    setLoading(true)
    const { data } = await buscarProductos(q)
    setResults(data ?? [])
    setOpen(true)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(prod: ProductoSearchResult) {
    if (prod.stock_actual <= 0) return
    addItem({
      producto_id: prod.id,
      nombre: prod.nombre,
      codigo: prod.codigo,
      afecto_igv: prod.afecto_igv,
      permite_decimal: prod.permite_decimal,
      precio_minorista: prod.precio_minorista,
      precio_mayorista: prod.precio_mayorista,
    })
    setQuery('')
    setResults([])
    setOpen(false)
  }

  const precio = (prod: ProductoSearchResult) =>
    tipoVenta === 'mayorista' ? prod.precio_mayorista : prod.precio_minorista

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar producto por nombre o código..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoComplete="off"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
            Buscando...
          </span>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-30 w-full mt-1 bg-white border rounded-xl shadow-lg max-h-72 overflow-y-auto">
          {results.map((prod) => {
            const sinStock = prod.stock_actual <= 0
            return (
              <li key={prod.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(prod)}
                  disabled={sinStock}
                  className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition flex items-center justify-between gap-4 ${
                    sinStock ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium">{prod.nombre}</p>
                    <p className="text-xs text-gray-400">
                      {prod.codigo && <span className="mr-2">{prod.codigo}</span>}
                      Stock: {prod.stock_actual}
                      {sinStock && <span className="ml-1 text-red-500 font-medium">(Sin stock)</span>}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-semibold text-blue-700 whitespace-nowrap">
                    {fmtMoney(precio(prod))}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {open && query && results.length === 0 && !loading && (
        <div className="absolute z-30 w-full mt-1 bg-white border rounded-xl shadow-lg px-4 py-3 text-sm text-gray-400">
          No se encontraron productos.
        </div>
      )}
    </div>
  )
}
