-- ========================================
-- FIX: Add missing RLS policies for projects table
-- ========================================
-- Run this in Supabase SQL Editor

-- Check existing policies
-- SELECT * FROM pg_policies WHERE tablename = 'projects';

-- DROP old policies if they exist
DROP POLICY IF EXISTS "projects_admin_create" ON public.projects;
DROP POLICY IF EXISTS "projects_admin_update" ON public.projects;
DROP POLICY IF EXISTS "projects_admin_delete" ON public.projects;

-- CREATE POLICY: Admin can insert new projects
CREATE POLICY "projects_admin_create" ON public.projects
    FOR INSERT WITH CHECK (
        (auth.jwt() ->> 'role') = 'admin' OR
        (auth.jwt() ->> 'role') = 'superadmin'
    );

-- CREATE POLICY: Admin can update projects
CREATE POLICY "projects_admin_update" ON public.projects
    FOR UPDATE USING (
        (auth.jwt() ->> 'role') = 'admin' OR
        (auth.jwt() ->> 'role') = 'superadmin'
    )
    WITH CHECK (
        (auth.jwt() ->> 'role') = 'admin' OR
        (auth.jwt() ->> 'role') = 'superadmin'
    );

-- CREATE POLICY: Admin can delete projects
CREATE POLICY "projects_admin_delete" ON public.projects
    FOR DELETE USING (
        (auth.jwt() ->> 'role') = 'admin' OR
        (auth.jwt() ->> 'role') = 'superadmin'
    );

-- Verify policies
SELECT tablename, policyname, permissive, qual, with_check 
FROM pg_policies 
WHERE tablename = 'projects'
ORDER BY policyname;
