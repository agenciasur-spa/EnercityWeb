-- Fix project slugs that don't match their actual names
UPDATE public.proyectos SET slug = 'tres-mundos' WHERE slug = 'vina-del-maipo';
UPDATE public.proyectos SET slug = 'casa-victor'  WHERE slug = 'bosque-nativo';
