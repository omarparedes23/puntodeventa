-- Crear tabla de proveedores
CREATE TABLE public.ptovta_proveedores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES ptovta_empresas(id),
  ruc             TEXT,
  nombre          TEXT NOT NULL,
  contacto        TEXT,
  telefono        TEXT,
  email           TEXT,
  direccion       TEXT,
  saldo_deudor    NUMERIC(10,2) DEFAULT 0,  -- Cuánto le debemos
  activo          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.ptovta_proveedores ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo ven datos de su empresa
CREATE POLICY "empresa_isolation_proveedores" ON public.ptovta_proveedores
  USING (empresa_id = (SELECT empresa_id FROM ptovta_perfiles WHERE id = auth.uid()));

-- Solo administradores pueden modificar o borrar proveedores
CREATE POLICY "administradores_modify_proveedores" ON public.ptovta_proveedores
  FOR UPDATE
  USING (
    empresa_id = (SELECT empresa_id FROM ptovta_perfiles WHERE id = auth.uid()) AND
    (SELECT rol FROM ptovta_perfiles WHERE id = auth.uid()) = 'administrador'
  );

CREATE POLICY "administradores_delete_proveedores" ON public.ptovta_proveedores
  FOR DELETE
  USING (
    empresa_id = (SELECT empresa_id FROM ptovta_perfiles WHERE id = auth.uid()) AND
    (SELECT rol FROM ptovta_perfiles WHERE id = auth.uid()) = 'administrador'
  );

CREATE POLICY "todos_insert_proveedores" ON public.ptovta_proveedores
  FOR INSERT
  WITH CHECK (
    empresa_id = (SELECT empresa_id FROM ptovta_perfiles WHERE id = auth.uid())
  );
