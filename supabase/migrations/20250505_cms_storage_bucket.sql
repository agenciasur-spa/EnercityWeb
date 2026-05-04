-- =============================================
-- CMS Storage: project-images bucket + policies
-- =============================================

-- 1. Create the storage bucket (public = files are publicly accessible via URL)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-images',
  'project-images',
  true,
  5242880,  -- 5MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Policy: Anyone can read (public bucket already does this, but explicit is clearer)
CREATE POLICY "Public read project-images"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'project-images');

-- 3. Policy: Authenticated users can upload
CREATE POLICY "Authenticated upload project-images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'project-images');

-- 4. Policy: Authenticated users can update their uploads
CREATE POLICY "Authenticated update project-images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'project-images')
  WITH CHECK (bucket_id = 'project-images');

-- 5. Policy: Authenticated users can delete
CREATE POLICY "Authenticated delete project-images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'project-images');
