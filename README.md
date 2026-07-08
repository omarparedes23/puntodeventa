# MarketPos

Sistema de punto de venta (POS) web para puestos de mercado en Perú que operan como mayoristas y minoristas al mismo tiempo. Rápido de usar en tablet/celular, multi-usuario con roles, y con facturación electrónica SUNAT vía Nubefact.

Ver [CLAUDE.md](./CLAUDE.md) para la especificación completa de producto, esquema de base de datos y decisiones de arquitectura (ADRs).

## Estructura del monorepo

Turborepo con workspaces npm:

```
marketpos/
├── apps/
│   ├── web/          # App principal: dashboard, inventario, clientes, reportes, configuración
│   └── tablet/        # App POS optimizada para tablet/celular (puerto 3001)
├── packages/
│   └── core/           # Lógica compartida entre apps
│       ├── facturacion/  # FacturacionService (Nubefact + implementación propia futura)
│       ├── offline/      # Cola offline (PWA)
│       ├── pos/           # Cálculo de totales
│       ├── stores/        # Zustand: carrito, sesión
│       ├── supabase/      # Clientes Supabase (browser/admin)
│       ├── types/          # Tipos generados de Supabase
│       └── validations/    # Schemas Zod por módulo
├── supabase/          # Migraciones SQL
└── openspec/          # Artefactos de Spec-Driven Development
```

## Stack

- **Framework**: Next.js 16.2.6 (App Router) + React 19.2.4
- **Base de datos**: Supabase (PostgreSQL) con RLS
- **Auth**: Supabase Auth
- **Estilos**: Tailwind CSS v4 + shadcn/ui
- **Estado**: Zustand v5
- **Formularios**: React Hook Form v7 + Zod v4
- **Fetching**: TanStack Query v5
- **Facturación electrónica**: Nubefact API (fase 1) → microservicio propio (fase futura)
- **Monorepo**: Turborepo + npm workspaces

## Requisitos

- Node.js 20+
- npm 11+

## Instalación

```bash
npm install
```

Configurar variables de entorno en `apps/web/.env.local` y `apps/tablet/.env.local` (ver sección Variables de entorno).

## Desarrollo

```bash
# Todas las apps en paralelo (turbo dev)
npm run dev

# Solo la app web (dashboard) — http://localhost:3000
npm run dev --workspace=web

# Solo la app tablet (POS) — http://localhost:3001
npm run dev --workspace=tablet
```

## Otros comandos

```bash
npm run build         # Build de todas las apps (turbo build)
npm run lint          # Lint de todas las apps
npm run test          # Tests (vitest) — solo configurado en apps/web
npm run type-check    # Type-check de todas las apps
```

Tests end-to-end (Playwright) en `apps/web`:

```bash
npm run test:e2e --workspace=web
```

## Variables de entorno

Definidas por app en `turbo.json`:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY   # Solo server-side
NUBEFACT_URL
NUBEFACT_TOKEN
IGV_RATE
OSE_SUNAT_URL
OSE_SUNAT_API_KEY
FACTURACION_PROVIDER
DATABASE_URL
```

## Base de datos

Las migraciones viven en `supabase/migrations/`. Todas las tablas usan el prefijo `ptovta_` y tienen RLS habilitado (aislamiento por `empresa_id`).

```bash
npx supabase db push
npx supabase gen types typescript --project-id <id> > packages/core/src/types/database.ts
```

## Deploy

Auto-deploy a Vercel desde `main` (ver `vercel.json`).
