-- ============================================
-- EnercityWeb — Simulator Q4 Foundation
-- Adds pricing columns, variables_techo, variables_medidor tables,
-- re-seeds precios_kits with 21 rows from Excel, cleans obsolete settings.
-- ============================================

-- 1. Temporarily drop FK constraint from leads.kit_id → precios_kits.id
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_kit_id_fkey;

-- 2. Add new columns to precios_kits
ALTER TABLE public.precios_kits
    ADD COLUMN IF NOT EXISTS rango_desde INTEGER,
    ADD COLUMN IF NOT EXISTS rango_hasta INTEGER,
    ADD COLUMN IF NOT EXISTS precio_lista NUMERIC,
    ADD COLUMN IF NOT EXISTS precio_transferencia NUMERIC,
    ADD COLUMN IF NOT EXISTS potencia_panel NUMERIC,
    ADD COLUMN IF NOT EXISTS potencia_total_sistema NUMERIC,
    ADD COLUMN IF NOT EXISTS generacion_anual INTEGER;

-- 3. Create variables_techo table
CREATE TABLE IF NOT EXISTS public.variables_techo (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre TEXT NOT NULL,
    factor NUMERIC NOT NULL,
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create variables_medidor table
CREATE TABLE IF NOT EXISTS public.variables_medidor (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre TEXT NOT NULL,
    factor NUMERIC NOT NULL,
    descripcion TEXT,
    requiere_visita_tecnica BOOLEAN NOT NULL DEFAULT false,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for variables_techo
ALTER TABLE public.variables_techo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read variables_techo"
    ON public.variables_techo FOR SELECT
    TO anon, authenticated USING (true);

CREATE POLICY "Authenticated CRUD variables_techo"
    ON public.variables_techo FOR ALL
    TO authenticated USING (true) WITH CHECK (true);

-- RLS for variables_medidor
ALTER TABLE public.variables_medidor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read variables_medidor"
    ON public.variables_medidor FOR SELECT
    TO anon, authenticated USING (true);

CREATE POLICY "Authenticated CRUD variables_medidor"
    ON public.variables_medidor FOR ALL
    TO authenticated USING (true) WITH CHECK (true);

-- 5. Truncate and re-seed precios_kits with 21 rows from Excel
TRUNCATE TABLE public.precios_kits RESTART IDENTITY CASCADE;

INSERT INTO public.precios_kits
    (rango_desde, rango_hasta, inversor_kw, paneles, potencia_panel,
     potencia_total_sistema, generacion_anual, precio_transferencia, precio_lista,
     consumo_bruto, kwp, precio_neto_base)
VALUES
    (0,       50671,  2,  4, 610, 2.44,  3416,  4650243,  5166937,  0,       2.44,  4650243),
    (50672,   63338,  2,  5, 610, 3.05,  4270,  4904428,  5449364,  50672,   3.05,  4904428),
    (63339,   76006,  3,  6, 610, 3.66,  5124,  4829379,  5365977,  63339,   3.66,  4829379),
    (76007,   88674,  3,  7, 610, 4.27,  5978,  5350996,  5945551,  76007,   4.27,  5350996),
    (88675,  101341,  4,  8, 610, 4.88,  6832,  5744808,  6383120,  88675,   4.88,  5744808),
    (101342, 114009,  4,  9, 610, 5.49,  7686,  5985897,  6650997,  101342,  5.49,  5985897),
    (114010, 126677,  5, 10, 610, 6.10,  8540,  6213682,  6904091,  114010,  6.10,  6213682),
    (126678, 139344,  5, 11, 610, 6.71,  9394,  6542219,  7269132,  126678,  6.71,  6542219),
    (139345, 152012,  5, 12, 610, 7.32, 10248,  6773489,  7526098,  139345,  7.32,  6773489),
    (152013, 164680,  6, 13, 610, 7.93, 11102,  7070080,  7855645,  152013,  7.93,  7070080),
    (164681, 177347,  6, 14, 610, 8.54, 11956,  7418984,  8243315,  164681,  8.54,  7418984),
    (177348, 190015,  8, 15, 610, 9.15, 12810,  7902648,  8780720,  177348,  9.15,  7902648),
    (190016, 202683,  8, 16, 610, 9.76, 13664,  8093495,  8992772,  190016,  9.76,  8093495),
    (202684, 215350,  8, 17, 610, 10.37, 14518, 8494470,  9438300,  202684, 10.37, 8494470),
    (215351, 228018,  8, 18, 610, 10.98, 15372, 8846772,  9829747,  215351, 10.98, 8846772),
    (228019, 240686,  8, 19, 610, 11.59, 16226, 9314340, 10349267, 228019, 11.59, 9314340),
    (240687, 253353, 10, 20, 610, 12.20, 17080, 9516641, 10574046, 240687, 12.20, 9516641),
    (253354, 266021, 10, 21, 610, 12.81, 17934, 9784545, 10871716, 253354, 12.81, 9784545),
    (266022, 278689, 10, 22, 610, 13.42, 18788, 10783662, 11981847, 266022, 13.42, 10783662),
    (278690, 291356, 10, 23, 610, 14.03, 19642, 11259543, 12510604, 278690, 14.03, 11259543),
    (291357, 404024, 10, 24, 610, 14.64, 20496, 11738477, 13042752, 291357, 14.64, 11738477);

-- 6. Seed variables_techo (4 rows)
INSERT INTO public.variables_techo (nombre, factor, descripcion) VALUES
    ('Inclinado con Teja asfaltica',                   1.0,  'Sin recargo'),
    ('Inclinado con lata de zinc',                     1.01, 'Recargo 1%'),
    ('Casa Mediterranea (Plano)',                      1.02, 'Recargo 2%'),
    ('Inclinado con Teja Chilena/colonia/arcilla',     1.10, 'Recargo 10%');

-- 7. Seed variables_medidor (3 rows)
INSERT INTO public.variables_medidor (nombre, factor, descripcion, requiere_visita_tecnica) VALUES
    ('Pegado a la pared',  1.0,  'Sin recargo',                           false),
    ('En la reja',         1.04, 'Recargo 4%',                             false),
    ('Fuera de la casa',   1.0,  'Requiere revisión en visita técnica',     true);

-- 8. Re-add FK constraint on leads.kit_id → precios_kits.id
ALTER TABLE public.leads
    ADD CONSTRAINT leads_kit_id_fkey
    FOREIGN KEY (kit_id) REFERENCES public.precios_kits(id);

-- 9. Remove obsolete settings
DELETE FROM public.settings WHERE key IN ('costo_medidor_reja', 'factor_teja');
