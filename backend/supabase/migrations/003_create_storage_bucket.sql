-- Create storage bucket for product assets (manuals, images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-assets', 'product-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to read from the bucket
CREATE POLICY "Authenticated users can read product assets"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'product-assets');

-- Allow authenticated users to upload to the bucket
CREATE POLICY "Authenticated users can upload product assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-assets');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update product assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-assets')
WITH CHECK (bucket_id = 'product-assets');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete product assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-assets');
