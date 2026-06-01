-- ============================================================
-- MarketPos — Migración 001: Empresas y Perfiles
-- IMPORTANTE: Supabase compartido. Usamos prefijo ptovta_ en
-- funciones y triggers para coexistir con otros proyectos.
-- Los triggers de Kleiner (handle_new_user) no se modifican.
-- ============================================================

-- --------------------------------------------------------
-- TABLA: ptovta_empresas
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ptovta_empresas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razon_social      TEXT NOT NULL,
  nombre_comercial  TEXT,
  ruc               TEXT NOT NULL UNIQUE,
  direccion         TEXT,
  telefono          TEXT,
  email             TEXT,
  logo_url          TEXT,
  serie_boleta      TEXT DEFAULT 'B001',
  serie_factura     TEXT DEFAULT 'F001',
  nubefact_token    TEXT,
  nubefact_modo     TEXT DEFAULT 'demo' CHECK (nubefact_modo IN ('demo', 'produccion')),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------
-- TABLA: ptovta_perfiles (extiende auth.users)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ptovta_perfiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  rol           TEXT NOT NULL DEFAULT 'administrador' CHECK (rol IN ('administrador', 'vendedor', 'lectura')),
  activo        BOOLEAN DEFAULT TRUE,
  empresa_id    UUID REFERENCES public.ptovta_empresas(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------
-- TRIGGER: crea ptovta_perfiles al hacer signup en Supabase Auth
-- Nombre con prefijo ptovta_ para no colisionar con on_auth_user_created (Kleiner)
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ptovta_handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ptovta_perfiles (id, nombre, rol)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.email), 'administrador')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_ptovta ON auth.users;
CREATE TRIGGER on_auth_user_created_ptovta
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.ptovta_handle_new_user();

-- --------------------------------------------------------
-- TRIGGERS: updated_at automático
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ptovta_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at_empresas ON public.ptovta_empresas;
CREATE TRIGGER set_updated_at_empresas
  BEFORE UPDATE ON public.ptovta_empresas
  FOR EACH ROW EXECUTE FUNCTION public.ptovta_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_perfiles ON public.ptovta_perfiles;
CREATE TRIGGER set_updated_at_perfiles
  BEFORE UPDATE ON public.ptovta_perfiles
  FOR EACH ROW EXECUTE FUNCTION public.ptovta_set_updated_at();

-- --------------------------------------------------------
-- RLS: Row Level Security
-- --------------------------------------------------------
ALTER TABLE public.ptovta_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ptovta_perfiles ENABLE ROW LEVEL SECURITY;

-- ptovta_perfiles: cada usuario solo ve su propio perfil
CREATE POLICY "perfil_propio" ON public.ptovta_perfiles
  FOR ALL USING (id = auth.uid());

-- ptovta_empresas: solo ven su empresa
CREATE POLICY "empresa_isolation" ON public.ptovta_empresas
  FOR SELECT USING (
    id = (
      SELECT empresa_id FROM public.ptovta_perfiles
      WHERE id = auth.uid()
    )
  );

-- ptovta_empresas: INSERT se hace vía service role (admin client), no necesita policy de INSERT
-- ptovta_empresas: UPDATE solo el admin de la empresa
CREATE POLICY "empresa_update_admin" ON public.ptovta_empresas
  FOR UPDATE USING (
    id = (
      SELECT empresa_id FROM public.ptovta_perfiles
      WHERE id = auth.uid() AND rol = 'administrador'
    )
  );
