CREATE OR REPLACE FUNCTION public.get_mas_vendidos(
  p_empresa_id UUID,
  p_limit INT DEFAULT 12
)
RETURNS TABLE (
  producto_id UUID,
  nombre TEXT,
  codigo TEXT,
  precio_minorista NUMERIC,
  precio_mayorista NUMERIC,
  foto_url TEXT,
  stock_actual NUMERIC,
  afecto_igv BOOLEAN,
  total_vendido NUMERIC
)
LANGUAGE SQL
SECURITY INVOKER
STABLE
AS $$
  SELECT
    vi.producto_id,
    p.nombre,
    p.codigo,
    p.precio_minorista,
    p.precio_mayorista,
    p.foto_url,
    p.stock_actual,
    p.afecto_igv,
    SUM(vi.cantidad)::NUMERIC AS total_vendido
  FROM ptovta_venta_items vi
  JOIN ptovta_ventas v ON v.id = vi.venta_id
  JOIN ptovta_productos p ON p.id = vi.producto_id
  WHERE
    v.empresa_id = p_empresa_id
    AND v.estado != 'anulada'
    AND v.created_at >= NOW() - INTERVAL '30 days'
    AND p.activo = TRUE
  GROUP BY vi.producto_id, p.nombre, p.codigo, p.precio_minorista, p.precio_mayorista, p.foto_url, p.stock_actual, p.afecto_igv
  ORDER BY total_vendido DESC
  LIMIT p_limit;
$$;
