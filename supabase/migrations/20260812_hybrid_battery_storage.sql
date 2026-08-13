-- ============================================
-- EnercityWeb — Hybrid Battery Storage
-- ============================================

-- Create almacenamiento_baterias table for battery storage options
CREATE TABLE IF NOT EXISTS public.almacenamiento_baterias (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  etiqueta TEXT NOT NULL,
  precio_neto NUMERIC(12, 0) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster lookups of active batteries
CREATE INDEX IF NOT EXISTS idx_almacenamiento_baterias_activo 
ON public.almacenamiento_baterias(activo) 
WHERE activo = true;

-- RLS policies for almacenamiento_baterias
ALTER TABLE public.almacenamiento_baterias ENABLE ROW LEVEL SECURITY;

-- Public read access for active batteries (anon and authenticated)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read active almacenamiento_baterias' AND tablename = 'almacenamiento_baterias') THEN
    CREATE POLICY "Public read active almacenamiento_baterias" ON public.almacenamiento_baterias 
    FOR SELECT TO anon, authenticated USING (activo = true);
  END IF;
END $$;

-- Full access for service_role (admin operations)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access almacenamiento_baterias' AND tablename = 'almacenamiento_baterias') THEN
    CREATE POLICY "Service role full access almacenamiento_baterias" ON public.almacenamiento_baterias 
    FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Seed default battery data (one active 15 kWh battery)
INSERT INTO public.almacenamiento_baterias (etiqueta, precio_neto, activo) VALUES
('Batería 15 kWh', 8968806, true)
ON CONFLICT DO NOTHING;

-- Permission grants (RLS policies above gate row access; these allow the roles to touch the table)
GRANT SELECT ON public.almacenamiento_baterias TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.almacenamiento_baterias TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.almacenamiento_baterias_id_seq TO service_role;