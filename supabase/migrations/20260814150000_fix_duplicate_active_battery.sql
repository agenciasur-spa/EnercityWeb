-- ============================================
-- EnercityWeb — Fix duplicate active battery row
-- ============================================
-- The 20260812_hybrid_battery_storage.sql seed guards its INSERT by exact
-- `etiqueta` match ('Batería 15 kWh'). Production had already renamed its
-- single battery to 'Batería 14 kWh', so replaying that migration (to
-- resolve an unrelated CLI migration-history drift) inserted a SECOND
-- active row. `almacenamiento_baterias` is queried with `.single()`
-- wherever activo = true is expected to return exactly one row — with two
-- active rows that query errors out, silently zeroing battery cost and
-- dropping the battery card from the hybrid PDF.
--
-- Restore the invariant: at most one active battery, keeping the earliest
-- (the one actually configured by the team) as canonical.

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
  FROM public.almacenamiento_baterias
  WHERE activo = true
)
UPDATE public.almacenamiento_baterias
SET activo = false
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
