-- Add Blog/Noticias link to navbar and footer
INSERT INTO public.nav_links (location, label, href, sort_order, active)
VALUES
  ('navbar', 'Noticias', '/blog', 60, true),
  ('footer', 'Noticias', '/blog', 60, true)
ON CONFLICT DO NOTHING;
