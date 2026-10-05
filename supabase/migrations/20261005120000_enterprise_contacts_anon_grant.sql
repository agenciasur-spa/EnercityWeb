-- ============================================
-- EnercityWeb — Enterprise contacts anon INSERT grant
-- ============================================
-- 20260701_create_enterprise_contacts.sql created enterprise_contacts with
-- an RLS policy for anon INSERT but never granted the underlying table-level
-- INSERT privilege. RLS policies only gate row visibility once a role already
-- has the privilege on the table; without the GRANT, anon gets 42501.

GRANT INSERT ON public.enterprise_contacts TO anon;
