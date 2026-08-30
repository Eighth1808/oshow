-- ============================================
-- Storage bucket for event cover images
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images
CREATE POLICY storage_images_insert ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'images');

-- Allow public read access
CREATE POLICY storage_images_select ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'images');

-- Allow owners to update/delete their uploads
CREATE POLICY storage_images_update ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY storage_images_delete ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);
