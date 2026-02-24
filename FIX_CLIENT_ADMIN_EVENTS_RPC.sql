-- Expose admin events to client portal in read-only mode
-- Execute in Supabase SQL Editor

BEGIN;

CREATE OR REPLACE FUNCTION public.get_client_admin_events(
    p_id UUID,
    p_pin TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.projects
        WHERE id = p_id
          AND access_pin = p_pin
    ) THEN
        RETURN '[]'::jsonb;
    END IF;

    IF to_regclass('public.admin_events') IS NULL THEN
        RETURN '[]'::jsonb;
    END IF;

    RETURN COALESCE(
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', e.id,
                    'title', e.title,
                    'event_date', e.event_date,
                    'event_time', e.event_time,
                    'priority', e.priority,
                    'event_type', e.event_type,
                    'project_id', e.project_id,
                    'notes', e.notes,
                    'created_at', e.created_at
                )
                ORDER BY e.event_date ASC, e.event_time ASC NULLS LAST, e.created_at DESC
            )
            FROM public.admin_events e
            WHERE e.project_id IS NULL OR e.project_id = p_id
        ),
        '[]'::jsonb
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_admin_events(UUID, TEXT) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
