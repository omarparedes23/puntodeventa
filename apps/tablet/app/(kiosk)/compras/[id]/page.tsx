import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCompra } from '../actions'
import { cn } from '@/lib/utils'

interface CompraDetailPageProps {
  params: Promise<{ id: string }>
}

const estadoClasses: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  parcial: 'bg-blue-100 text-blue-700',
  pagado: 'bg-green-100 text-green-700',
}

export default async function CompraDetailPage({ params }: CompraDetailPageProps) {
  const { id } = await params
  const res = await getCompra(id)

  if (!res.data) {
    redirect('/compras')
  }

  const compra = res.data

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border">
        <Link
          href="/compras"
          className="min-h-[44px] px-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Volver
        </Link>
        <div>
          <h1 className="text-lg font-bold text-foreground">
            {compra.proveedor?.nombre ?? 'Sin proveedor'}
          </h1>
          <p className="text-xs text-muted-foreground">
            {compra.fecha_compra}
            {compra.nro_documento && ` · ${compra.nro_documento}`}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-6 pt-4">
        {/* Estado */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Estado de pago</span>
          <span className={cn('text-sm px-3 py-1 rounded-full font-medium capitalize', estadoClasses[compra.estado_pago] ?? '')}>
            {compra.estado_pago}
          </span>
        </div>

        {/* Montos */}
        <div className="bg-secondary rounded-xl px-4 py-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total compra</span>
            <span className="font-semibold">S/ {compra.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Pagado</span>
            <span className="font-semibold text-green-600">S/ {compra.monto_pagado.toFixed(2)}</span>
          </div>
          {compra.estado_pago !== 'pagado' && (
            <div className="flex justify-between text-sm border-t border-border pt-2">
              <span className="text-muted-foreground">Pendiente</span>
              <span className="font-bold text-destructive">
                S/ {(compra.total - compra.monto_pagado).toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Items */}
        <section>
          <p className="text-sm font-semibold text-foreground mb-2">Productos ({compra.items.length})</p>
          <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
            {compra.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.producto_nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.cantidad} × S/ {item.precio_unitario.toFixed(2)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-foreground flex-shrink-0">
                  S/ {item.subtotal.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {compra.notas && (
          <section>
            <p className="text-sm font-semibold text-foreground mb-1">Notas</p>
            <p className="text-sm text-muted-foreground">{compra.notas}</p>
          </section>
        )}
      </div>
    </div>
  )
}
