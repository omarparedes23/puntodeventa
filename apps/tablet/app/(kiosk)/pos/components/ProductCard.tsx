'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { ProductoSearchResult } from '../actions'

interface ProductCardProps {
  producto: ProductoSearchResult
  tipoVenta: 'minorista' | 'mayorista'
  onAdd: (producto: ProductoSearchResult) => void
  disabled?: boolean
}

function hashColorHue(name: string): number {
  const a = name.charCodeAt(0) ?? 0
  const b = name.charCodeAt(name.length - 1) ?? 0
  return ((a + b) * 7) % 360
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function ProductCard({ producto, tipoVenta, onAdd, disabled }: ProductCardProps) {
  const precio =
    tipoVenta === 'mayorista' ? producto.precio_mayorista : producto.precio_minorista
  const lowStock = producto.stock_actual > 0 && producto.stock_actual < 5
  const outOfStock = producto.stock_actual <= 0
  const [justAdded, setJustAdded] = useState(false)
  const [imgError, setImgError] = useState(false)

  const hue = hashColorHue(producto.nombre)

  function handleAdd() {
    if (disabled || outOfStock) return
    setJustAdded(true)
    onAdd(producto)
    setTimeout(() => setJustAdded(false), 400)
  }

  return (
    <div
      className={cn(
        'flex flex-col rounded-2xl border border-border/60 bg-card overflow-hidden relative',
        'shadow-sm hover:shadow-md',
        'transition-all duration-200 ease-out',
        'animate-fade-in',
        outOfStock && 'opacity-50 saturate-50',
        justAdded && 'animate-bounce-add'
      )}
    >
      {/* Image / Placeholder */}
      <div className="relative w-full aspect-[4/3] flex-shrink-0 overflow-hidden">
        {producto.foto_url && !imgError ? (
          <Image
            src={producto.foto_url}
            alt={producto.nombre}
            fill
            className="object-cover transition-transform duration-300 hover:scale-105"
            sizes="(max-width: 768px) 33vw, 25vw"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-white text-2xl font-extrabold select-none transition-transform duration-300"
            style={{
              background: `linear-gradient(135deg, oklch(0.72 0.12 ${hue}deg), oklch(0.62 0.16 ${hue + 20}deg))`,
            }}
            aria-hidden="true"
          >
            {getInitials(producto.nombre)}
          </div>
        )}

        {/* Low stock badge */}
        {lowStock && (
          <span className="absolute top-2 right-2 bg-warning text-warning-foreground text-[10px] px-2 py-0.5 rounded-full font-semibold shadow-sm">
            {producto.stock_actual} ud.
          </span>
        )}
        {outOfStock && (
          <span className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-[10px] px-2 py-0.5 rounded-full font-semibold shadow-sm">
            Sin stock
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 px-3 pt-2.5 pb-1 gap-0.5 min-h-0">
        <p className="text-[13px] font-medium text-card-foreground line-clamp-2 leading-snug flex-1 min-h-0">
          {producto.nombre}
        </p>
        <p className="text-base font-extrabold text-primary tracking-tight">
          S/ {precio.toFixed(2)}
        </p>
      </div>

      {/* Add button */}
      <button
        onClick={handleAdd}
        disabled={disabled || outOfStock}
        style={{ background: 'var(--gradient-primary)' }}
        className={cn(
          'w-full min-h-[48px] flex items-center justify-center gap-1.5',
          'text-sm font-bold text-primary-foreground',
          'hover:opacity-90 active:scale-[0.97] transition-all duration-150',
          'disabled:opacity-40 disabled:pointer-events-none',
          'touch-target'
        )}
        aria-label={`Agregar ${producto.nombre}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  )
}
