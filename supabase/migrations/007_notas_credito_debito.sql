-- Migración 007: Soporte para Notas de Crédito y Débito

ALTER TABLE public.ptovta_ventas
  DROP CONSTRAINT IF EXISTS ptovta_ventas_tipo_comprobante_check;

ALTER TABLE public.ptovta_ventas
  ADD CONSTRAINT ptovta_ventas_tipo_comprobante_check
  CHECK (tipo_comprobante = ANY (ARRAY['boleta','factura','ticket','nota_credito','nota_debito']));

ALTER TABLE public.ptovta_ventas
  ADD COLUMN IF NOT EXISTS referencia_venta_id UUID REFERENCES public.ptovta_ventas(id),
  ADD COLUMN IF NOT EXISTS nota_motivo TEXT;

ALTER TABLE public.ptovta_empresas
  ADD COLUMN IF NOT EXISTS serie_nc_boleta TEXT DEFAULT 'BBB1',
  ADD COLUMN IF NOT EXISTS serie_nc_factura TEXT DEFAULT 'FFF1';
