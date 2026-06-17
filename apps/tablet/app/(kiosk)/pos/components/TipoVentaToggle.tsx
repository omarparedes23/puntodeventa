'use client'

import { useCartStore } from '@marketpos/core'
import { cn } from '@/lib/utils'

export function TipoVentaToggle() {
  const tipoVenta = useCartStore((s) => s.tipoVenta)
  const setTipoVenta = useCartStore((s) => s.setTipoVenta)

  return (
    <div className="flex rounded-full border border-border bg-secondary p-1 gap-1">
      {(['minorista', 'mayorista'] as const).map((tipo) => (
        <button
          key={tipo}
          onClick={() => setTipoVenta(tipo)}
          className={cn(
            'h-10 px-5 rounded-full text-sm font-medium transition-colors capitalize min-h-[44px]',
            tipoVenta === tipo
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-transparent text-secondary-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
        </button>
      ))}
    </div>
  )
}
