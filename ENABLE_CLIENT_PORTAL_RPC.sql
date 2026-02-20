-- Bridge RPC functions for client portal (anonymous ProjectID + PIN access)
-- Execute in Supabase SQL Editor after FIX_CLIENT_RPC_FUNCTIONS.sql

BEGIN;

DROP FUNCTION IF EXISTS public.get_client_timeline(UUID, TEXT);
DROP FUNCTION IF EXISTS public.get_client_documents(UUID, TEXT);
DROP FUNCTION IF EXISTS public.get_client_messages(UUID, TEXT);
DROP FUNCTION IF EXISTS public.send_client_message(UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.mark_client_messages_read(UUID, TEXT);
DROP FUNCTION IF EXISTS public.get_client_tickets(UUID, TEXT);
DROP FUNCTION IF EXISTS public.create_client_ticket(UUID, TEXT, TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.get_client_profile(UUID, TEXT);
DROP FUNCTION IF EXISTS public.update_client_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.update_client_profile_photo(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.update_client_profile_preferences(UUID, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.get_client_project_images(UUID, TEXT);

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
    ELSE
        EXECUTE $q$
            WITH images_grouped AS (
                SELECT
                    pi.phase_id,
                    COALESCE(
                        jsonb_agg(
                            jsonb_build_object(
                                'id', pi.id,
                                'url', pi.url,
                                'thumbnail_url', pi.thumbnail_url,
                                'caption', pi.caption,
                                'phase_name', pi.phase_name,
                                'uploaded_at', pi.uploaded_at
                            )
                            ORDER BY pi.uploaded_at DESC
                        ),
                        '[]'::jsonb
                    ) AS photos
                FROM public.project_images pi
                WHERE pi.project_id = $1
                GROUP BY pi.phase_id
            )
            SELECT COALESCE(
                jsonb_agg(
                    to_jsonb(p) || jsonb_build_object('photos', COALESCE(ig.photos, '[]'::jsonb))
                    ORDER BY p.start_date ASC
                ),
                '[]'::jsonb
            )
            FROM public.phases p
            LEFT JOIN images_grouped ig ON ig.phase_id = p.id
            WHERE p.project_id = $1
        $q$
        INTO phases_json
        USING p_id;
    END IF;

    RETURN COALESCE(phases_json, '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_client_documents(p_id UUID, p_pin TEXT)
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

    RETURN COALESCE(
        (
            SELECT jsonb_agg(to_jsonb(d) ORDER BY d.created_at DESC)
            FROM public.documents d
            WHERE d.project_id = p_id
              AND COALESCE(d.is_public, true) = true
        ),
        '[]'::jsonb
    );
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
                    'url', pi.url,
                    'thumbnail_url', pi.thumbnail_url,
                    'caption', pi.caption,
                    'phase_id', pi.phase_id,
                    'phase_name', pi.phase_name,
                    'uploaded_at', pi.uploaded_at
                )
                ORDER BY pi.uploaded_at DESC
            )
            FROM public.project_images pi
            WHERE pi.project_id = p_id
        ),
        '[]'::jsonb
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_client_messages(p_id UUID, p_pin TEXT)
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

    RETURN COALESCE(
        (
            SELECT jsonb_agg(to_jsonb(m) ORDER BY m.created_at ASC)
            FROM public.messages m
            WHERE m.project_id = p_id
        ),
        '[]'::jsonb
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.send_client_message(
    p_id UUID,
    p_pin TEXT,
    p_content TEXT,
    p_sender_name TEXT DEFAULT 'Client',
    p_photo_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    inserted_row JSONB;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.projects WHERE id = p_id AND access_pin = p_pin
    ) THEN
        RAISE EXCEPTION 'Invalid Project ID or PIN';
    END IF;

    INSERT INTO public.messages (
        project_id,
        sender_role,
        sender_name,
        content
    )
    VALUES (
        p_id,
        'client',
        COALESCE(NULLIF(TRIM(p_sender_name), ''), 'Client'),
        COALESCE(NULLIF(TRIM(p_content), ''), '[Message vide]')
    )
    RETURNING to_jsonb(messages.*) INTO inserted_row;

    RETURN inserted_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_client_messages_read(p_id UUID, p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.projects WHERE id = p_id AND access_pin = p_pin
    ) THEN
        RETURN false;
    END IF;

    -- Only works if a "read" column exists in your messages table
    BEGIN
        UPDATE public.messages
        SET read = true
        WHERE project_id = p_id
          AND sender_role = 'admin';
    EXCEPTION
        WHEN undefined_column THEN
            RETURN true;
    END;

    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_client_tickets(p_id UUID, p_pin TEXT)
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

    RETURN COALESCE(
        (
            SELECT jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC)
            FROM public.tickets t
            WHERE t.project_id = p_id
        ),
        '[]'::jsonb
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_client_ticket(
    p_id UUID,
    p_pin TEXT,
    p_title TEXT,
    p_description TEXT,
    p_priority TEXT DEFAULT 'medium',
    p_tags JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    inserted_row JSONB;
    has_title BOOLEAN;
    has_subject BOOLEAN;
    has_description BOOLEAN;
    has_message BOOLEAN;
    has_created_by BOOLEAN;
    has_created_by_role BOOLEAN;
    has_created_by_email BOOLEAN;
    project_client_email TEXT;
    project_created_by UUID;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.projects WHERE id = p_id AND access_pin = p_pin
    ) THEN
        RAISE EXCEPTION 'Invalid Project ID or PIN';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'title'
    ) INTO has_title;

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'subject'
    ) INTO has_subject;

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'description'
    ) INTO has_description;

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'message'
    ) INTO has_message;

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'created_by_role'
    ) INTO has_created_by_role;

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'created_by_email'
    ) INTO has_created_by_email;

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'created_by'
    ) INTO has_created_by;

    SELECT client_email, created_by
    INTO project_client_email, project_created_by
    FROM public.projects
    WHERE id = p_id
    LIMIT 1;

    IF has_title THEN
        IF has_created_by_role AND has_created_by_email THEN
            IF has_created_by THEN
                INSERT INTO public.tickets (
                    project_id,
                    title,
                    description,
                    status,
                    priority,
                    created_by,
                    created_by_role,
                    created_by_email
                )
                VALUES (
                    p_id,
                    COALESCE(NULLIF(TRIM(p_title), ''), 'Nouveau ticket'),
                    COALESCE(NULLIF(TRIM(p_description), ''), ''),
                    'open',
                    COALESCE(NULLIF(TRIM(p_priority), ''), 'medium'),
                    project_created_by,
                    'client',
                    project_client_email
                )
                RETURNING to_jsonb(tickets.*) INTO inserted_row;
            ELSE
                INSERT INTO public.tickets (
                    project_id,
                    title,
                    description,
                    status,
                    priority,
                    created_by_role,
                    created_by_email
                )
                VALUES (
                    p_id,
                    COALESCE(NULLIF(TRIM(p_title), ''), 'Nouveau ticket'),
                    COALESCE(NULLIF(TRIM(p_description), ''), ''),
                    'open',
                    COALESCE(NULLIF(TRIM(p_priority), ''), 'medium'),
                    'client',
                    project_client_email
                )
                RETURNING to_jsonb(tickets.*) INTO inserted_row;
            END IF;
        ELSE
            IF has_created_by THEN
                INSERT INTO public.tickets (
                    project_id,
                    title,
                    description,
                    status,
                    priority,
                    created_by
                )
                VALUES (
                    p_id,
                    COALESCE(NULLIF(TRIM(p_title), ''), 'Nouveau ticket'),
                    COALESCE(NULLIF(TRIM(p_description), ''), ''),
                    'open',
                    COALESCE(NULLIF(TRIM(p_priority), ''), 'medium'),
                    project_created_by
                )
                RETURNING to_jsonb(tickets.*) INTO inserted_row;
            ELSE
                INSERT INTO public.tickets (
                    project_id,
                    title,
                    description,
                    status,
                    priority
                )
                VALUES (
                    p_id,
                    COALESCE(NULLIF(TRIM(p_title), ''), 'Nouveau ticket'),
                    COALESCE(NULLIF(TRIM(p_description), ''), ''),
                    'open',
                    COALESCE(NULLIF(TRIM(p_priority), ''), 'medium')
                )
                RETURNING to_jsonb(tickets.*) INTO inserted_row;
            END IF;
        END IF;
    ELSIF has_subject THEN
        IF has_created_by THEN
            INSERT INTO public.tickets (
                project_id,
                subject,
                message,
                status,
                priority,
                created_by
            )
            VALUES (
                p_id,
                COALESCE(NULLIF(TRIM(p_title), ''), 'Nouveau ticket'),
                COALESCE(NULLIF(TRIM(p_description), ''), ''),
                'open',
                COALESCE(NULLIF(TRIM(p_priority), ''), 'medium'),
                project_created_by
            )
            RETURNING to_jsonb(tickets.*) INTO inserted_row;
        ELSE
            INSERT INTO public.tickets (
                project_id,
                subject,
                message,
                status,
                priority
            )
            VALUES (
                p_id,
                COALESCE(NULLIF(TRIM(p_title), ''), 'Nouveau ticket'),
                COALESCE(NULLIF(TRIM(p_description), ''), ''),
                'open',
                COALESCE(NULLIF(TRIM(p_priority), ''), 'medium')
            )
            RETURNING to_jsonb(tickets.*) INTO inserted_row;
        END IF;
    ELSE
        RAISE EXCEPTION 'Tickets schema mismatch: expected title/description or subject/message columns';
    END IF;

    RETURN inserted_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_client_profile(p_id UUID, p_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    project_row RECORD;
    member_user_id UUID;
    profile_row RECORD;
    project_photo_url TEXT;
    profile_avatar_url TEXT;
BEGIN
    SELECT *
    INTO project_row
    FROM public.projects
    WHERE id = p_id
      AND access_pin = p_pin;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    SELECT pm.user_id
    INTO member_user_id
    FROM public.project_members pm
    WHERE pm.project_id = p_id
      AND pm.user_id IS NOT NULL
    ORDER BY pm.created_at ASC
    LIMIT 1;

    IF member_user_id IS NOT NULL THEN
        SELECT *
        INTO profile_row
        FROM public.profiles
        WHERE id = member_user_id;
    END IF;

    project_photo_url := COALESCE(to_jsonb(project_row)->>'client_photo_url', NULL);

    IF profile_row IS NOT NULL THEN
        profile_avatar_url := COALESCE(
            to_jsonb(profile_row)->>'avatar_url',
            to_jsonb(profile_row)->>'photo_url',
            project_photo_url
        );

        RETURN to_jsonb(profile_row)
            || jsonb_build_object('id', member_user_id)
            || jsonb_build_object('name', COALESCE(NULLIF(TRIM(profile_row.full_name), ''), project_row.client_name))
            || jsonb_build_object('email', COALESCE(NULLIF(TRIM(profile_row.email), ''), project_row.client_email))
            || jsonb_build_object('photo_url', profile_avatar_url)
            || jsonb_build_object(
                'contactPreferences',
                COALESCE(
                    (to_jsonb(project_row)->'client_contact_preferences'),
                    jsonb_build_object('email', false, 'phone', false, 'chat', false)
                )
            );
    END IF;

    RETURN jsonb_build_object(
        'id', member_user_id,
        'name', project_row.client_name,
        'email', project_row.client_email,
        'phone', project_row.client_phone,
        'photo_url', project_photo_url,
        'contactPreferences',
        COALESCE(
            (to_jsonb(project_row)->'client_contact_preferences'),
            jsonb_build_object('email', false, 'phone', false, 'chat', false)
        )
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_client_profile(
    p_id UUID,
    p_pin TEXT,
    p_name TEXT,
    p_email TEXT,
    p_phone TEXT,
    p_company TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    member_user_id UUID;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.projects WHERE id = p_id AND access_pin = p_pin
    ) THEN
        RAISE EXCEPTION 'Invalid Project ID or PIN';
    END IF;

    UPDATE public.projects
    SET
        client_name = COALESCE(NULLIF(TRIM(p_name), ''), client_name),
        client_email = COALESCE(NULLIF(TRIM(p_email), ''), client_email),
        client_phone = COALESCE(NULLIF(TRIM(p_phone), ''), client_phone),
        updated_at = NOW()
    WHERE id = p_id;

    SELECT pm.user_id
    INTO member_user_id
    FROM public.project_members pm
    WHERE pm.project_id = p_id
      AND pm.user_id IS NOT NULL
    ORDER BY pm.created_at ASC
    LIMIT 1;

    IF member_user_id IS NOT NULL THEN
        BEGIN
            UPDATE public.profiles
            SET
                full_name = COALESCE(NULLIF(TRIM(p_name), ''), full_name),
                email = COALESCE(NULLIF(TRIM(p_email), ''), email),
                phone = COALESCE(NULLIF(TRIM(p_phone), ''), phone)
            WHERE id = member_user_id;
        EXCEPTION
            WHEN undefined_column THEN
                NULL;
        END;
    END IF;

    RETURN public.get_client_profile(p_id, p_pin);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_client_profile_preferences(
    p_id UUID,
    p_pin TEXT,
    p_contact_preferences JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.projects WHERE id = p_id AND access_pin = p_pin
    ) THEN
        RAISE EXCEPTION 'Invalid Project ID or PIN';
    END IF;

    BEGIN
        UPDATE public.projects
        SET
            client_contact_preferences = COALESCE(
                p_contact_preferences,
                jsonb_build_object('email', false, 'phone', false, 'chat', false)
            ),
            updated_at = NOW()
        WHERE id = p_id;
    EXCEPTION
        WHEN undefined_column THEN
            NULL;
    END;

    RETURN public.get_client_profile(p_id, p_pin);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_client_profile_photo(
    p_id UUID,
    p_pin TEXT,
    p_photo_url TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    member_user_id UUID;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.projects WHERE id = p_id AND access_pin = p_pin
    ) THEN
        RAISE EXCEPTION 'Invalid Project ID or PIN';
    END IF;

    BEGIN
        UPDATE public.projects
        SET
            client_photo_url = NULLIF(TRIM(p_photo_url), ''),
            updated_at = NOW()
        WHERE id = p_id;
    EXCEPTION
        WHEN undefined_column THEN
            NULL;
    END;

    SELECT pm.user_id
    INTO member_user_id
    FROM public.project_members pm
    WHERE pm.project_id = p_id
      AND pm.user_id IS NOT NULL
    ORDER BY pm.created_at ASC
    LIMIT 1;

    IF member_user_id IS NOT NULL THEN
        BEGIN
            UPDATE public.profiles
            SET avatar_url = NULLIF(TRIM(p_photo_url), '')
            WHERE id = member_user_id;
        EXCEPTION
            WHEN undefined_column THEN
                BEGIN
                    UPDATE public.profiles
                    SET photo_url = NULLIF(TRIM(p_photo_url), '')
                    WHERE id = member_user_id;
                EXCEPTION
                    WHEN undefined_column THEN
                        NULL;
                END;
        END;
    END IF;

    RETURN public.get_client_profile(p_id, p_pin);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_timeline(UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_client_documents(UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_client_messages(UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_client_project_images(UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.send_client_message(UUID, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_client_messages_read(UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_client_tickets(UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_client_ticket(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_client_profile(UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_client_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_client_profile_photo(UUID, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_client_profile_preferences(UUID, TEXT, JSONB) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
