'use client'

import { useUiStore } from '@/stores/uiStore'

export function MobileHeader() {
  const openSidebar = useUiStore((s) => s.openSidebar)

  return (
    <header className="flex items-center h-12 px-3 border-b border-border bg-background shrink-0 lg:hidden">
      <button
        className="p-2 rounded-lg text-foreground/70 hover:bg-muted transition"
        onClick={openSidebar}
        aria-label="Abrir menú"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <span className="ml-3 text-sm font-semibold text-foreground">MarketPos</span>
    </header>
  )
}
