-- ============================================
-- EnercityWeb — leads.comuna_id must allow NULL
-- ============================================
-- The simulator has moved to a region-based flow: it never resolves a single
-- comuna for a quote (see calculate-quote.ts), so the lead payload never
-- carries a comunaId — only `region`/`comunaRegion`/`comunaNombre` (already
-- columns/fields captured separately). The original NOT NULL constraint from
-- the initial schema predates that shift and made every lead insert fail
-- with "null value in column comuna_id violates not-null constraint".

ALTER TABLE public.leads ALTER COLUMN comuna_id DROP NOT NULL;
