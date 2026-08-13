-- ============================================
-- EnercityWeb — Public simulator read grants
-- ============================================
-- The simulator's public API reads kits, comunas and variables to
-- calculate quotes. RLS policies gate row visibility; these table-level
-- grants let the anon/authenticated roles actually SELECT.

GRANT SELECT ON public.precios_kits TO anon, authenticated;
GRANT SELECT ON public.comunas TO anon, authenticated;
GRANT SELECT ON public.variables_techo TO anon, authenticated;
GRANT SELECT ON public.variables_medidor TO anon, authenticated;
GRANT SELECT ON public.settings TO anon, authenticated;
