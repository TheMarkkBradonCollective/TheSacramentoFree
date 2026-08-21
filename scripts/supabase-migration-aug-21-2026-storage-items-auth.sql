-- Listing photo bucket: require a signed-in owner path (or staff delete).
-- Drops leftover unauthenticated write/delete policies from older schema dumps.

-- audit-49-storage-items-auth

DROP POLICY IF EXISTS "Public upload items bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public update items bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public delete items bucket" ON storage.objects;
DROP POLICY IF EXISTS "items_storage_read" ON storage.objects;
DROP POLICY IF EXISTS "items_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "items_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "items_storage_delete" ON storage.objects;

CREATE POLICY "items_storage_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'items');

CREATE POLICY "items_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'items'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "items_storage_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'items'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "items_storage_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'items'
    AND (
      (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
      OR public.is_staff()
    )
  );
