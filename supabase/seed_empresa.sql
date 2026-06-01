-- Insertar empresa base
-- Ejecutar en Supabase SQL Editor (Dashboard > SQL Editor > New Query)

INSERT INTO public.ptovta_empresas (
  ruc,
  razon_social,
  nombre_comercial,
  serie_boleta,
  serie_factura,
  nubefact_modo
) VALUES (
  '20101066992',
  'DAVALOS IMPORT S.A.',
  'DAVALOS IMPORT',
  'B001',
  'F001',
  'demo'
) ON CONFLICT (ruc) DO NOTHING;
