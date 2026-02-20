-- Fix client RPC functions for Supabase schema cache/signature mismatch
-- Execute this in Supabase SQL Editor.

BEGIN;

-- Remove conflicting signatures if they exist
DROP FUNCTION IF EXISTS public.login_client(TEXT);
DROP FUNCTION IF EXISTS public.login_client(UUID, TEXT);

DROP FUNCTION IF EXISTS public.get_project_details_for_client(UUID, TEXT);

-- 1) Client login by project id + PIN (returns project + optional profile)
CREATE OR REPLACE FUNCTION public.login_client(p_id UUID, p_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    project_record RECORD;
    member_user_id UUID;
    profile_record RECORD;
    result JSONB;
BEGIN
    SELECT *
    INTO project_record
    FROM public.projects
    WHERE id = p_id
      AND access_pin = p_pin;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    result := to_jsonb(project_record);

    -- Optional linked client profile via project_members.user_id
    SELECT pm.user_id
    INTO member_user_id
    FROM public.project_members pm
    WHERE pm.project_id = project_record.id
      AND pm.user_id IS NOT NULL
    ORDER BY pm.created_at ASC
    LIMIT 1;

    IF member_user_id IS NOT NULL THEN
        SELECT *
        INTO profile_record
        FROM public.profiles
        WHERE id = member_user_id;
    END IF;

    -- Keep a stable client_id field for frontend compatibility
    result := result || jsonb_build_object('client_id', member_user_id);

    IF profile_record IS NOT NULL THEN
        result := result || jsonb_build_object('profiles', to_jsonb(profile_record));
    END IF;

    RETURN result;
END;
$$;

-- 2) Secure project details for client pages
CREATE OR REPLACE FUNCTION public.get_project_details_for_client(p_id UUID, p_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    project_data JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', id,
        'client_id', (
            SELECT pm.user_id
            FROM public.project_members pm
            WHERE pm.project_id = p.id
              AND pm.user_id IS NOT NULL
            ORDER BY pm.created_at ASC
            LIMIT 1
        ),
        'name', name,
        'description', description,
        'project_type', project_type,
        'client_name', client_name,
        'client_email', client_email,
        'client_phone', client_phone,
        'project_manager', project_manager,
        'manager_email', manager_email,
        'status', status,
        'progress', progress,
        'budget', budget,
        'start_date', start_date,
        'end_date', end_date,
        'created_at', created_at
    )
    INTO project_data
    FROM public.projects p
    WHERE id = p_id
      AND access_pin = p_pin;

    IF project_data IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN project_data;
END;
$$;

-- Permissions for unauthenticated client portal access
GRANT EXECUTE ON FUNCTION public.login_client(UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_project_details_for_client(UUID, TEXT) TO anon, authenticated, service_role;

-- Ask PostgREST (RPC) to refresh schema cache immediately
NOTIFY pgrst, 'reload schema';

COMMIT;
