'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { reenviarSunat, anularComprobante, crearNotaCredito, descargarDocumento, type ComprobanteCompleto } from '../actions'
import { MOTIVOS_NC, type ItemNC } from '../constants'
import type { NotaCreditoMotivo } from '@/lib/facturacion/index'
import { useSessionStore } from '@/stores/sessionStore'

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
function fmtMoney(n: number) { return `S/. ${n.toFixed(2)}` }

const ESTADO_CONFIG: Record<string, { cls: string; label: string; icon: string }> = {
  emitida:     { cls: 'bg-green-50 border-green-200 text-green-800',  label: 'Emitida',     icon: '✓' },
  pendiente:   { cls: 'bg-yellow-50 border-yellow-200 text-yellow-800', label: 'Pendiente SUNAT', icon: '⏳' },
  error_sunat: { cls: 'bg-red-50 border-red-200 text-red-800',        label: 'Error SUNAT', icon: '✕' },
  anulada:     { cls: 'bg-gray-50 border-gray-200 text-gray-600',     label: 'Anulada',     icon: '—' },
}

const TIPO_BADGE: Record<string, string> = {
  boleta:       'bg-blue-50 text-blue-700',
  factura:      'bg-purple-50 text-purple-700',
  ticket:       'bg-gray-50 text-gray-600',
  nota_credito: 'bg-orange-50 text-orange-700',
  nota_debito:  'bg-red-50 text-red-700',
}

const TIPO_LABEL: Record<string, string> = {
  boleta:       'Boleta',
  factura:      'Factura',
  ticket:       'Ticket',
  nota_credito: 'Nota de Crédito',
  nota_debito:  'Nota de Débito',
}

const MOTIVO_NC_LABEL: Record<string, string> = {
  '01': 'Anulación de la operación',
  '03': 'Corrección por error en la descripción',
  '04': 'Descuento global',
  '06': 'Devolución total',
  '07': 'Devolución por ítem',
}

const METODO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo', yape: 'Yape', tarjeta: 'Tarjeta',
  transferencia: 'Transferencia', credito: 'Crédito',
}

// ---- Botón de descarga con presigned URL ----
function DownloadButton({ ventaId, tipo, label }: {
  ventaId: string
  tipo: 'xml' | 'zip' | 'pdf'
  label: string
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    const res = await descargarDocumento(ventaId, tipo)
    setLoading(false)
    if (res.error) { setError(res.error); return }
    if (res.data?.url) window.open(res.data.url, '_blank')
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={loading}
        title={error ?? undefined}
        className="px-3 py-1.5 bg-white/60 hover:bg-white/80 rounded-lg text-xs font-medium transition disabled:opacity-50"
      >
        {loading ? '⏳' : label}
      </button>
      {error && (
        <span className="absolute top-full left-0 mt-1 text-xs text-red-600 whitespace-nowrap bg-white border border-red-200 rounded px-2 py-1 z-10">
          {error}
        </span>
      )}
    </div>
  )
}

// ---- Modal de anulación ----
function AnulacionModal({
  onConfirm,
  onClose,
  isPending,
}: {
  onConfirm: (motivo: string) => void
  onClose: () => void
  isPending: boolean
}) {
  const [motivo, setMotivo] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h3 className="text-base font-semibold text-red-700">Anular comprobante</h3>
        <p className="text-sm text-gray-600">
          Esta acción genera una comunicación de baja ante SUNAT. No se puede revertir.
        </p>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Motivo de anulación *</label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            placeholder="Ej: Error en el monto, duplicado, etc."
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={isPending}
            className="flex-1 py-2.5 border rounded-xl text-sm hover:bg-gray-50 disabled:opacity-50">
            Cancelar
          </button>
          <button
            onClick={() => motivo.trim() && onConfirm(motivo.trim())}
            disabled={isPending || !motivo.trim()}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {isPending ? 'Anulando...' : 'Confirmar anulación'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- Modal de Nota de Crédito ----
function NotaCreditoModal({
  comprobante,
  onConfirm,
  onClose,
  isPending,
}: {
  comprobante: ComprobanteCompleto
  onConfirm: (motivo: NotaCreditoMotivo, items: ItemNC[]) => void
  onClose: () => void
  isPending: boolean
}) {
  const [motivo, setMotivo] = useState<NotaCreditoMotivo>('06')
  const [cantidades, setCantidades] = useState<Record<string, number>>(
    Object.fromEntries(comprobante.items.map((i) => [i.id, i.cantidad]))
  )

  function calcularItems(): ItemNC[] {
    return comprobante.items
      .filter((i) => (cantidades[i.id] ?? 0) > 0)
      .map((i) => {
        const cant = new Decimal(cantidades[i.id] ?? i.cantidad)
        const pct = cant.dividedBy(i.cantidad)
        return {
          producto_id: i.producto_id,
          producto_nombre: i.producto_nombre,
          cantidad: cant.toNumber(),
          precio_unitario: i.precio_unitario,
          subtotal: pct.times(i.subtotal).toDecimalPlaces(2).toNumber(),
          igv: pct.times(i.igv).toDecimalPlaces(2).toNumber(),
          total: pct.times(i.total).toDecimalPlaces(2).toNumber(),
          afecto_igv: i.igv > 0,
        }
      })
  }

  const itemsNC = calcularItems()
  const totalNC = itemsNC.reduce((s, i) => s + i.total, 0)
  const esDev = motivo === '06' || motivo === '07'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-base font-semibold text-gray-800">Generar Nota de Crédito</h3>

        {/* Motivo */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Motivo *</label>
          <select
            value={motivo}
            onChange={(e) => setMotivo(e.target.value as NotaCreditoMotivo)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {Object.entries(MOTIVOS_NC).map(([code, label]) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>
        </div>

        {/* Items */}
        <div>
          <p className="text-xs text-gray-500 mb-2">
            {motivo === '07' ? 'Indicar cantidad a devolver por ítem:' : 'Ítems incluidos en la NC:'}
          </p>
          <div className="space-y-2">
            {comprobante.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 text-sm">
                <span className="flex-1 font-medium">{item.producto_nombre}</span>
                <span className="text-gray-400 font-mono text-xs">S/.{item.precio_unitario}</span>
                {motivo === '07' ? (
                  <input
                    type="number"
                    min="0"
                    max={item.cantidad}
                    step={item.cantidad % 1 !== 0 ? '0.001' : '1'}
                    value={cantidades[item.id] ?? item.cantidad}
                    onChange={(e) => setCantidades((prev) => ({ ...prev, [item.id]: parseFloat(e.target.value) || 0 }))}
                    className="w-20 border rounded px-2 py-1 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                ) : (
                  <span className="w-20 text-right font-mono">{item.cantidad}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Total NC */}
        <div className="bg-orange-50 rounded-lg px-4 py-3 flex justify-between items-center">
          <span className="text-sm font-medium text-orange-700">Total nota de crédito</span>
          <span className="font-mono font-bold text-orange-700">S/. {totalNC.toFixed(2)}</span>
        </div>

        {esDev && (
          <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
            Este motivo devolverá el stock de los productos al inventario.
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} disabled={isPending}
            className="flex-1 py-2.5 border rounded-xl text-sm hover:bg-gray-50 disabled:opacity-50">
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(motivo, itemsNC)}
            disabled={isPending || itemsNC.length === 0 || totalNC <= 0}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {isPending ? 'Emitiendo...' : 'Emitir Nota de Crédito'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- Importar Decimal para cálculos en el modal ----
import { Decimal } from 'decimal.js'

export function ComprobanteDetalle({ comprobante: initial }: { comprobante: ComprobanteCompleto }) {
  const router = useRouter()
  const [comprobante, setComprobante] = useState(initial)
  const [showAnular, setShowAnular] = useState(false)
  const [showNC, setShowNC] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const rol = useSessionStore((s) => s.perfil?.rol)

  const estadoConfig = ESTADO_CONFIG[comprobante.estado] ?? ESTADO_CONFIG.pendiente
  const esSunat = comprobante.tipo_comprobante !== 'ticket'
  const puedeReenviar = esSunat && ['error_sunat', 'pendiente'].includes(comprobante.estado)
  const puedeAnular = esSunat && comprobante.estado === 'emitida' && rol === 'administrador'
  const puedeNC = ['boleta', 'factura'].includes(comprobante.tipo_comprobante) && comprobante.estado === 'emitida' && rol === 'administrador'

  function handleReenviar() {
    setActionError(null)
    startTransition(async () => {
      const res = await reenviarSunat(comprobante.id)
      if (res.error) { setActionError(res.error); return }
      router.refresh()
    })
  }

  function handleAnular(motivo: string) {
    setActionError(null)
    startTransition(async () => {
      const res = await anularComprobante(comprobante.id, motivo)
      if (res.error) { setActionError(res.error); setShowAnular(false); return }
      setShowAnular(false)
      router.refresh()
    })
  }

  function handleNC(motivo: NotaCreditoMotivo, items: ItemNC[]) {
    setActionError(null)
    startTransition(async () => {
      const res = await crearNotaCredito(comprobante.id, motivo, items)
      if (res.error) { setActionError(res.error); return }
      setShowNC(false)
      router.push(`/comprobantes/${res.data?.id}`)
    })
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-xl mt-0.5">←</button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-lg font-semibold font-mono">
              {comprobante.numero_completo ?? 'Sin número'}
            </h1>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${TIPO_BADGE[comprobante.tipo_comprobante] ?? 'bg-gray-50 text-gray-600'}`}>
              {TIPO_LABEL[comprobante.tipo_comprobante] ?? comprobante.tipo_comprobante}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{fmtDate(comprobante.fecha_emision)}</p>
        </div>
      </div>

      {/* Banner estado */}
      <div className={`border rounded-xl px-4 py-3 flex items-center justify-between gap-4 ${estadoConfig.cls}`}>
        <div className="flex items-center gap-2">
          <span className="text-base font-bold">{estadoConfig.icon}</span>
          <div>
            <p className="font-semibold text-sm">{estadoConfig.label}</p>
            {comprobante.sunat_estado && (
              <p className="text-xs opacity-75">SUNAT: {comprobante.sunat_estado}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {esSunat && comprobante.estado === 'emitida' && comprobante.pdf_url && (
            <DownloadButton ventaId={comprobante.id} tipo="pdf" label="📄 PDF" />
          )}
          {esSunat && comprobante.estado === 'emitida' && comprobante.xml_url && (
            <DownloadButton ventaId={comprobante.id} tipo="xml" label="📋 XML" />
          )}
          {puedeReenviar && (
            <button onClick={handleReenviar} disabled={isPending}
              className="px-3 py-1.5 bg-white/60 hover:bg-white/80 rounded-lg text-xs font-medium transition disabled:opacity-50">
              {isPending ? 'Enviando...' : '↻ Reenviar a SUNAT'}
            </button>
          )}
          {puedeNC && (
            <button onClick={() => setShowNC(true)} disabled={isPending}
              className="px-3 py-1.5 bg-orange-600/20 hover:bg-orange-600/30 rounded-lg text-xs font-medium transition text-orange-800 disabled:opacity-50">
              Nota de Crédito
            </button>
          )}
          {puedeAnular && (
            <button onClick={() => setShowAnular(true)} disabled={isPending}
              className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 rounded-lg text-xs font-medium transition text-red-800 disabled:opacity-50">
              Anular
            </button>
          )}
        </div>
      </div>

      {comprobante.tipo_comprobante === 'nota_credito' && comprobante.referencia_venta_id && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center justify-between text-sm">
          <div>
            <p className="text-xs text-orange-500 mb-0.5">Comprobante original</p>
            <p className="font-medium text-orange-900">
              {comprobante.nota_motivo ? `Motivo: ${MOTIVO_NC_LABEL[comprobante.nota_motivo] ?? comprobante.nota_motivo}` : 'Nota de Crédito'}
            </p>
          </div>
          <a
            href={`/comprobantes/${comprobante.referencia_venta_id}`}
            className="text-xs font-medium text-orange-700 hover:text-orange-900 underline"
          >
            Ver original →
          </a>
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{actionError}</div>
      )}

      {/* Info general */}
      <div className="bg-white rounded-xl shadow-sm border p-5 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Tipo de venta</p>
          <p className="font-medium capitalize">{comprobante.tipo_venta}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Fecha emisión</p>
          <p className="font-medium">{fmtDate(comprobante.fecha_emision)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Cliente</p>
          <p className="font-medium">
            {comprobante.cliente
              ? <>
                  {comprobante.cliente.nombre}
                  {comprobante.cliente.nro_documento && (
                    <span className="text-gray-400 font-normal ml-1">
                      ({comprobante.cliente.tipo_documento}: {comprobante.cliente.nro_documento})
                    </span>
                  )}
                </>
              : <span className="text-gray-400 italic font-normal">Consumidor final</span>
            }
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Registrado</p>
          <p className="font-medium">{fmtDateTime(comprobante.created_at)}</p>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-medium">Productos vendidos</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Producto</th>
              <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Cant.</th>
              <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">P. Unit.</th>
              <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Desc.</th>
              <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">IGV</th>
              <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {comprobante.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">
                  <p className="font-medium">{item.producto_nombre}</p>
                  {item.producto_codigo && <p className="text-xs text-gray-400">{item.producto_codigo}</p>}
                </td>
                <td className="px-4 py-3 text-right font-mono">{item.cantidad}</td>
                <td className="px-4 py-3 text-right font-mono">{fmtMoney(item.precio_unitario)}</td>
                <td className="px-4 py-3 text-right font-mono text-orange-600">
                  {item.descuento > 0 ? `−${fmtMoney(item.descuento)}` : '—'}
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-500">{fmtMoney(item.igv)}</td>
                <td className="px-4 py-3 text-right font-mono font-semibold">{fmtMoney(item.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t bg-gray-50 text-sm">
            {comprobante.descuento_total > 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-2 text-right text-orange-600">Descuento total</td>
                <td className="px-4 py-2 text-right font-mono text-orange-600">−{fmtMoney(comprobante.descuento_total)}</td>
              </tr>
            )}
            <tr>
              <td colSpan={5} className="px-4 py-2 text-right text-gray-500">Subtotal (sin IGV)</td>
              <td className="px-4 py-2 text-right font-mono">{fmtMoney(comprobante.subtotal)}</td>
            </tr>
            <tr>
              <td colSpan={5} className="px-4 py-2 text-right text-gray-500">IGV (18%)</td>
              <td className="px-4 py-2 text-right font-mono">{fmtMoney(comprobante.igv)}</td>
            </tr>
            <tr>
              <td colSpan={5} className="px-4 py-3 text-right font-bold">Total</td>
              <td className="px-4 py-3 text-right font-mono font-bold text-blue-700 text-base">{fmtMoney(comprobante.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Pagos */}
      <div className="bg-white rounded-xl shadow-sm border p-5">
        <h2 className="text-sm font-medium mb-3">Formas de pago</h2>
        <div className="space-y-2">
          {comprobante.pagos.map((pago) => (
            <div key={pago.id} className="flex justify-between items-center text-sm">
              <span className="text-gray-600">{METODO_LABEL[pago.metodo_pago] ?? pago.metodo_pago}</span>
              <span className="font-mono font-semibold">{fmtMoney(pago.monto)}</span>
            </div>
          ))}
        </div>
      </div>

      {showAnular && (
        <AnulacionModal
          onConfirm={handleAnular}
          onClose={() => setShowAnular(false)}
          isPending={isPending}
        />
      )}

      {showNC && (
        <NotaCreditoModal
          comprobante={comprobante}
          onConfirm={handleNC}
          onClose={() => setShowNC(false)}
          isPending={isPending}
        />
      )}
    </div>
  )
}
