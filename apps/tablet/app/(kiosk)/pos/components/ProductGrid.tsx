'use client'

import { useState, useEffect, useRef } from 'react'
import { useCartStore } from '@marketpos/core'
import { Input } from '@/components/ui/input'
import { ProductCard } from './ProductCard'
import { MasVendidos } from './MasVendidos'
import { CategoryBar } from './CategoryBar'
import { buscarProductos, getProductosByCategory } from '../actions'
import type { ProductoSearchResult } from '../actions'

export function ProductGrid() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ProductoSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tipoVenta = useCartStore((s) => s.tipoVenta)
  const addItem = useCartStore((s) => s.addItem)

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.trim()) {
      debounceRef.current = setTimeout(async () => {
        setLoading(true)
        try {
          const { data } = await buscarProductos(query, selectedCategory)
          setResults(data ?? [])
        } finally {
          setLoading(false)
        }
      }, 300)
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
      }
    }

    if (selectedCategory) {
      setLoading(true)
      getProductosByCategory(selectedCategory).then(({ data }) => {
        setResults(data ?? [])
        setLoading(false)
      })
      return
    }

    setResults([])
    setLoading(false)
  }, [query, selectedCategory])

  function handleCategorySelect(id: string | null) {
    setSelectedCategory(id)
    setQuery('')
  }

  function handleAdd(producto: ProductoSearchResult) {
    addItem({
      producto_id: producto.id,
      nombre: producto.nombre,
      codigo: producto.codigo,
      afecto_igv: producto.afecto_igv,
      permite_decimal: producto.permite_decimal,
      precio_minorista: producto.precio_minorista,
      precio_mayorista: producto.precio_mayorista,
    })
  }

  const showMasVendidos = !query.trim() && !selectedCategory

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <CategoryBar selectedId={selectedCategory} onSelect={handleCategorySelect} />

      <div className="px-4 pt-2 pb-2">
        <div className="relative">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar producto por nombre o código..."
            className="h-14 text-lg pl-11 pr-4 rounded-xl border-border/60 bg-card focus:shadow-md transition-shadow duration-200"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-thin">
        {showMasVendidos ? (
          <MasVendidos />
        ) : loading ? (
          <div className="grid grid-cols-3 lg:grid-cols-4 gap-3 mt-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="min-h-[180px] rounded-2xl animate-shimmer" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="py-16 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/50">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {selectedCategory ? 'No hay productos en esta categoría' : 'No se encontraron productos'}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {query.trim() ? `para "${query}"` : 'prueba con otra categoría o búsqueda'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 lg:grid-cols-4 gap-3 mt-2">
            {results.map((p) => (
              <ProductCard
                key={p.id}
                producto={p}
                tipoVenta={tipoVenta}
                onAdd={handleAdd}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
