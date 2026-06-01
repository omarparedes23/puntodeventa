-- ============================================================
-- MarketPos — Migración 006: Proveedores y Compras
-- ptovta_proveedores, ptovta_compras, ptovta_compra_items
-- Nota: ptovta_proveedores se crea aquí como dependencia de
-- compras. El módulo UI de proveedores lo implementa Gemini.
-- ============================================================

-- --------------------------------------------------------
-- TABLA: ptovta_proveedores
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ptovta_proveedores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID NOT NULL REFERENCES public.ptovta_empresas(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  ruc           TEXT,
  contacto      TEXT,
  telefono      TEXT,
  email         TEXT,
  direccion     TEXT,
  saldo_deudor  NUMERIC(10,2) NOT NULL DEFAULT 0,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proveedores_empresa
  ON public.ptovta_proveedores (empresa_id, activo);

CREATE OR REPLACE TRIGGER ptovta_proveedores_updated_at
  BEFORE UPDATE ON public.ptovta_proveedores
  FOR EACH ROW EXECUTE FUNCTION public.ptovta_set_updated_at();

ALTER TABLE public.ptovta_proveedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proveedores_select" ON public.ptovta_proveedores
  FOR SELECT USING (empresa_id = public.ptovta_get_current_empresa_id());

CREATE POLICY "proveedores_insert" ON public.ptovta_proveedores
  FOR INSERT WITH CHECK (
    empresa_id = public.ptovta_get_current_empresa_id()
    AND EXISTS (
      SELECT 1 FROM public.ptovta_perfiles
      WHERE id = auth.uid() AND rol IN ('administrador', 'vendedor')
    )
  );

CREATE POLICY "proveedores_update" ON public.ptovta_proveedores
  FOR UPDATE USING (
    empresa_id = public.ptovta_get_current_empresa_id()
    AND EXISTS (
      SELECT 1 FROM public.ptovta_perfiles
      WHERE id = auth.uid() AND rol IN ('administrador', 'vendedor')
    )
  );

CREATE POLICY "proveedores_delete" ON public.ptovta_proveedores
  FOR DELETE USING (
    empresa_id = public.ptovta_get_current_empresa_id()
    AND EXISTS (
      SELECT 1 FROM public.ptovta_perfiles
      WHERE id = auth.uid() AND rol = 'administrador'
    )
  );

-- --------------------------------------------------------
-- TABLA: ptovta_compras
-- monto_pagado: acumula pagos parciales para calcular estado.
-- El estado_pago se deriva de: monto_pagado vs total.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ptovta_compras (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES public.ptovta_empresas(id) ON DELETE RESTRICT,
  proveedor_id    UUID REFERENCES public.ptovta_proveedores(id) ON DELETE SET NULL,
  usuario_id      UUID NOT NULL REFERENCES public.ptovta_perfiles(id),
  nro_documento   TEXT,
  fecha_compra    DATE NOT NULL DEFAULT CURRENT_DATE,
  subtotal        NUMERIC(10,2),
  igv             NUMERIC(10,2),
  total           NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  monto_pagado    NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (monto_pagado >= 0),
  estado_pago     TEXT NOT NULL DEFAULT 'pendiente'
                  CHECK (estado_pago IN ('pendiente', 'parcial', 'pagado')),
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compras_empresa_fecha
  ON public.ptovta_compras (empresa_id, fecha_compra DESC);

CREATE OR REPLACE TRIGGER ptovta_compras_updated_at
  BEFORE UPDATE ON public.ptovta_compras
  FOR EACH ROW EXECUTE FUNCTION public.ptovta_set_updated_at();

ALTER TABLE public.ptovta_compras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "compras_select" ON public.ptovta_compras
  FOR SELECT USING (empresa_id = public.ptovta_get_current_empresa_id());

CREATE POLICY "compras_insert" ON public.ptovta_compras
  FOR INSERT WITH CHECK (
    empresa_id = public.ptovta_get_current_empresa_id()
    AND EXISTS (
      SELECT 1 FROM public.ptovta_perfiles
      WHERE id = auth.uid() AND rol IN ('administrador', 'vendedor')
    )
  );

-- UPDATE solo para actualizar estado_pago y monto_pagado (pagos)
CREATE POLICY "compras_update" ON public.ptovta_compras
  FOR UPDATE USING (
    empresa_id = public.ptovta_get_current_empresa_id()
    AND EXISTS (
      SELECT 1 FROM public.ptovta_perfiles
      WHERE id = auth.uid() AND rol IN ('administrador', 'vendedor')
    )
  );

-- --------------------------------------------------------
-- TABLA: ptovta_compra_items
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ptovta_compra_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id       UUID NOT NULL REFERENCES public.ptovta_compras(id) ON DELETE CASCADE,
  producto_id     UUID NOT NULL REFERENCES public.ptovta_productos(id) ON DELETE RESTRICT,
  cantidad        NUMERIC(10,3) NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(10,2) NOT NULL CHECK (precio_unitario >= 0),
  subtotal        NUMERIC(10,2) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ptovta_compra_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "compra_items_select" ON public.ptovta_compra_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ptovta_compras c
      WHERE c.id = compra_id
        AND c.empresa_id = public.ptovta_get_current_empresa_id()
    )
  );

CREATE POLICY "compra_items_insert" ON public.ptovta_compra_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ptovta_compras c
      WHERE c.id = compra_id
        AND c.empresa_id = public.ptovta_get_current_empresa_id()
    )
    AND EXISTS (
      SELECT 1 FROM public.ptovta_perfiles
      WHERE id = auth.uid() AND rol IN ('administrador', 'vendedor')
    )
  );
