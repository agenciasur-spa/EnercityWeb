-- =============================================
-- Fix: Change admin user role from 'admin' to 'authenticated'
-- =============================================
-- ROOT CAUSE: The admin user was created with role = 'admin' in auth.users.
-- Supabase Auth includes this role in JWT claims, and PostgREST tries to
-- SET ROLE 'admin' which doesn't exist in PostgreSQL (only anon, authenticated,
-- service_role exist). This causes: "role 'admin' does not exist" (error 22023).
--
-- FIX: Set the admin user's role to 'authenticated' (the standard Supabase role).
-- The admin panel uses supabaseAdmin (service_role client) which bypasses RLS,
-- so the PostgreSQL role doesn't need to be custom.
-- =============================================

UPDATE auth.users
SET role = 'authenticated'
WHERE role = 'admin';