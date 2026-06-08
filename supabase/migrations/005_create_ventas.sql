-- ============================================================
-- MarketPos — Migración 005: Ventas y Kardex
-- ptovta_kardex, ptovta_ventas, ptovta_venta_items,
-- ptovta_venta_pagos
-- ============================================================

-- --------------------------------------------------------
-- TABLA: ptovta_kardex
-- Historial inmutable de movimientos de stock.
-- Solo escritura vía server actions (sin UPDATE/DELETE por RLS).
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ptovta_kardex (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES public.ptovta_empresas(id) ON DELETE RESTRICT,
  producto_id     UUID NOT NULL REFERENCES public.ptovta_productos(id) ON DELETE RESTRICT,
  tipo            TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida', 'ajuste')),
  motivo          TEXT NOT NULL CHECK (motivo IN ('venta', 'compra', 'ajuste_manual', 'devolucion', 'merma')),
  cantidad        NUMERIC(10,3) NOT NULL CHECK (cantidad > 0),
  stock_anterior  NUMERIC(10,3) NOT NULL,
  stock_nuevo     NUMERIC(10,3) NOT NULL,
  referencia_id   UUID,
  notas           TEXT,
  usuario_id      UUID REFERENCES public.ptovta_perfiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kardex_producto
  ON public.ptovta_kardex (empresa_id, producto_id, created_at DESC);

ALTER TABLE public.ptovta_kardex ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kardex_select" ON public.ptovta_kardex
  FOR SELECT USING (empresa_id = public.ptovta_get_current_empresa_id());

-- --------------------------------------------------------
-- TABLA: ptovta_ventas
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ptovta_ventas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id        UUID NOT NULL REFERENCES public.ptovta_empresas(id) ON DELETE RESTRICT,
  caja_id           UUID REFERENCES public.ptovta_cajas(id),
  cliente_id        UUID REFERENCES public.ptovta_clientes(id),
  usuario_id        UUID NOT NULL REFERENCES public.ptovta_perfiles(id),
  tipo_venta        TEXT NOT NULL DEFAULT 'minorista' CHECK (tipo_venta IN ('mayorista', 'minorista')),
  tipo_comprobante  TEXT NOT NULL CHECK (tipo_comprobante IN ('boleta', 'factura', 'ticket')),
  serie             TEXT,
  correlativo       INTEGER,
  numero_completo   TEXT,
  subtotal          NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  descuento_total   NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (descuento_total >= 0),
  igv               NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (igv >= 0),
  total             NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  estado            TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'emitida', 'anulada', 'error_sunat')),
  sunat_estado      TEXT,
  sunat_cdr         TEXT,
  sunat_hash        TEXT,
  nubefact_id       TEXT,
  pdf_url           TEXT,
  xml_url           TEXT,
  fecha_emision     DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Correlativo único por empresa+tipo+serie (SUNAT identifica por RUC+tipo+serie+correlativo)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ventas_serie_correlativo
  ON public.ptovta_ventas (empresa_id, tipo_comprobante, serie, correlativo)
  WHERE serie IS NOT NULL AND correlativo IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ventas_empresa_fecha
  ON public.ptovta_ventas (empresa_id, fecha_emision DESC);

CREATE OR REPLACE TRIGGER ptovta_ventas_updated_at
  BEFORE UPDATE ON public.ptovta_ventas
  FOR EACH ROW EXECUTE FUNCTION public.ptovta_set_updated_at();

ALTER TABLE public.ptovta_ventas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ventas_select" ON public.ptovta_ventas
  FOR SELECT USING (empresa_id = public.ptovta_get_current_empresa_id());

CREATE POLICY "ventas_insert" ON public.ptovta_ventas
  FOR INSERT WITH CHECK (
    empresa_id = public.ptovta_get_current_empresa_id()
    AND EXISTS (
      SELECT 1 FROM public.ptovta_perfiles
      WHERE id = auth.uid() AND rol IN ('administrador', 'vendedor')
    )
  );

-- UPDATE de estado/nubefact solo vía admin client (service role bypasses RLS)
CREATE POLICY "ventas_update_admin" ON public.ptovta_ventas
  FOR UPDATE USING (
    empresa_id = public.ptovta_get_current_empresa_id()
    AND EXISTS (
      SELECT 1 FROM public.ptovta_perfiles
      WHERE id = auth.uid() AND rol = 'administrador'
    )
  );

-- --------------------------------------------------------
-- TABLA: ptovta_venta_items
-- Snapshot del producto al momento de la venta (precio inmutable)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ptovta_venta_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id        UUID NOT NULL REFERENCES public.ptovta_ventas(id) ON DELETE CASCADE,
  producto_id     UUID NOT NULL REFERENCES public.ptovta_productos(id) ON DELETE RESTRICT,
  cantidad        NUMERIC(10,3) NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(10,2) NOT NULL CHECK (precio_unitario >= 0),
  descuento       NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (descuento >= 0),
  subtotal        NUMERIC(10,2) NOT NULL,
  igv             NUMERIC(10,2) NOT NULL DEFAULT 0,
  total           NUMERIC(10,2) NOT NULL,
  producto_nombre TEXT NOT NULL,
  producto_codigo TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ptovta_venta_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "venta_items_select" ON public.ptovta_venta_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ptovta_ventas v
      WHERE v.id = venta_id
        AND v.empresa_id = public.ptovta_get_current_empresa_id()
    )
  );

CREATE POLICY "venta_items_insert" ON public.ptovta_venta_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ptovta_ventas v
      WHERE v.id = venta_id
        AND v.empresa_id = public.ptovta_get_current_empresa_id()
    )
    AND EXISTS (
      SELECT 1 FROM public.ptovta_perfiles
      WHERE id = auth.uid() AND rol IN ('administrador', 'vendedor')
    )
  );

-- --------------------------------------------------------
-- TABLA: ptovta_venta_pagos
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ptovta_venta_pagos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id    UUID NOT NULL REFERENCES public.ptovta_ventas(id) ON DELETE CASCADE,
  metodo_pago TEXT NOT NULL CHECK (metodo_pago IN ('efectivo', 'yape', 'tarjeta', 'transferencia', 'credito')),
  monto       NUMERIC(10,2) NOT NULL CHECK (monto > 0),
  referencia  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ptovta_venta_pagos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "venta_pagos_select" ON public.ptovta_venta_pagos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ptovta_ventas v
      WHERE v.id = venta_id
        AND v.empresa_id = public.ptovta_get_current_empresa_id()
    )
  );

CREATE POLICY "venta_pagos_insert" ON public.ptovta_venta_pagos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ptovta_ventas v
      WHERE v.id = venta_id
        AND v.empresa_id = public.ptovta_get_current_empresa_id()
    )
    AND EXISTS (
      SELECT 1 FROM public.ptovta_perfiles
      WHERE id = auth.uid() AND rol IN ('administrador', 'vendedor')
    )
  );
