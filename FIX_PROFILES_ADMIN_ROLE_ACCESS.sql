-- Fix: allow admin dashboard to list admins by role safely
-- Execute in Supabase SQL Editor

BEGIN;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remove conflicting legacy policies if present
DROP POLICY IF EXISTS "profiles_read_admin_roles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all_authenticated" ON public.profiles;

-- Helper function to avoid recursive RLS checks on profiles table
DROP FUNCTION IF EXISTS public.is_admin_or_superadmin();
CREATE OR REPLACE FUNCTION public.is_admin_or_superadmin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND LOWER(COALESCE(p.role, '')) IN ('admin', 'superadmin')
  );
END;
$$;

DROP FUNCTION IF EXISTS public.is_superadmin();
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND LOWER(COALESCE(p.role, '')) = 'superadmin'
  );
END;
$$;

-- Keep self-read policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'profiles_read_own'
  ) THEN
    CREATE POLICY "profiles_read_own"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());
  END IF;
END $$;

-- Admin/superadmin can read ONLY admin/superadmin profiles (for admin session panel)
CREATE POLICY "profiles_read_admin_roles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  LOWER(COALESCE(role, '')) IN ('admin', 'superadmin')
  AND public.is_admin_or_superadmin()
);

-- Superadmin can update admin/superadmin profiles (edit in superadmin directory)
DROP POLICY IF EXISTS "profiles_update_admin_roles" ON public.profiles;
CREATE POLICY "profiles_update_admin_roles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  LOWER(COALESCE(role, '')) IN ('admin', 'superadmin')
  AND public.is_superadmin()
)
WITH CHECK (
  LOWER(COALESCE(role, '')) IN ('admin', 'superadmin')
  AND public.is_superadmin()
);

-- RPC fallback (bypasses RLS via SECURITY DEFINER, but enforces caller role)
DROP FUNCTION IF EXISTS public.get_admin_profiles_for_dashboard(TEXT);

CREATE OR REPLACE FUNCTION public.get_admin_profiles_for_dashboard(
  p_role TEXT DEFAULT 'admin'
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  role TEXT,
  phone TEXT,
  company TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT := LOWER(TRIM(COALESCE(p_role, 'admin')));
BEGIN
  IF v_role NOT IN ('admin', 'superadmin') THEN
    RAISE EXCEPTION 'Role invalide';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles me
    WHERE me.id = auth.uid()
      AND LOWER(COALESCE(me.role, '')) IN ('admin', 'superadmin')
  ) THEN
    RAISE EXCEPTION 'Accès réservé aux admins';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.email,
    p.role,
    p.phone,
    p.company,
    p.created_at
  FROM public.profiles p
  WHERE LOWER(COALESCE(p.role, '')) = v_role
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_profiles_for_dashboard(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_or_superadmin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated, service_role;

-- RPC clients portfolio for superadmin charts (RLS-safe)
DROP FUNCTION IF EXISTS public.get_superadmin_clients_for_graphs();
CREATE OR REPLACE FUNCTION public.get_superadmin_clients_for_graphs()
RETURNS TABLE (
  id UUID,
  name TEXT,
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles me
    WHERE me.id = auth.uid()
      AND LOWER(COALESCE(me.role, '')) = 'superadmin'
  ) THEN
    RAISE EXCEPTION 'Accès réservé au superadmin';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.client_name,
    p.client_email,
    p.client_phone,
    p.status,
    p.created_at
  FROM public.projects p
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_superadmin_clients_for_graphs() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
