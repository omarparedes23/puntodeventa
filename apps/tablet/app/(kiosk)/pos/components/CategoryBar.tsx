'use client'

import { useEffect, useState, useTransition } from 'react'
import { getCategorias, type CategoriaResult } from '../actions'

// Deterministic color palette for categories
const CATEGORY_COLORS = [
  { bg: 'oklch(0.93 0.08 255)', text: 'oklch(0.30 0.14 255)', border: 'oklch(0.85 0.10 255)' },
  { bg: 'oklch(0.93 0.08 155)', text: 'oklch(0.30 0.14 155)', border: 'oklch(0.85 0.10 155)' },
  { bg: 'oklch(0.93 0.08 30)', text: 'oklch(0.35 0.14 30)', border: 'oklch(0.85 0.10 30)' },
  { bg: 'oklch(0.93 0.08 330)', text: 'oklch(0.32 0.14 330)', border: 'oklch(0.85 0.10 330)' },
  { bg: 'oklch(0.93 0.08 75)', text: 'oklch(0.30 0.12 75)', border: 'oklch(0.85 0.10 75)' },
  { bg: 'oklch(0.93 0.08 200)', text: 'oklch(0.30 0.14 200)', border: 'oklch(0.85 0.10 200)' },
  { bg: 'oklch(0.93 0.08 130)', text: 'oklch(0.30 0.14 130)', border: 'oklch(0.85 0.10 130)' },
  { bg: 'oklch(0.93 0.08 290)', text: 'oklch(0.32 0.14 290)', border: 'oklch(0.85 0.10 290)' },
]

function getCategoryColor(name: string): typeof CATEGORY_COLORS[number] {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0
  }
  return CATEGORY_COLORS[Math.abs(hash) % CATEGORY_COLORS.length]
}

interface CategoryBarProps {
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function CategoryBar({ selectedId, onSelect }: CategoryBarProps) {
  const [categorias, setCategorias] = useState<CategoriaResult[]>([])
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      const result = await getCategorias()
      if (result.data) setCategorias(result.data)
    })
  }, [])

  if (isPending && categorias.length === 0) {
    return (
      <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-thin">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 w-20 rounded-xl animate-shimmer flex-shrink-0" />
        ))}
      </div>
    )
  }

  if (categorias.length === 0) return null

  return (
    <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-thin flex-shrink-0">
      {/* "Todos" chip */}
      <button
        onClick={() => onSelect(null)}
        className="touch-target flex-shrink-0 flex items-center gap-1.5 px-4 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-95"
        style={
          selectedId === null
            ? {
                background: 'var(--gradient-primary)',
                color: 'var(--primary-foreground)',
                boxShadow: '0 2px 8px oklch(0.28 0.10 264 / 0.3)',
              }
            : {
                background: 'white',
                color: 'oklch(0.35 0.04 264)',
                border: '1.5px solid oklch(0.88 0.02 264)',
              }
        }
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        Todos
      </button>

      {categorias.map((cat) => {
        const color = getCategoryColor(cat.nombre)
        const isSelected = selectedId === cat.id
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(isSelected ? null : cat.id)}
            className="touch-target flex-shrink-0 px-4 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-95"
            style={
              isSelected
                ? {
                    background: color.text,
                    color: 'white',
                    boxShadow: `0 2px 8px ${color.text.replace(')', ' / 0.3)')}`,
                  }
                : {
                    background: color.bg,
                    color: color.text,
                    border: `1.5px solid ${color.border}`,
                  }
            }
          >
            {cat.nombre}
          </button>
        )
      })}
    </div>
  )
}
