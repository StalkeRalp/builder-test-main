-- FIX: Add INSERT policy for admins to create projects
-- Run this in Supabase SQL Editor

-- Drop existing policies if they exist (optional)
DROP POLICY IF EXISTS "projects_admin_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_admin_update" ON public.projects;
DROP POLICY IF EXISTS "projects_admin_delete" ON public.projects;

-- Allow admins to INSERT projects
CREATE POLICY "projects_admin_insert" ON public.projects
    FOR INSERT WITH CHECK (
        auth.uid() = created_by AND (
            (auth.jwt() ->> 'role') = 'admin' OR
            (auth.jwt() ->> 'role') = 'superadmin'
        )
    );

-- Allow admins to UPDATE their projects
CREATE POLICY "projects_admin_update" ON public.projects
    FOR UPDATE USING (
        auth.uid() = created_by AND (
            (auth.jwt() ->> 'role') = 'admin' OR
            (auth.jwt() ->> 'role') = 'superadmin'
        )
    );

-- Allow admins to DELETE their projects
CREATE POLICY "projects_admin_delete" ON public.projects
    FOR DELETE USING (
        auth.uid() = created_by AND (
            (auth.jwt() ->> 'role') = 'admin' OR
            (auth.jwt() ->> 'role') = 'superadmin'
        )
    );

-- Confirmation
SELECT 'RLS policies updated successfully' as status;
