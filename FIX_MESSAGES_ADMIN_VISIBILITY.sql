-- Fix admin visibility on messages table when RLS is enabled
-- Execute in Supabase SQL Editor

BEGIN;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Remove legacy/conflicting policies
DROP POLICY IF EXISTS "messages_admin_all" ON public.messages;
DROP POLICY IF EXISTS "messages_admin_insert" ON public.messages;
DROP POLICY IF EXISTS "Admins have full access to messages" ON public.messages;
DROP POLICY IF EXISTS "messages_client_access" ON public.messages;
DROP POLICY IF EXISTS "messages_client_insert" ON public.messages;
DROP POLICY IF EXISTS "messages_authenticated_all" ON public.messages;

-- Admin full access based on profiles table (not JWT claim role)
CREATE POLICY "messages_admin_full_access"
ON public.messages
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

