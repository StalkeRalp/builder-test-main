-- ========================================
-- SUPERADMIN RPC: LIST AUTH USERS + PROMOTE TO ADMIN
-- ========================================

CREATE OR REPLACE FUNCTION public.get_superadmin_auth_users(
    p_search TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 200
)
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    created_at TIMESTAMPTZ,
    last_sign_in_at TIMESTAMPTZ,
    email_confirmed_at TIMESTAMPTZ,
    profile_role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 200), 1), 500);
    v_query TEXT := LOWER(TRIM(COALESCE(p_search, '')));
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND LOWER(COALESCE(p.role, '')) = 'superadmin'
    ) THEN
        RAISE EXCEPTION 'Accès réservé au superadmin';
    END IF;

    RETURN QUERY
    SELECT
        u.id::UUID,
        u.email::TEXT,
        COALESCE(
            NULLIF(TRIM((u.raw_user_meta_data ->> 'name')), ''),
            NULLIF(TRIM((u.raw_user_meta_data ->> 'full_name')), ''),
            NULLIF(TRIM(p.full_name), ''),
            'Utilisateur'
        )::TEXT AS full_name,
        u.created_at::TIMESTAMPTZ,
        u.last_sign_in_at::TIMESTAMPTZ,
        u.email_confirmed_at::TIMESTAMPTZ,
        p.role::TEXT AS profile_role
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE (
        v_query = ''
        OR LOWER(COALESCE(u.email, '')) LIKE '%' || v_query || '%'
        OR LOWER(COALESCE(p.full_name, '')) LIKE '%' || v_query || '%'
        OR LOWER(COALESCE(u.raw_user_meta_data ->> 'name', '')) LIKE '%' || v_query || '%'
        OR LOWER(COALESCE(u.raw_user_meta_data ->> 'full_name', '')) LIKE '%' || v_query || '%'
    )
    ORDER BY COALESCE(u.last_sign_in_at, u.created_at) DESC
    LIMIT v_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.promote_auth_user_to_admin(
    p_user_id UUID,
    p_role TEXT DEFAULT 'admin',
    p_full_name TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_role TEXT := LOWER(TRIM(COALESCE(p_role, 'admin')));
    v_target_user_id UUID := p_user_id;
    v_email TEXT;
    v_name TEXT;
    v_legacy_email TEXT;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND LOWER(COALESCE(p.role, '')) = 'superadmin'
    ) THEN
        RAISE EXCEPTION 'Accès réservé au superadmin';
    END IF;

    IF v_target_user_id IS NULL THEN
        RAISE EXCEPTION 'Utilisateur requis';
    END IF;

    IF v_role NOT IN ('admin', 'superadmin') THEN
        RAISE EXCEPTION 'Rôle invalide';
    END IF;

    SELECT
        u.email,
        COALESCE(
            NULLIF(TRIM(COALESCE(p_full_name, '')), ''),
            NULLIF(TRIM((u.raw_user_meta_data ->> 'name')), ''),
            NULLIF(TRIM((u.raw_user_meta_data ->> 'full_name')), ''),
            'Administrator'
        )
    INTO v_email, v_name
    FROM auth.users u
    WHERE u.id = v_target_user_id;

    IF v_email IS NULL THEN
        SELECT LOWER(TRIM(COALESCE(p.email, '')))
        INTO v_legacy_email
        FROM public.profiles p
        WHERE p.id = p_user_id;

        IF COALESCE(v_legacy_email, '') <> '' THEN
            SELECT
                u.id,
                u.email,
                COALESCE(
                    NULLIF(TRIM(COALESCE(p_full_name, '')), ''),
                    NULLIF(TRIM((u.raw_user_meta_data ->> 'name')), ''),
                    NULLIF(TRIM((u.raw_user_meta_data ->> 'full_name')), ''),
                    'Administrator'
                )
            INTO v_target_user_id, v_email, v_name
            FROM auth.users u
            WHERE LOWER(COALESCE(u.email, '')) = v_legacy_email
            LIMIT 1;
        END IF;

        IF v_email IS NULL THEN
            RAISE EXCEPTION 'Utilisateur auth introuvable';
        END IF;
    END IF;

    DELETE FROM public.profiles p
    WHERE LOWER(COALESCE(p.email, '')) = LOWER(COALESCE(v_email, ''))
      AND p.id <> v_target_user_id;

    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (v_target_user_id, v_email, v_name, v_role)
    ON CONFLICT (id) DO UPDATE
    SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role;

    RETURN QUERY
    SELECT
        v_target_user_id::UUID,
        v_email::TEXT,
        v_name::TEXT,
        v_role::TEXT,
        'promoted'::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_superadmin_auth_users(TEXT, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.promote_auth_user_to_admin(UUID, TEXT, TEXT) TO authenticated, service_role;
