-- Add missing project-level client photo column for PIN-based client portal
-- Execute in Supabase SQL Editor

BEGIN;

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS client_photo_url TEXT;

COMMIT;
