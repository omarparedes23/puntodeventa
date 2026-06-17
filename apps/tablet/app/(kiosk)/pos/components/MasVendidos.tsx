'use client'

import { useEffect, useTransition, useState } from 'react'
import { useCartStore } from '@marketpos/core'
import { getMasVendidos, type ProductoSearchResult } from '../actions'
import { ProductCard } from './ProductCard'

export function MasVendidos() {
  const [productos, setProductos] = useState<ProductoSearchResult[]>([])
  const [isPending, startTransition] = useTransition()
  const tipoVenta = useCartStore((s) => s.tipoVenta)
  const addItem = useCartStore((s) => s.addItem)

  useEffect(() => {
    startTransition(async () => {
      const result = await getMasVendidos(12)
      if (result.data) setProductos(result.data)
    })
  }, [])

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

  if (isPending) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-md bg-muted animate-shimmer" />
          <div className="w-24 h-4 rounded-md bg-muted animate-shimmer" />
        </div>
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="min-h-[180px] rounded-2xl animate-shimmer"
            />
          ))}
        </div>
      </div>
    )
  }

  if (productos.length === 0) {
    return (
      <div className="py-12 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-muted/60 mx-auto mb-4 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/40">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-muted-foreground">Sin datos de ventas aún</p>
        <p className="text-xs text-muted-foreground/60 mt-0.5">Los productos más vendidos aparecerán aquí</p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded-md bg-warning/20 flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-warning">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>
        <p className="text-sm font-bold text-foreground">Más vendidos</p>
        <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
          {productos.length}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {productos.map((p, i) => (
          <div key={p.id} className={`animate-fade-in stagger-${Math.min(i + 1, 6)}`}>
            <ProductCard
              producto={p}
              tipoVenta={tipoVenta}
              onAdd={handleAdd}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
