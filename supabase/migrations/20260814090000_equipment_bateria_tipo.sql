-- ============================================
-- EnercityWeb — Allow 'bateria' as an equipment_details tipo
-- ============================================
-- Lets the "Catálogo de Equipos" admin manage batteries (image + ficha
-- técnica) alongside inversores and paneles, for the hybrid PDF quote.

ALTER TABLE public.equipment_details DROP CONSTRAINT IF EXISTS equipment_details_tipo_check;
ALTER TABLE public.equipment_details ADD CONSTRAINT equipment_details_tipo_check
  CHECK (tipo IN ('inversor', 'panel', 'bateria'));
