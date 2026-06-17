'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const tabs = [
  {
    href: '/pos',
    label: 'POS',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="14" x="2" y="5" rx="2" />
        <line x1="2" x2="22" y1="10" y2="10" />
      </svg>
    ),
    matchPaths: ['/', '/pos'],
  },
  {
    href: '/clientes',
    label: 'Clientes',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    matchPaths: ['/clientes'],
  },
  {
    href: '/ventas',
    label: 'Ventas',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>
        <path d="M16 8h-6"/><path d="M14 12H8"/><path d="M12 16H8"/>
      </svg>
    ),
    matchPaths: ['/ventas'],
  },
  {
    href: '/proveedores',
    label: 'Proveedores',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
        <path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9" />
        <path d="M12 3v6" />
      </svg>
    ),
    matchPaths: ['/proveedores'],
  },
  {
    href: '/compras',
    label: 'Compras',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <line x1="3" x2="21" y1="6" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
    matchPaths: ['/compras'],
  },
]

export function TabBar() {
  const pathname = usePathname()

  function isActive(matchPaths: string[]): boolean {
    return matchPaths.some((p) => {
      if (p === '/pos' || p === '/') return pathname === '/pos' || pathname === '/'
      return pathname.startsWith(p)
    })
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[72px] glass-strong border-t border-border/40 z-30 flex">
      {tabs.map((tab) => {
        const active = isActive(tab.matchPaths)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-1 min-h-[48px] relative',
              'transition-colors duration-200',
              active
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {/* Active indicator dot */}
            {active && (
              <span className="absolute top-1.5 w-1 h-1 rounded-full bg-primary animate-scale-in" />
            )}
            <span className={cn(
              'transition-transform duration-200',
              active && 'scale-110'
            )}>
              {tab.icon}
            </span>
            <span className={cn(
              'text-[11px] transition-all duration-200',
              active ? 'font-bold' : 'font-medium'
            )}>
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
