'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cerrarCaja, getResumen, type ResumenCaja } from '../actions'
import { useSessionStore } from '@marketpos/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface CajaScreenProps {
  cajaId: string
}

export function CajaScreen({ cajaId }: CajaScreenProps) {
  const router = useRouter()
  const setCajaActiva = useSessionStore((s) => s.setCajaActiva)
  const [showCierre, setShowCierre] = useState(false)
  const [montoFinal, setMontoFinal] = useState('')
  const [resumen, setResumen] = useState<ResumenCaja | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLoadResumen() {
    setLoading(true)
    const result = await getResumen(cajaId, montoFinal || undefined)
    if (result.data) {
      setResumen(result.data)
    }
    setLoading(false)
    setShowCierre(true)
  }

  async function handleCerrar() {
    if (!montoFinal) {
      setError('Ingresa el monto final en efectivo')
      return
    }
    setError(null)
    setLoading(true)

    const result = await cerrarCaja(cajaId, { monto_final: parseFloat(montoFinal) })
    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    setCajaActiva(null)
    router.refresh()
  }

  if (!showCierre) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* ── Premium Header ── */}
        <div className="header-premium px-5 py-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="12" x="2" y="6" rx="2" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Caja</h1>
              <p className="text-xs text-white/60">Turno activo</p>
            </div>
          </div>

        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4 scrollbar-thin">
          {/* Status card */}
          <div className="card-elevated p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-semibold text-emerald-700">Caja Abierta</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Tu caja está activa. Cuando termines el turno, presiona el botón de abajo para ver el resumen y cerrar.
            </p>
          </div>

          {/* Quick actions */}
          <div className="card-elevated p-5 animate-fade-in">
            <Button
              variant="outline"
              className="w-full h-14 text-base font-semibold rounded-xl border-2 border-dashed border-border/80 hover:border-primary/40 hover:bg-primary/5 transition-all"
              onClick={handleLoadResumen}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  Cargando resumen...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="M3 9h18" />
                    <path d="M9 21V9" />
                  </svg>
                  Ver resumen y cerrar caja
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Premium Header ── */}
      <div className="header-premium px-5 py-4 flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Cerrar caja</h1>
              <p className="text-xs text-white/60">Revisa el resumen antes de cerrar</p>
            </div>
          </div>
        </div>

      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4 scrollbar-thin">
        {resumen && (
          <div className="space-y-3 animate-fade-in">
            {/* Monto inicial */}
            <div className="card-elevated p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Monto inicial</span>
                <span className="text-base font-bold text-foreground tabular-nums">S/ {resumen.monto_inicial}</span>
              </div>
            </div>

            {/* Ingresos / Egresos */}
            <div className="grid grid-cols-2 gap-3">
              <div className="card-elevated p-4 border-l-4 border-l-emerald-500">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Ingresos</p>
                <p className="text-lg font-bold text-emerald-600 tabular-nums">S/ {resumen.total_ingresos}</p>
              </div>
              <div className="card-elevated p-4 border-l-4 border-l-destructive">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Egresos</p>
                <p className="text-lg font-bold text-destructive tabular-nums">S/ {resumen.total_egresos}</p>
              </div>
            </div>

            {/* Saldo esperado */}
            <div className="card-elevated p-4 bg-primary/5 border-primary/10">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-foreground">Saldo esperado</span>
                <span className="text-xl font-extrabold text-primary tabular-nums">S/ {resumen.saldo_esperado}</span>
              </div>
            </div>

            {resumen.diferencia !== null && (
              <div className={cn(
                'card-elevated p-4',
                parseFloat(resumen.diferencia) < 0 ? 'border-l-4 border-l-destructive bg-destructive/5' : 'border-l-4 border-l-emerald-500 bg-emerald-50/50'
              )}>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">Diferencia</span>
                  <span className={cn(
                    'text-lg font-bold tabular-nums',
                    parseFloat(resumen.diferencia) < 0 ? 'text-destructive' : 'text-emerald-600'
                  )}>
                    S/ {resumen.diferencia}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Monto final input */}
        <div className="card-elevated p-5 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <Label htmlFor="monto-final" className="text-sm font-semibold text-foreground mb-3 block">
            Monto final en caja (S/.)
          </Label>
          <Input
            id="monto-final"
            type="number"
            min="0"
            step="0.10"
            value={montoFinal}
            onChange={(e) => setMontoFinal(e.target.value)}
            className="h-14 text-xl text-center font-bold rounded-xl bg-secondary/50"
            placeholder="0.00"
          />
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm rounded-xl px-4 py-3 font-medium animate-slide-up">
            {error}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="px-5 pb-6 pt-4 border-t border-border/60 flex gap-3 flex-shrink-0 bg-background">
        <Button
          variant="outline"
          className="flex-1 h-14 text-base rounded-xl border-border/60"
          onClick={() => setShowCierre(false)}
        >
          Cancelar
        </Button>
        <Button
          variant="destructive"
          className="flex-1 h-14 text-base font-bold rounded-xl shadow-md"
          onClick={handleCerrar}
          disabled={loading || !montoFinal}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Cerrando...
            </span>
          ) : (
            'Cerrar Caja'
          )}
        </Button>
      </div>
    </div>
  )
}
