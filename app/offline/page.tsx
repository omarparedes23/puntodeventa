'use client'

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 3l18 18M8.111 8.111A7.5 7.5 0 0 0 5.25 12c0 4.142 3.358 7.5 7.5 7.5a7.46 7.46 0 0 0 3.889-1.089M10.5 6.81A7.5 7.5 0 0 1 12 6.75c4.142 0 7.5 3.358 7.5 7.5 0 .797-.124 1.565-.354 2.288M12 12v.01" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-2">Sin conexión</h1>
      <p className="text-muted-foreground max-w-xs mb-8">
        No hay conexión a internet. Las páginas que ya visitaste siguen disponibles.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-2.5 rounded-xl transition"
      >
        Reintentar
      </button>
    </div>
  )
}
