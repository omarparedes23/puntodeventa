-- ============================================================
-- MarketPos — Migración 003: Clientes
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ptovta_clientes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES public.ptovta_empresas(id) ON DELETE CASCADE,
  tipo_cliente    TEXT NOT NULL DEFAULT 'minorista' CHECK (tipo_cliente IN ('mayorista', 'minorista')),
  tipo_documento  TEXT DEFAULT 'DNI' CHECK (tipo_documento IN ('DNI', 'RUC', 'CE', 'PASAPORTE')),
  nro_documento   TEXT,
  nombre          TEXT NOT NULL,
  telefono        TEXT,
  email           TEXT,
  direccion       TEXT,
  tiene_credito   BOOLEAN NOT NULL DEFAULT FALSE,
  limite_credito  NUMERIC(10,2) NOT NULL DEFAULT 0,
  saldo_deudor    NUMERIC(10,2) NOT NULL DEFAULT 0,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Unicidad por documento dentro de la misma empresa.
-- NULLs en nro_documento son distintos entre sí (PostgreSQL), así que
-- múltiples clientes sin documento no violan la restricción.
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_empresa_doc
  ON public.ptovta_clientes (empresa_id, nro_documento)
  WHERE nro_documento IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clientes_empresa_nombre
  ON public.ptovta_clientes (empresa_id, nombre);

DROP TRIGGER IF EXISTS set_updated_at_clientes ON public.ptovta_clientes;
CREATE TRIGGER set_updated_at_clientes
  BEFORE UPDATE ON public.ptovta_clientes
  FOR EACH ROW EXECUTE FUNCTION public.ptovta_set_updated_at();

-- --------------------------------------------------------
-- RLS
-- --------------------------------------------------------
ALTER TABLE public.ptovta_clientes ENABLE ROW LEVEL SECURITY;

-- Lectura: todos los roles de la empresa
CREATE POLICY "empresa_isolation_select" ON public.ptovta_clientes
  FOR SELECT USING (empresa_id = public.ptovta_get_current_empresa_id());

-- Creación: todos los roles (vendedor puede crear clientes)
CREATE POLICY "empresa_isolation_insert" ON public.ptovta_clientes
  FOR INSERT WITH CHECK (empresa_id = public.ptovta_get_current_empresa_id());

-- Edición: solo administradores
CREATE POLICY "empresa_isolation_update" ON public.ptovta_clientes
  FOR UPDATE USING (
    empresa_id = public.ptovta_get_current_empresa_id()
    AND EXISTS (
      SELECT 1 FROM public.ptovta_perfiles
      WHERE id = auth.uid() AND rol = 'administrador'
    )
  );

-- Eliminación: solo administradores
CREATE POLICY "empresa_isolation_delete" ON public.ptovta_clientes
  FOR DELETE USING (
    empresa_id = public.ptovta_get_current_empresa_id()
    AND EXISTS (
      SELECT 1 FROM public.ptovta_perfiles
      WHERE id = auth.uid() AND rol = 'administrador'
    )
  );
