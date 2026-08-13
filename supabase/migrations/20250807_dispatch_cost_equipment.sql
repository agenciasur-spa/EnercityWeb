-- ============================================
-- EnercityWeb — Dispatch Cost & Equipment Details
-- ============================================

-- Add dispatch cost to comunas table (regional fixed cost)
ALTER TABLE public.comunas 
ADD COLUMN IF NOT EXISTS dispatch_cost NUMERIC(12, 0) DEFAULT 0;

-- Create equipment_details table for inverter and panel information
CREATE TABLE IF NOT EXISTS public.equipment_details (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('inversor', 'panel')),
  nombre TEXT NOT NULL,
  marca TEXT NOT NULL,
  modelo TEXT,
  potencia_watts NUMERIC(6, 2),
  imagen_url TEXT,
  ficha_tecnica_url TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster lookups by type and active status
CREATE INDEX IF NOT EXISTS idx_equipment_details_tipo_activo 
ON public.equipment_details(tipo, activo) 
WHERE activo = true;

-- RLS policies for equipment_details
ALTER TABLE public.equipment_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read equipment_details" ON public.equipment_details 
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Authenticated insert equipment_details" ON public.equipment_details 
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated update equipment_details" ON public.equipment_details 
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated delete equipment_details" ON public.equipment_details 
FOR DELETE TO authenticated USING (true);

-- Update function to automatically set updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_equipment_details
BEFORE UPDATE ON public.equipment_details
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default equipment data (sample GOODWE inverter and TRINA SOLAR panels)
INSERT INTO public.equipment_details (tipo, nombre, marca, modelo, potencia_watts, activo) VALUES
('inversor', 'Inversor GoodWe', 'GoodWe', 'GW3000-NS', 3000.00, true),
('panel', 'Panel Trina Solar', 'Trina Solar', 'Vertex S+ 410W', 410.00, true)
ON CONFLICT DO NOTHING;

-- Seed default dispatch costs (0 for all regions initially - configured by admin)
UPDATE public.comunas SET dispatch_cost = 0 WHERE dispatch_cost IS NULL;