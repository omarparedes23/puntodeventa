-- ============================================================
-- MarketPos — Migración 004: Caja
-- ptovta_cajas + ptovta_movimientos_caja
-- ============================================================

-- --------------------------------------------------------
-- TABLA: ptovta_cajas
-- Una caja por turno de usuario. El índice parcial único
-- garantiza a nivel de BD que solo existe una caja 'abierta'
-- por usuario/empresa al mismo tiempo.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ptovta_cajas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES public.ptovta_empresas(id) ON DELETE CASCADE,
  usuario_id      UUID NOT NULL REFERENCES public.ptovta_perfiles(id) ON DELETE RESTRICT,
  estado          TEXT NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta', 'cerrada')),
  monto_inicial   NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (monto_inicial >= 0),
  monto_final     NUMERIC(10,2) CHECK (monto_final >= 0),
  fecha_apertura  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_cierre    TIMESTAMPTZ,
  notas           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Garantía de negocio: máximo 1 caja abierta por usuario/empresa.
-- El índice parcial WHERE estado='abierta' es la única forma de
-- imponer esta regla cross-row en PostgreSQL sin triggers.
CREATE UNIQUE INDEX IF NOT EXISTS idx_caja_una_abierta_por_usuario
  ON public.ptovta_cajas (empresa_id, usuario_id)
  WHERE estado = 'abierta';

-- --------------------------------------------------------
-- TABLA: ptovta_movimientos_caja
-- Registro inmutable de ingresos/egresos manuales.
-- Los montos siempre son positivos; el tipo indica dirección.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ptovta_movimientos_caja (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caja_id         UUID NOT NULL REFERENCES public.ptovta_cajas(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  concepto        TEXT NOT NULL,
  monto           NUMERIC(10,2) NOT NULL CHECK (monto > 0),
  metodo_pago     TEXT NOT NULL DEFAULT 'efectivo'
                  CHECK (metodo_pago IN ('efectivo', 'yape', 'tarjeta', 'transferencia', 'credito')),
  referencia_id   UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movimientos_caja_id
  ON public.ptovta_movimientos_caja (caja_id, created_at DESC);

-- --------------------------------------------------------
-- RLS: ptovta_cajas
-- --------------------------------------------------------
ALTER TABLE public.ptovta_cajas ENABLE ROW LEVEL SECURITY;

-- SELECT: el usuario ve sus propias cajas; el admin ve todas las de la empresa
CREATE POLICY "caja_select" ON public.ptovta_cajas
  FOR SELECT USING (
    empresa_id = public.ptovta_get_current_empresa_id()
    AND (
      usuario_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.ptovta_perfiles
        WHERE id = auth.uid() AND rol = 'administrador'
      )
    )
  );

-- INSERT: cualquier rol (salvo lectura) puede abrir su propia caja
CREATE POLICY "caja_insert" ON public.ptovta_cajas
  FOR INSERT WITH CHECK (
    empresa_id = public.ptovta_get_current_empresa_id()
    AND usuario_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.ptovta_perfiles
      WHERE id = auth.uid() AND rol IN ('administrador', 'vendedor')
    )
  );

-- UPDATE: el usuario cierra su propia caja; el admin puede cerrar cualquiera
CREATE POLICY "caja_update" ON public.ptovta_cajas
  FOR UPDATE USING (
    empresa_id = public.ptovta_get_current_empresa_id()
    AND (
      usuario_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.ptovta_perfiles
        WHERE id = auth.uid() AND rol = 'administrador'
      )
    )
    AND EXISTS (
      SELECT 1 FROM public.ptovta_perfiles
      WHERE id = auth.uid() AND rol IN ('administrador', 'vendedor')
    )
  );

-- --------------------------------------------------------
-- RLS: ptovta_movimientos_caja
-- --------------------------------------------------------
ALTER TABLE public.ptovta_movimientos_caja ENABLE ROW LEVEL SECURITY;

-- SELECT: movimientos de cajas accesibles
CREATE POLICY "movimientos_select" ON public.ptovta_movimientos_caja
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ptovta_cajas c
      WHERE c.id = caja_id
        AND c.empresa_id = public.ptovta_get_current_empresa_id()
        AND (
          c.usuario_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.ptovta_perfiles
            WHERE id = auth.uid() AND rol = 'administrador'
          )
        )
    )
  );

-- INSERT: solo en cajas abiertas accesibles, no para rol lectura
CREATE POLICY "movimientos_insert" ON public.ptovta_movimientos_caja
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ptovta_cajas c
      WHERE c.id = caja_id
        AND c.empresa_id = public.ptovta_get_current_empresa_id()
        AND c.estado = 'abierta'
        AND (
          c.usuario_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.ptovta_perfiles
            WHERE id = auth.uid() AND rol = 'administrador'
          )
        )
    )
    AND EXISTS (
      SELECT 1 FROM public.ptovta_perfiles
      WHERE id = auth.uid() AND rol IN ('administrador', 'vendedor')
    )
  );
