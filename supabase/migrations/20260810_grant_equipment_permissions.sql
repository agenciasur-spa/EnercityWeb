-- ============================================
-- EnercityWeb — Equipment & Comunas Permission Grants
-- ============================================

-- Public/anonymous SELECT for the read-only equipment catalog
-- used by the simulator (RLS policy already gates active records).
GRANT SELECT ON public.equipment_details TO anon, authenticated;

-- Admin operations use the service_role client (bypasses RLS), so the
-- service role needs explicit table and sequence permissions.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_details TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.equipment_details_id_seq TO service_role;
