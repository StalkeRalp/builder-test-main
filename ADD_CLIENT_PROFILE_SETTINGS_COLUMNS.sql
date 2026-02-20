-- Add project-level fields used by client profile persistence
-- Execute in Supabase SQL Editor

BEGIN;

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS client_photo_url TEXT;

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS client_contact_preferences JSONB
DEFAULT '{"email": false, "phone": false, "chat": false}'::jsonb;

COMMIT;
