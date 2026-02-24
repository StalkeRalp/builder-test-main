-- Create shared admin events table with RLS and realtime
-- Execute in Supabase SQL Editor

BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  event_type TEXT NOT NULL DEFAULT 'general' CHECK (event_type IN ('meeting', 'delivery', 'deadline', 'task', 'general')),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT admin_events_title_not_empty CHECK (char_length(trim(title)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_admin_events_event_date ON public.admin_events(event_date);
CREATE INDEX IF NOT EXISTS idx_admin_events_project_id ON public.admin_events(project_id);
CREATE INDEX IF NOT EXISTS idx_admin_events_created_by ON public.admin_events(created_by);

CREATE OR REPLACE FUNCTION public.touch_admin_events_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_admin_events_updated_at ON public.admin_events;
CREATE TRIGGER trg_touch_admin_events_updated_at
BEFORE UPDATE ON public.admin_events
FOR EACH ROW
EXECUTE FUNCTION public.touch_admin_events_updated_at();

ALTER TABLE public.admin_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_events_admin_select" ON public.admin_events;
DROP POLICY IF EXISTS "admin_events_admin_insert" ON public.admin_events;
DROP POLICY IF EXISTS "admin_events_admin_update" ON public.admin_events;
DROP POLICY IF EXISTS "admin_events_admin_delete" ON public.admin_events;

CREATE POLICY "admin_events_admin_select"
ON public.admin_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'superadmin')
  )
);

CREATE POLICY "admin_events_admin_insert"
ON public.admin_events
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'superadmin')
  )
);

CREATE POLICY "admin_events_admin_update"
ON public.admin_events
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'superadmin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'superadmin')
  )
);

CREATE POLICY "admin_events_admin_delete"
ON public.admin_events
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'superadmin')
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_events TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'admin_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_events;
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
