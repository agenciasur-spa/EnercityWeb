-- ============================================
-- EnercityWeb — Lead battery fields
-- ============================================

-- Track when a simulation requested battery storage and the added cost.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS battery_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS battery_cost NUMERIC(12, 0) NOT NULL DEFAULT 0;
