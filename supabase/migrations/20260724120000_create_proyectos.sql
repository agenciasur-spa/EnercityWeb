-- ============================================
-- EnercityWeb — Projects detail page
-- Creates `proyectos` table for detailed project showcase
-- with technical specs, gallery, and segment filtering.
-- ============================================

CREATE TABLE IF NOT EXISTS public.proyectos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    segmento TEXT NOT NULL DEFAULT 'Industrial',
    descripcion TEXT,
    imagen_portada TEXT,
    potencia_kwp NUMERIC,
    generacion_mwh_anual NUMERIC,
    cantidad_paneles INTEGER,
    marca_panel TEXT,
    cantidad_inversores INTEGER,
    marca_inversor TEXT,
    tipo_estructura TEXT,
    ubicacion TEXT,
    region TEXT,
    ano INTEGER,
    cliente TEXT,
    galeria JSONB NOT NULL DEFAULT '[]'::jsonb,
    activo BOOLEAN NOT NULL DEFAULT true,
    orden INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for listing queries
CREATE INDEX IF NOT EXISTS idx_proyectos_activo_orden
    ON public.proyectos (activo, orden);

CREATE INDEX IF NOT EXISTS idx_proyectos_segmento
    ON public.proyectos (segmento);

-- RLS
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;

-- Public can read active projects
CREATE POLICY "Public read active proyectos"
    ON public.proyectos FOR SELECT
    TO anon, authenticated
    USING (activo = true);

-- Authenticated can do everything
CREATE POLICY "Authenticated CRUD proyectos"
    ON public.proyectos FOR ALL
    TO authenticated
    USING (true) WITH CHECK (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_proyectos_updated_at ON public.proyectos;
CREATE TRIGGER trigger_proyectos_updated_at
    BEFORE UPDATE ON public.proyectos
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- Seed: migrate existing carousel projects into new table
-- ============================================
INSERT INTO public.proyectos (slug, nombre, segmento, descripcion, imagen_portada, ubicacion, ano, activo, orden)
SELECT
    lower(unaccent(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))) AS slug,
    name AS nombre,
    COALESCE(type, 'Industrial') AS segmento,
    NULL AS descripcion,
    image_url AS imagen_portada,
    NULL AS ubicacion,
    EXTRACT(YEAR FROM now())::INTEGER AS ano,
    active AS activo,
    sort_order AS orden
FROM public.projects
WHERE NOT EXISTS (
    SELECT 1 FROM public.proyectos p WHERE p.nombre = public.projects.name
)
ON CONFLICT (slug) DO NOTHING;
