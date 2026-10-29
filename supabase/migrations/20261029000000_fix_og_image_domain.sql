-- Fix og:image URLs that still point to the old domain paneles-solares.cl
UPDATE open_graph_data
SET image_url = REPLACE(image_url, 'https://paneles-solares.cl', 'https://enercity.cl')
WHERE image_url LIKE '%paneles-solares.cl%';
