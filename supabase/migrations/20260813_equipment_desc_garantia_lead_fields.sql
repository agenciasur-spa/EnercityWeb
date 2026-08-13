-- ============================================
-- EnercityWeb — Equipment description + warranty fields
-- ============================================

ALTER TABLE public.equipment_details
  ADD COLUMN IF NOT EXISTS descripcion TEXT,
  ADD COLUMN IF NOT EXISTS garantia TEXT;

-- ============================================
-- Lead quote number + region
-- ============================================

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS numero_cotizacion TEXT,
  ADD COLUMN IF NOT EXISTS region TEXT;

-- Grant anon INSERT on leads for new columns (already has INSERT grant)
-- service_role already has full access via service_role_grants migration
