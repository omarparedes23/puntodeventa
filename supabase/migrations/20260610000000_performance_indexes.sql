-- ============================================================
-- MarketPos — Migración: Performance Indexes
-- Optimiza consultas lentas identificadas en el tablet app
-- ============================================================

-- --------------------------------------------------------
-- 1. Índices para búsqueda de productos
-- --------------------------------------------------------
-- Fallback para ilike: trigram index para búsquedas parciales
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índice GIN trigram para búsqueda de productos por nombre
CREATE INDEX IF NOT EXISTS idx_productos_nombre_trgm
  ON public.ptovta_productos USING GIN (nombre gin_trgm_ops);

-- Índice GIN trigram para búsqueda de productos por código
CREATE INDEX IF NOT EXISTS idx_productos_codigo_trgm
  ON public.ptovta_productos USING GIN (codigo gin_trgm_ops);

-- Índice compuesto para listado de productos activos por empresa
CREATE INDEX IF NOT EXISTS idx_productos_empresa_activo
  ON public.ptovta_productos (empresa_id, activo, nombre);

-- --------------------------------------------------------
-- 2. Índices para búsqueda de clientes
-- --------------------------------------------------------
-- GIN trigram para búsqueda de clientes por nombre
CREATE INDEX IF NOT EXISTS idx_clientes_nombre_trgm
  ON public.ptovta_clientes USING GIN (nombre gin_trgm_ops);

-- GIN trigram para búsqueda de clientes por documento
CREATE INDEX IF NOT EXISTS idx_clientes_nro_doc_trgm
  ON public.ptovta_clientes USING GIN (nro_documento gin_trgm_ops);

-- --------------------------------------------------------
-- 3. Índices para búsqueda de proveedores
-- --------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_proveedores_nombre_trgm
  ON public.ptovta_proveedores USING GIN (nombre gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_proveedores_ruc_trgm
  ON public.ptovta_proveedores USING GIN (ruc gin_trgm_ops);

-- --------------------------------------------------------
-- 4. Índices para caja (consultas frecuentes)
-- --------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_cajas_usuario_empresa_estado
  ON public.ptovta_cajas (usuario_id, empresa_id, estado);

-- --------------------------------------------------------
-- 5. Índices para ventas (correlativo lookup)
-- --------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_ventas_empresa_serie_correlativo
  ON public.ptovta_ventas (empresa_id, serie, correlativo DESC)
  WHERE serie IS NOT NULL AND correlativo IS NOT NULL;

-- --------------------------------------------------------
-- 6. Índices para kardex (join con venta_items)
-- --------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_venta_items_venta_id
  ON public.ptovta_venta_items (venta_id);

CREATE INDEX IF NOT EXISTS idx_venta_items_producto_id
  ON public.ptovta_venta_items (producto_id);

-- --------------------------------------------------------
-- 7. Optimizar RLS: Cache empresa_id en sesión
-- --------------------------------------------------------
-- La función ptovta_get_current_empresa_id() se ejecuta por cada fila.
-- Optimización: usar subquery con JOIN en vez de función STABLE.

-- --------------------------------------------------------
-- 8. Índices para get_mas_vendidos (30-day window)
-- --------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_ventas_estado_created
  ON public.ptovta_ventas (estado, created_at DESC)
  WHERE estado != 'anulada';

-- --------------------------------------------------------
-- 9. Índices para compra_items (join)
-- --------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_compra_items_compra_id
  ON public.ptovta_compra_items (compra_id);
