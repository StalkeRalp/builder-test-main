-- ========================================
-- TDE GROUP DATABASE SCHEMA & RLS POLICIES (SIMPLIFIED)
-- ========================================
-- Run this in Supabase SQL Editor
-- https://app.supabase.com/project/[id]/sql/new

-- ========================================
-- 1. PROFILES TABLE (for admin users)
-- ========================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'client', -- 'admin' or 'client'
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    company TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_role CHECK (role IN ('admin', 'client', 'superadmin'))
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS POLICY: Users can read own profile
CREATE POLICY "profiles_read_own" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- RLS POLICY: Admin can read all profiles
CREATE POLICY "profiles_read_admin" ON public.profiles
    FOR SELECT USING (
        (auth.jwt() ->> 'role') = 'admin' OR
        (auth.jwt() ->> 'role') = 'superadmin'
    );

-- RLS POLICY: Users can update own profile
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- RLS POLICY: Allow insert during signup
CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- ========================================
-- 2. PROJECTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    client_name TEXT,
    client_email TEXT,
    client_phone TEXT,
    project_type TEXT, -- 'construction', 'energy', 'it-services', 'consultancy', 'supply'
    status TEXT DEFAULT 'active', -- 'active', 'completed', 'on-hold', 'archived'
    progress INTEGER DEFAULT 0, -- 0-100
    start_date DATE,
    end_date DATE,
    budget DECIMAL(12, 2),
    access_pin TEXT NOT NULL UNIQUE, -- 6-digit PIN for client access
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS POLICY: Admin can see all projects
CREATE POLICY "projects_admin_all" ON public.projects
    FOR SELECT USING (
        (auth.jwt() ->> 'role') = 'admin' OR
        (auth.jwt() ->> 'role') = 'superadmin'
    );

-- ========================================
-- 3. PROJECT_MEMBERS TABLE (link clients to projects)
-- ========================================
CREATE TABLE IF NOT EXISTS public.project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID,
    email TEXT, -- For clients without Supabase account
    role TEXT NOT NULL DEFAULT 'viewer', -- 'viewer', 'editor', 'admin'
    access_token TEXT UNIQUE, -- For stateless client access
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, email)
);

-- Enable RLS on project_members
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- RLS POLICY: Users can see their memberships
CREATE POLICY "project_members_see_own" ON public.project_members
    FOR SELECT USING (
        user_id = auth.uid() OR
        (auth.jwt() ->> 'role') = 'admin'
    );

-- ========================================
-- 4. PHASES TABLE (project timeline)
-- ========================================
CREATE TABLE IF NOT EXISTS public.phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'pending', -- 'pending', 'in-progress', 'completed'
    order_index INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on phases
ALTER TABLE public.phases ENABLE ROW LEVEL SECURITY;

-- RLS POLICY: Admin can see all phases
CREATE POLICY "phases_admin_all" ON public.phases
    FOR SELECT USING (
        (auth.jwt() ->> 'role') = 'admin'
    );

-- ========================================
-- 5. DOCUMENTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    file_url TEXT,
    file_type TEXT, -- 'pdf', 'docx', 'xlsx', 'image', 'other'
    file_size INTEGER,
    is_public BOOLEAN DEFAULT TRUE, -- visible to clients
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- RLS POLICY: Admin can see all documents
CREATE POLICY "documents_admin_all" ON public.documents
    FOR SELECT USING (
        (auth.jwt() ->> 'role') = 'admin'
    );

-- ========================================
-- 6. MESSAGES TABLE (chat)
-- ========================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id),
    sender_name TEXT, -- For clients
    sender_email TEXT,
    sender_role TEXT, -- 'admin' or 'client'
    content TEXT NOT NULL,
    attachment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS POLICY: Admin can see all messages
CREATE POLICY "messages_admin_all" ON public.messages
    FOR SELECT USING (
        (auth.jwt() ->> 'role') = 'admin'
    );

-- RLS POLICY: Admin can insert messages
CREATE POLICY "messages_admin_insert" ON public.messages
    FOR INSERT WITH CHECK (
        (auth.jwt() ->> 'role') = 'admin'
    );

-- ========================================
-- 7. TICKETS TABLE (support)
-- ========================================
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open', -- 'open', 'in-progress', 'resolved', 'closed'
    priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    assigned_to UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on tickets
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- RLS POLICY: Admin can see all tickets
CREATE POLICY "tickets_admin_all" ON public.tickets
    FOR SELECT USING (
        (auth.jwt() ->> 'role') = 'admin'
    );

-- ========================================
-- 8. INTERNAL_NOTES TABLE (private admin notes)
-- ========================================
CREATE TABLE IF NOT EXISTS public.internal_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on internal_notes
ALTER TABLE public.internal_notes ENABLE ROW LEVEL SECURITY;

-- RLS POLICY: Only admin can read internal notes
CREATE POLICY "internal_notes_admin_only" ON public.internal_notes
    FOR SELECT USING (
        (auth.jwt() ->> 'role') = 'admin'
    );

-- RLS POLICY: Only admin can create internal notes
CREATE POLICY "internal_notes_admin_insert" ON public.internal_notes
    FOR INSERT WITH CHECK (
        (auth.jwt() ->> 'role') = 'admin'
    );

-- ========================================
-- 9. ACTIVITY_LOGS TABLE (audit trail)
-- ========================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL, -- 'created', 'updated', 'deleted', etc.
    resource_type TEXT, -- 'project', 'phase', 'document', etc.
    resource_id UUID,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS POLICY: Admin can see all logs
CREATE POLICY "activity_logs_admin_all" ON public.activity_logs
    FOR SELECT USING (
        (auth.jwt() ->> 'role') = 'admin'
    );

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_phases_project_id ON public.phases(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON public.documents(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_project_id ON public.messages(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_tickets_project_id ON public.tickets(project_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_internal_notes_project_id ON public.internal_notes(project_id);

-- ========================================
-- SUCCESS MESSAGE
-- ========================================
-- All tables created successfully!
-- Your database is ready for TDE Group!
