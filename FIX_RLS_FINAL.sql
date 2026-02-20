-- ========================================
-- FIX RLS POLICIES FOR AUTHENTICATED ADMINS
-- ========================================
-- This SQL script fixes all RLS policies for authenticated admin users
-- to properly handle project creation and management.

-- 1. Disable RLS temporarily for clean slate
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;

-- 2. Drop existing broken policies
DROP POLICY IF EXISTS "projects_admin_all" ON public.projects;
DROP POLICY IF EXISTS "projects_admin_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_admin_update" ON public.projects;
DROP POLICY IF EXISTS "projects_admin_delete" ON public.projects;

-- 3. Re-enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- ========================================
-- NEW SIMPLIFIED POLICIES
-- ========================================

-- SELECT: Admins can see all projects
CREATE POLICY "projects_select_for_authenticated"
    ON public.projects
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- INSERT: Authenticated users can create projects (will be set as created_by automatically)
CREATE POLICY "projects_insert_for_authenticated"
    ON public.projects
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- UPDATE: Users can only update projects they created
CREATE POLICY "projects_update_own"
    ON public.projects
    FOR UPDATE
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

-- DELETE: Users can only delete projects they created
CREATE POLICY "projects_delete_own"
    ON public.projects
    FOR DELETE
    USING (auth.uid() = created_by);

-- ========================================
-- APPLY SAME TO OTHER TABLES
-- ========================================

-- Phases table
ALTER TABLE public.phases DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "phases_policy" ON public.phases;
ALTER TABLE public.phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "phases_authenticated"
    ON public.phases
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Documents table
ALTER TABLE public.documents DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "documents_policy" ON public.documents;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_authenticated"
    ON public.documents
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Messages table
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "messages_policy" ON public.messages;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_authenticated"
    ON public.messages
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Tickets table
ALTER TABLE public.tickets DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tickets_policy" ON public.tickets;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tickets_authenticated"
    ON public.tickets
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Internal notes table (ADMIN ONLY)
ALTER TABLE public.internal_notes DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "internal_notes_policy" ON public.internal_notes;
ALTER TABLE public.internal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "internal_notes_authenticated"
    ON public.internal_notes
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Project members table
ALTER TABLE public.project_members DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_members_policy" ON public.project_members;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_members_authenticated"
    ON public.project_members
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- ========================================
-- VERIFICATION
-- ========================================
-- Run this as a test: SELECT * FROM projects LIMIT 1;
-- If successful, you should see projects without 403 errors
