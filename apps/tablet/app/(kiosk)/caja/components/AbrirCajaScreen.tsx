'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { abrirCaja } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AbrirCajaScreen() {
  const router = useRouter()
  const [montoInicial, setMontoInicial] = useState('0')
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAbrir() {
    setError(null)
    setLoading(true)

    const result = await abrirCaja({
      monto_inicial: parseFloat(montoInicial) || 0,
      notas: notas || undefined,
    })

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.28_0.10_264)] via-[oklch(0.32_0.12_275)] to-[oklch(0.25_0.08_280)]" />

      {/* Decorative shapes */}
      <div className="absolute top-20 -left-20 w-64 h-64 rounded-full bg-white/5" />
      <div className="absolute bottom-32 -right-16 w-48 h-48 rounded-full bg-white/5" />
      <div className="absolute top-1/3 right-10 w-20 h-20 rounded-2xl bg-white/5 rotate-12" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md animate-slide-up">
        <div className="bg-white rounded-3xl shadow-[0_20px_60px_oklch(0_0_0/0.3)] p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-[0_8px_24px_oklch(0.50_0.20_155/0.3)]" style={{ background: 'var(--gradient-success)' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="12" x="2" y="6" rx="2" />
                <circle cx="12" cy="12" r="2" />
                <path d="M6 12h.01M18 12h.01" />
              </svg>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center text-foreground mb-1">Abrir caja</h1>
          <p className="text-sm text-muted-foreground text-center mb-8">
            Ingresa el monto inicial en efectivo para comenzar el turno
          </p>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="monto" className="text-sm font-semibold text-foreground">Monto inicial (S/.)</Label>
              <Input
                id="monto"
                type="number"
                min="0"
                step="0.10"
                value={montoInicial}
                onChange={(e) => setMontoInicial(e.target.value)}
                className="h-14 text-2xl text-center font-bold rounded-xl bg-secondary/50 border-border/60 focus-visible:ring-primary/30"
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notas" className="text-sm font-semibold text-foreground">Notas (opcional)</Label>
              <Input
                id="notas"
                type="text"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="h-12 rounded-xl bg-secondary/50 border-border/60 focus-visible:ring-primary/30"
                placeholder="Ej: Turno mañana"
              />
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive text-sm rounded-xl px-4 py-3 text-center font-medium">
                {error}
              </div>
            )}

            <Button
              onClick={handleAbrir}
              disabled={loading}
              className="w-full h-14 text-base font-bold rounded-xl text-white shadow-md hover:opacity-90 active:scale-[0.98] transition-all"
              style={{ background: 'var(--gradient-primary)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Abriendo...
                </span>
              ) : (
                'Abrir Caja'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
