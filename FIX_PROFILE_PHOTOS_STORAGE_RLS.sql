-- Fix RLS for client profile photo uploads (anonymous client portal)
-- Execute in Supabase SQL Editor

BEGIN;

-- Storage RLS is enabled by default on storage.objects.
-- Ensure policies exist for the profile-photos bucket.

DROP POLICY IF EXISTS "profile_photos_public_read" ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_public_insert" ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_public_update" ON storage.objects;

CREATE POLICY "profile_photos_public_read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-photos');

CREATE POLICY "profile_photos_public_insert"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'profile-photos');

CREATE POLICY "profile_photos_public_update"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'profile-photos')
WITH CHECK (bucket_id = 'profile-photos');

COMMIT;
