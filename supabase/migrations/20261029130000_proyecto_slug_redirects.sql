CREATE TABLE IF NOT EXISTS public.proyecto_slug_redirects (
  old_slug TEXT PRIMARY KEY,
  new_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.proyecto_slug_redirects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read proyecto slug redirects"
  ON public.proyecto_slug_redirects FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated manage proyecto slug redirects"
  ON public.proyecto_slug_redirects FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

GRANT SELECT ON public.proyecto_slug_redirects TO anon, authenticated;
GRANT ALL ON public.proyecto_slug_redirects TO service_role;

-- Seed with the known bad slugs being fixed in this release
INSERT INTO public.proyecto_slug_redirects (old_slug, new_slug) VALUES
  ('vina-del-maipo', 'tres-mundos'),
  ('bosque-nativo',  'casa-victor')
ON CONFLICT (old_slug) DO NOTHING;
