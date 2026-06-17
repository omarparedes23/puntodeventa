'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useCartStore } from '@marketpos/core'
import { useSessionStore } from '@marketpos/core'
import { createClient } from '@marketpos/core'
import { searchProductosOffline } from '@/lib/offline/sync'
import type { ProductoSearchResult } from '../actions'

const supabase = createClient()

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
  const empresaId = useSessionStore((s) => s.empresa?.id)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const search = useCallback(async (q: string) => {
    if (!q.trim() || !empresaId) {
      setResults([])
      setOpen(false)
      return
    }
    setLoading(true)

    if (!navigator.onLine) {
      const local = await searchProductosOffline(empresaId, q)
      setResults(local as ProductoSearchResult[])
      setOpen(local.length > 0)
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('ptovta_productos')
      .select(`
        id, nombre, codigo,
        precio_minorista, precio_mayorista,
        stock_actual, afecto_igv,
        ptovta_unidades_medida (permite_decimal)
      `)
      .eq('empresa_id', empresaId)
      .eq('activo', true)
      .or(`nombre.ilike.%${q}%,codigo.ilike.%${q}%`)
      .order('nombre')
      .limit(20)

    if (data) {
      setResults(data.map((p: any) => ({
        id: p.id,
        nombre: p.nombre,
        codigo: p.codigo,
        precio_minorista: p.precio_minorista,
        precio_mayorista: p.precio_mayorista,
        stock_actual: p.stock_actual,
        afecto_igv: p.afecto_igv,
        permite_decimal: p.ptovta_unidades_medida?.permite_decimal ?? false,
      })))
      setOpen(true)
    }
    setLoading(false)
  }, [empresaId])

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
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar producto por nombre o código..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          autoComplete="off"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
            Buscando...
          </span>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-30 w-full mt-1 bg-background border rounded-xl shadow-lg max-h-72 overflow-y-auto">
          {results.map((prod) => {
            const sinStock = prod.stock_actual <= 0
            return (
              <li key={prod.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(prod)}
                  disabled={sinStock}
                  className={`w-full text-left px-4 py-3 hover:bg-accent transition flex items-center justify-between gap-4 ${
                    sinStock ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium">{prod.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {prod.codigo && <span className="mr-2">{prod.codigo}</span>}
                      Stock: {prod.stock_actual}
                      {sinStock && <span className="ml-1 text-destructive font-medium">(Sin stock)</span>}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-semibold text-primary whitespace-nowrap">
                    {fmtMoney(precio(prod))}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {open && query && results.length === 0 && !loading && (
        <div className="absolute z-30 w-full mt-1 bg-background border rounded-xl shadow-lg px-4 py-3 text-sm text-muted-foreground">
          No se encontraron productos.
        </div>
      )}
    </div>
  )
}
