-- ============================================
-- EnercityWeb — Dispatch cost per REGION (not per comuna)
-- ============================================
-- The old model kept dispatch_cost on `comunas` (per-comuna) and the admin
-- "Costo de Despacho" screen ended up averaging it across a region on the
-- fly. Product wants a single cost per region instead. `comunas.dispatch_cost`
-- is left in place (unused) rather than dropped, to avoid a destructive
-- schema change; it is no longer read or written by the app.

CREATE TABLE IF NOT EXISTS public.region_dispatch_costs (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    region TEXT NOT NULL UNIQUE,
    dispatch_cost NUMERIC(12, 0) NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.region_dispatch_costs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read region_dispatch_costs' AND tablename = 'region_dispatch_costs') THEN
    CREATE POLICY "Public read region_dispatch_costs" ON public.region_dispatch_costs
      FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated CRUD region_dispatch_costs' AND tablename = 'region_dispatch_costs') THEN
    CREATE POLICY "Authenticated CRUD region_dispatch_costs" ON public.region_dispatch_costs
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_region_dispatch_costs ON public.region_dispatch_costs;
CREATE TRIGGER set_updated_at_region_dispatch_costs
BEFORE UPDATE ON public.region_dispatch_costs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed one row per official Chilean region (src/lib/constants/regions.ts),
-- backfilled from any existing per-comuna dispatch_cost so configured values
-- aren't silently reset to 0.
INSERT INTO public.region_dispatch_costs (region, dispatch_cost)
SELECT r.region, COALESCE(
  (SELECT MAX(c.dispatch_cost) FROM public.comunas c WHERE c.region = r.region AND c.dispatch_cost > 0),
  0
)
FROM (VALUES
  ('Arica y Parinacota'),
  ('Tarapacá'),
  ('Antofagasta'),
  ('Atacama'),
  ('Coquimbo'),
  ('Valparaíso'),
  ('Metropolitana'),
  ('Libertador General Bernardo O''Higgins'),
  ('Maule'),
  ('Ñuble'),
  ('Biobío'),
  ('La Araucanía'),
  ('Los Ríos'),
  ('Los Lagos'),
  ('Aysén del General Carlos Ibáñez del Campo'),
  ('Magallanes y de la Antártica Chilena')
) AS r(region)
ON CONFLICT (region) DO NOTHING;

GRANT SELECT ON public.region_dispatch_costs TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.region_dispatch_costs TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.region_dispatch_costs_id_seq TO service_role;
