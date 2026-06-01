-- ============================================================
-- MarketPos — Migración 002: Inventario
-- ptovta_categorias, ptovta_unidades_medida, ptovta_productos
-- ============================================================

-- Helper: empresa_id del usuario autenticado (usado en RLS)
CREATE OR REPLACE FUNCTION public.ptovta_get_current_empresa_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id FROM public.ptovta_perfiles
  WHERE id = auth.uid();
$$;

-- --------------------------------------------------------
-- TABLA: ptovta_categorias
-- Jerarquía de 2 niveles: parent_id NULL = categoría raíz
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ptovta_categorias (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID NOT NULL REFERENCES public.ptovta_empresas(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  parent_id     UUID REFERENCES public.ptovta_categorias(id) ON DELETE SET NULL,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------
-- TABLA: ptovta_unidades_medida
-- simbolo: "kg", "und", "doc", etc.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ptovta_unidades_medida (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES public.ptovta_empresas(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  simbolo         TEXT NOT NULL,
  permite_decimal BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------
-- TABLA: ptovta_productos
-- Doble precio: precio_minorista y precio_mayorista (núcleo del negocio)
-- codigo, categoria_id, unidad_medida_id son nullable por diseño
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ptovta_productos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id        UUID NOT NULL REFERENCES public.ptovta_empresas(id) ON DELETE CASCADE,
  categoria_id      UUID REFERENCES public.ptovta_categorias(id) ON DELETE RESTRICT,
  unidad_medida_id  UUID REFERENCES public.ptovta_unidades_medida(id) ON DELETE RESTRICT,
  codigo            TEXT,
  nombre            TEXT NOT NULL,
  descripcion       TEXT,
  foto_url          TEXT,
  precio_compra     NUMERIC(10,2) NOT NULL DEFAULT 0,
  precio_minorista  NUMERIC(10,2) NOT NULL DEFAULT 0,
  precio_mayorista  NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock_actual      NUMERIC(10,3) NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
  stock_minimo      NUMERIC(10,3) DEFAULT 0,
  activo            BOOLEAN NOT NULL DEFAULT TRUE,
  afecto_igv        BOOLEAN NOT NULL DEFAULT TRUE,
  codigo_sunat      TEXT DEFAULT '10',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE NULLS NOT DISTINCT (empresa_id, codigo)
);

-- --------------------------------------------------------
-- TRIGGERS: updated_at automático
-- --------------------------------------------------------
DROP TRIGGER IF EXISTS set_updated_at_categorias ON public.ptovta_categorias;
CREATE TRIGGER set_updated_at_categorias
  BEFORE UPDATE ON public.ptovta_categorias
  FOR EACH ROW EXECUTE FUNCTION public.ptovta_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_productos ON public.ptovta_productos;
CREATE TRIGGER set_updated_at_productos
  BEFORE UPDATE ON public.ptovta_productos
  FOR EACH ROW EXECUTE FUNCTION public.ptovta_set_updated_at();

-- --------------------------------------------------------
-- RLS: Row Level Security
-- --------------------------------------------------------
ALTER TABLE public.ptovta_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ptovta_unidades_medida ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ptovta_productos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresa_isolation" ON public.ptovta_categorias
  FOR ALL USING (empresa_id = public.ptovta_get_current_empresa_id())
  WITH CHECK (empresa_id = public.ptovta_get_current_empresa_id());

CREATE POLICY "empresa_isolation" ON public.ptovta_unidades_medida
  FOR ALL USING (empresa_id = public.ptovta_get_current_empresa_id())
  WITH CHECK (empresa_id = public.ptovta_get_current_empresa_id());

CREATE POLICY "empresa_isolation" ON public.ptovta_productos
  FOR ALL USING (empresa_id = public.ptovta_get_current_empresa_id())
  WITH CHECK (empresa_id = public.ptovta_get_current_empresa_id());
