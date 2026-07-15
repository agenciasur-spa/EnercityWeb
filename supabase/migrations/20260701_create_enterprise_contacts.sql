-- ============================================
-- EnercityWeb — Enterprise Contact Form Table
-- ============================================

CREATE TABLE IF NOT EXISTS public.enterprise_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    email TEXT NOT NULL,
    telefono TEXT,
    empresa TEXT NOT NULL,
    rut TEXT NOT NULL,
    costo_electrico TEXT NOT NULL,
    region TEXT NOT NULL,
    metodo_contacto TEXT NOT NULL,
    mensaje TEXT,
    estado TEXT NOT NULL DEFAULT 'nuevo',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.enterprise_contacts ENABLE ROW LEVEL SECURITY;

-- Allow anon insert (enterprise contact form is public)
CREATE POLICY "Allow anon insert on enterprise_contacts"
    ON public.enterprise_contacts
    FOR INSERT TO anon
    WITH CHECK (true);

-- Allow authenticated read (admin panel)
CREATE POLICY "Allow authenticated read on enterprise_contacts"
    ON public.enterprise_contacts
    FOR SELECT TO authenticated
    USING (true);

-- Indexes for admin sorting/filtering
CREATE INDEX IF NOT EXISTS idx_enterprise_contacts_created_at
    ON public.enterprise_contacts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_enterprise_contacts_estado
    ON public.enterprise_contacts (estado);
