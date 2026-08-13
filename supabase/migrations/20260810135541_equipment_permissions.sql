-- =============================================
-- Equipment Details Permissions Migration
-- =============================================
-- This migration grants explicit permissions for equipment_details table
-- to ensure proper database access for both public and admin operations
-- while preserving existing RLS policies and On-Grid scope.
-- =============================================

-- Grant SELECT on equipment_details to anon and authenticated roles
-- This supports the public read-only equipment endpoint
GRANT SELECT ON public.equipment_details TO anon;
GRANT SELECT ON public.equipment_details TO authenticated;

-- Grant full table permissions to service_role for admin operations
-- This ensures the admin API endpoints can perform CRUD operations
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_details TO service_role;

-- Grant sequence permissions to service_role for auto-incrementing IDs
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Note: RLS policies are preserved from the original migration:
-- - Public read equipment_details (SELECT for anon, authenticated)
-- - Authenticated insert equipment_details (INSERT for authenticated)
-- - Authenticated update equipment_details (UPDATE for authenticated)
-- - Authenticated delete equipment_details (DELETE for authenticated)
--
-- The service_role bypasses RLS, so explicit grants ensure admin operations work
-- regardless of RLS policy configuration.