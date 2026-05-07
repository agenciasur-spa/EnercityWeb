-- Add backgroundImage and backgroundVideo to existing hero section content.
-- The hero row already exists from 20250504_cms_content.sql, so we UPDATE
-- instead of INSERT. Using JSONB || merges new keys without affecting existing ones.

UPDATE public.site_content
SET data = data || '{
  "backgroundImage": "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&q=80",
  "backgroundVideo": null
}'::jsonb
WHERE section = 'hero';
