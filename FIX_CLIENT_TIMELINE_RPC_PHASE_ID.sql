-- Fix RPC timeline for schemas where project_images.phase_id does not exist
-- Execute in Supabase SQL Editor

BEGIN;

CREATE OR REPLACE FUNCTION public.get_client_timeline(p_id UUID, p_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    phases_json JSONB;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.projects WHERE id = p_id AND access_pin = p_pin
    ) THEN
        RETURN '[]'::jsonb;
    END IF;

    IF to_regclass('public.project_images') IS NULL THEN
        SELECT COALESCE(
            jsonb_agg(
                to_jsonb(p) || jsonb_build_object('photos', '[]'::jsonb)
                ORDER BY p.start_date ASC
            ),
            '[]'::jsonb
        )
        INTO phases_json
        FROM public.phases p
        WHERE p.project_id = p_id;

        RETURN COALESCE(phases_json, '[]'::jsonb);
    END IF;

    WITH images_grouped AS (
        SELECT
            CASE
                WHEN (to_jsonb(pi) ->> 'phase_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                    THEN ((to_jsonb(pi) ->> 'phase_id')::uuid)
                ELSE NULL
            END AS phase_id,
            COALESCE(
                jsonb_agg(
                    jsonb_build_object(
                        'id', pi.id,
                        'url', to_jsonb(pi) ->> 'url',
                        'thumbnail_url', to_jsonb(pi) ->> 'thumbnail_url',
                        'caption', to_jsonb(pi) ->> 'caption',
                        'phase_name', to_jsonb(pi) ->> 'phase_name',
                        'uploaded_at', to_jsonb(pi) ->> 'uploaded_at'
                    )
                    ORDER BY pi.id DESC
                ),
                '[]'::jsonb
            ) AS photos
        FROM public.project_images pi
        WHERE pi.project_id = p_id
        GROUP BY 1
    )
    SELECT COALESCE(
        jsonb_agg(
            to_jsonb(p) || jsonb_build_object('photos', COALESCE(ig.photos, '[]'::jsonb))
            ORDER BY p.start_date ASC
        ),
        '[]'::jsonb
    )
    INTO phases_json
    FROM public.phases p
    LEFT JOIN images_grouped ig ON ig.phase_id = p.id
    WHERE p.project_id = p_id;

    RETURN COALESCE(phases_json, '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_client_project_images(p_id UUID, p_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.projects WHERE id = p_id AND access_pin = p_pin
    ) THEN
        RETURN '[]'::jsonb;
    END IF;

    IF to_regclass('public.project_images') IS NULL THEN
        RETURN '[]'::jsonb;
    END IF;

    RETURN COALESCE(
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', pi.id,
                    'project_id', pi.project_id,
                    'url', to_jsonb(pi) ->> 'url',
                    'thumbnail_url', to_jsonb(pi) ->> 'thumbnail_url',
                    'caption', to_jsonb(pi) ->> 'caption',
                    'phase_id', to_jsonb(pi) ->> 'phase_id',
                    'phase_name', to_jsonb(pi) ->> 'phase_name',
                    'uploaded_at', to_jsonb(pi) ->> 'uploaded_at'
                )
                ORDER BY pi.id DESC
            )
            FROM public.project_images pi
            WHERE pi.project_id = p_id
        ),
        '[]'::jsonb
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_timeline(UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_client_project_images(UUID, TEXT) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
