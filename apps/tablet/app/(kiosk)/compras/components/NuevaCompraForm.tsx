'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { buscarProductosParaCompra, buscarProveedores, registrarCompra } from '../actions'
import type { ProductoParaCompra } from '../actions'
import type { Proveedor } from '@marketpos/core'
import { cn } from '@/lib/utils'
import Decimal from 'decimal.js'

interface LineaItem {
  producto: ProductoParaCompra
  cantidad: number
  precio_unitario: number
}

export function NuevaCompraForm() {
  const router = useRouter()
  const [step, setStep] = useState<'proveedor' | 'items' | 'confirm'>('proveedor')

  // Proveedor
  const [proveedorQuery, setProveedorQuery] = useState('')
  const [proveedorResults, setProveedorResults] = useState<Pick<Proveedor, 'id' | 'nombre' | 'ruc'>[]>([])
  const [proveedor, setProveedor] = useState<Pick<Proveedor, 'id' | 'nombre' | 'ruc'> | null>(null)
  const [nroDoc, setNroDoc] = useState('')
  const [notas, setNotas] = useState('')

  // Items
  const [productoQuery, setProductoQuery] = useState('')
  const [productoResults, setProductoResults] = useState<ProductoParaCompra[]>([])
  const [lineas, setLineas] = useState<LineaItem[]>([])

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const total = lineas.reduce(
    (acc, l) => acc.plus(new Decimal(l.cantidad).times(l.precio_unitario)),
    new Decimal(0)
  ).toDecimalPlaces(2).toNumber()

  function searchProveedores(q: string) {
    setProveedorQuery(q)
    if (!q.trim()) { setProveedorResults([]); return }
    startTransition(async () => {
      const res = await buscarProveedores(q)
      if (res.data) setProveedorResults(res.data)
    })
  }

  function searchProductos(q: string) {
    setProductoQuery(q)
    if (!q.trim()) { setProductoResults([]); return }
    startTransition(async () => {
      const res = await buscarProductosParaCompra(q)
      if (res.data) setProductoResults(res.data)
    })
  }

  function addLinea(producto: ProductoParaCompra) {
    const existing = lineas.find((l) => l.producto.id === producto.id)
    if (existing) {
      setLineas(lineas.map((l) =>
        l.producto.id === producto.id ? { ...l, cantidad: l.cantidad + 1 } : l
      ))
    } else {
      setLineas([...lineas, { producto, cantidad: 1, precio_unitario: producto.precio_compra }])
    }
    setProductoQuery('')
    setProductoResults([])
  }

  function updateLinea(id: string, field: 'cantidad' | 'precio_unitario', val: number) {
    setLineas(lineas.map((l) =>
      l.producto.id === id ? { ...l, [field]: val } : l
    ))
  }

  function removeLinea(id: string) {
    setLineas(lineas.filter((l) => l.producto.id !== id))
  }

  function handleRegistrar() {
    setError(null)
    if (lineas.length === 0) { setError('Debe agregar al menos un producto'); return }

    startTransition(async () => {
      const res = await registrarCompra({
        proveedor_id: proveedor?.id ?? null,
        nro_documento: nroDoc.trim() || null,
        notas: notas.trim() || null,
        items: lineas.map((l) => ({
          producto_id: l.producto.id,
          cantidad: l.cantidad,
          precio_unitario: l.precio_unitario,
        })),
      })

      if (res.error) { setError(res.error); return }
      router.push('/compras')
    })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border">
        <button
          onClick={() => router.back()}
          className="min-h-[44px] px-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Volver
        </button>
        <h1 className="text-lg font-bold text-foreground">Nueva compra</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-6 pt-4">
        {/* Proveedor */}
        <section>
          <p className="text-sm font-semibold text-foreground mb-2">Proveedor (opcional)</p>
          {proveedor ? (
            <div className="flex items-center justify-between px-4 py-3 rounded-lg border border-primary bg-primary/5">
              <div>
                <p className="text-sm font-medium">{proveedor.nombre}</p>
                {proveedor.ruc && <p className="text-xs text-muted-foreground">RUC: {proveedor.ruc}</p>}
              </div>
              <button onClick={() => setProveedor(null)} className="text-xs text-destructive min-h-[44px] px-2">
                Quitar
              </button>
            </div>
          ) : (
            <div className="relative">
              <Input
                value={proveedorQuery}
                onChange={(e) => searchProveedores(e.target.value)}
                placeholder="Buscar proveedor..."
                className="h-12"
              />
              {proveedorResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 bg-background border border-border rounded-lg shadow-lg mt-1 overflow-hidden">
                  {proveedorResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setProveedor(p); setProveedorQuery(''); setProveedorResults([]) }}
                      className="w-full min-h-[44px] flex items-center px-4 py-2 hover:bg-accent text-left text-sm"
                    >
                      {p.nombre}{p.ruc && ` · ${p.ruc}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* N° Documento */}
        <section>
          <p className="text-sm font-semibold text-foreground mb-2">N° Factura del proveedor</p>
          <Input
            value={nroDoc}
            onChange={(e) => setNroDoc(e.target.value)}
            placeholder="Ej: F001-0001234"
            className="h-12"
          />
        </section>

        {/* Productos */}
        <section>
          <p className="text-sm font-semibold text-foreground mb-2">Productos</p>
          <div className="relative">
            <Input
              value={productoQuery}
              onChange={(e) => searchProductos(e.target.value)}
              placeholder="Buscar producto para agregar..."
              className="h-12"
            />
            {productoResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-10 bg-background border border-border rounded-lg shadow-lg mt-1 overflow-hidden max-h-48 overflow-y-auto">
                {productoResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addLinea(p)}
                    className="w-full min-h-[44px] flex items-center justify-between px-4 py-2 hover:bg-accent text-left"
                  >
                    <span className="text-sm">{p.nombre}</span>
                    <span className="text-xs text-muted-foreground">Stock: {p.stock_actual}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {lineas.length > 0 && (
            <div className="mt-3 space-y-2">
              {lineas.map((l) => (
                <div key={l.producto.id} className="border border-border rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-medium text-foreground">{l.producto.nombre}</p>
                    <button onClick={() => removeLinea(l.producto.id)} className="text-destructive text-sm min-h-[44px] px-2">
                      ×
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground">Cantidad</label>
                      <Input
                        type="number"
                        value={l.cantidad}
                        min={0.001}
                        step={0.001}
                        onChange={(e) => updateLinea(l.producto.id, 'cantidad', parseFloat(e.target.value) || 0)}
                        className="h-10 mt-0.5"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground">Precio unit.</label>
                      <Input
                        type="number"
                        value={l.precio_unitario}
                        min={0}
                        step={0.01}
                        onChange={(e) => updateLinea(l.producto.id, 'precio_unitario', parseFloat(e.target.value) || 0)}
                        className="h-10 mt-0.5"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground">Subtotal</label>
                      <p className="text-sm font-semibold mt-2.5">
                        S/ {new Decimal(l.cantidad).times(l.precio_unitario).toDecimalPlaces(2).toNumber().toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold px-1">
                <span>TOTAL</span>
                <span>S/ {total.toFixed(2)}</span>
              </div>
            </div>
          )}
        </section>

        {/* Notas */}
        <section>
          <p className="text-sm font-semibold text-foreground mb-2">Notas</p>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Observaciones..."
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
        </section>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-6 pt-4 border-t border-border">
        <Button
          onClick={handleRegistrar}
          disabled={isPending || lineas.length === 0}
          className="w-full min-h-[56px] text-base font-semibold"
        >
          {isPending ? 'Registrando...' : `Registrar compra · S/ ${total.toFixed(2)}`}
        </Button>
      </div>
    </div>
  )
}
