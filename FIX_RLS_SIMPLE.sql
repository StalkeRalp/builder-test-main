-- SIMPLE FIX: Minimal RLS policies for projects table
-- Run this in Supabase SQL Editor

-- Drop all existing policies on projects
DROP POLICY IF EXISTS "projects_admin_all" ON public.projects;
DROP POLICY IF EXISTS "projects_admin_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_admin_update" ON public.projects;
DROP POLICY IF EXISTS "projects_admin_delete" ON public.projects;

-- Simple policy: Allow anyone authenticated to create projects
-- (More permissive - can be restricted later if needed)
CREATE POLICY "projects_insert_authenticated" ON public.projects
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- Allow admins to select all projects
CREATE POLICY "projects_select_authenticated" ON public.projects
    FOR SELECT 
    USING (auth.role() = 'authenticated');

-- Allow user to update own projects
CREATE POLICY "projects_update_own" ON public.projects
    FOR UPDATE 
    USING (auth.uid() = created_by);

-- Allow user to delete own projects
CREATE POLICY "projects_delete_own" ON public.projects
    FOR DELETE 
    USING (auth.uid() = created_by);

-- Confirmation
SELECT 'Simplified RLS policies created' as status;
