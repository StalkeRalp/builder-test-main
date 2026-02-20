-- Fix admin visibility on tickets table when RLS is enabled
-- Execute in Supabase SQL Editor

BEGIN;

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Remove legacy/conflicting policies if they exist
DROP POLICY IF EXISTS "tickets_admin_all" ON public.tickets;
DROP POLICY IF EXISTS "Admins have full access to tickets" ON public.tickets;
DROP POLICY IF EXISTS "tickets_client_access" ON public.tickets;
DROP POLICY IF EXISTS "tickets_client_insert" ON public.tickets;
DROP POLICY IF EXISTS "tickets_authenticated_all" ON public.tickets;

-- Admin full access based on profiles table (not JWT role claim)
CREATE POLICY "tickets_admin_full_access"
ON public.tickets
FOR ALL
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

COMMIT;

