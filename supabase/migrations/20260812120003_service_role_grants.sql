-- ============================================
-- EnercityWeb — service_role grants (admin backend)
-- ============================================
-- The admin panel uses the service_role client (supabaseAdmin), which needs
-- table-level grants to read/write project tables. Additive and idempotent.

DO $$
DECLARE
  t TEXT;
  s TEXT;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO service_role', t);
  END LOOP;

  FOR s IN SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'
  LOOP
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO service_role', s);
  END LOOP;
END $$;
