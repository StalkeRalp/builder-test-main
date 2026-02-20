-- ========================================
-- TDE GROUP DATABASE SCHEMA & RLS POLICIES
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

-- RLS: Users can only see their own profile (or admin sees all)
CREATE POLICY "profiles_own_or_admin" ON public.profiles
    FOR SELECT USING (
        auth.uid() = id OR
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' OR
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
    );

-- RLS: Users can update only their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- RLS: Allow insert during signup
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

-- RLS: Admin can see all projects
CREATE POLICY "projects_admin_all" ON public.projects
    FOR SELECT USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
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

-- RLS: Users can see their memberships
CREATE POLICY "project_members_see_own" ON public.project_members
    FOR SELECT USING (
        user_id = auth.uid() OR
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
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

-- RLS: Users can see phases of their projects
CREATE POLICY "phases_client_access" ON public.phases
    FOR SELECT USING (
        project_id IN (
            SELECT project_id FROM public.project_members
            WHERE user_id = auth.uid() OR email = (SELECT email FROM public.profiles WHERE id = auth.uid())
        ) OR
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
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

-- RLS: Users can see public documents of their projects
CREATE POLICY "documents_client_access" ON public.documents
    FOR SELECT USING (
        is_public = TRUE AND
        project_id IN (
            SELECT project_id FROM public.project_members
            WHERE user_id = auth.uid() OR email = (SELECT email FROM public.profiles WHERE id = auth.uid())
        ) OR
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
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

-- RLS: Users can see messages from their projects
CREATE POLICY "messages_client_access" ON public.messages
    FOR SELECT USING (
        project_id IN (
            SELECT project_id FROM public.project_members
            WHERE user_id = auth.uid() OR email = (SELECT email FROM public.profiles WHERE id = auth.uid())
        ) OR
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
    );

-- RLS: Users can insert messages to their projects
CREATE POLICY "messages_client_insert" ON public.messages
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT project_id FROM public.project_members
            WHERE user_id = auth.uid() OR email = (SELECT email FROM public.profiles WHERE id = auth.uid())
        ) OR
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
    );

-- ========================================
-- 7. TICKETS TABLE (support)
-- ========================================
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    created_by_id UUID REFERENCES public.profiles(id),
    created_by_email TEXT,
    created_by_role TEXT, -- 'admin' or 'client'
    status TEXT DEFAULT 'open', -- 'open', 'in-progress', 'closed', 'on-hold'
    priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    assigned_to_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on tickets
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- RLS: Users can see tickets from their projects
CREATE POLICY "tickets_client_access" ON public.tickets
    FOR SELECT USING (
        project_id IN (
            SELECT project_id FROM public.project_members
            WHERE user_id = auth.uid() OR email = (SELECT email FROM public.profiles WHERE id = auth.uid())
        ) OR
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
    );

-- ========================================
-- 8. INTERNAL_NOTES TABLE (admin only)
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

-- RLS: Only admin can see/edit internal notes
CREATE POLICY "internal_notes_admin_only" ON public.internal_notes
    FOR SELECT USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
    );

CREATE POLICY "internal_notes_admin_insert" ON public.internal_notes
    FOR INSERT WITH CHECK (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
    );

-- ========================================
-- 9. ACTIVITY_LOG TABLE (audit trail)
-- ========================================
CREATE TABLE IF NOT EXISTS public.activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'viewed', 'commented'
    entity_type TEXT, -- 'project', 'phase', 'document', 'message', 'ticket'
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on activity_log
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- RLS: Users can see logs from their projects
CREATE POLICY "activity_log_client_access" ON public.activity_log
    FOR SELECT USING (
        project_id IN (
            SELECT project_id FROM public.project_members
            WHERE user_id = auth.uid() OR email = (SELECT email FROM public.profiles WHERE id = auth.uid())
        ) OR
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
    );

-- ========================================
-- 10. CREATE INDEXES for performance
-- ========================================
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);

CREATE INDEX idx_projects_created_by ON public.projects(created_by);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_access_pin ON public.projects(access_pin);

CREATE INDEX idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX idx_project_members_user_id ON public.project_members(user_id);
CREATE INDEX idx_project_members_email ON public.project_members(email);

CREATE INDEX idx_phases_project_id ON public.phases(project_id);

CREATE INDEX idx_documents_project_id ON public.documents(project_id);
CREATE INDEX idx_documents_is_public ON public.documents(is_public);

CREATE INDEX idx_messages_project_id ON public.messages(project_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);

CREATE INDEX idx_tickets_project_id ON public.tickets(project_id);
CREATE INDEX idx_tickets_status ON public.tickets(status);

CREATE INDEX idx_internal_notes_project_id ON public.internal_notes(project_id);

CREATE INDEX idx_activity_log_project_id ON public.activity_log(project_id);
CREATE INDEX idx_activity_log_user_id ON public.activity_log(user_id);

-- ========================================
-- 11. ENABLE REALTIME for chat & updates
-- ========================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.phases;

-- ========================================
-- 12. CREATE FUNCTIONS FOR CUSTOM LOGIC
-- ========================================

-- Function to validate client PIN and return access token
CREATE OR REPLACE FUNCTION login_client(project_pin TEXT)
RETURNS TABLE (
    project_id UUID,
    access_token TEXT,
    client_email TEXT,
    project_name TEXT,
    success BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    found_project UUID;
    token TEXT;
    client_email_val TEXT;
BEGIN
    -- Find project by PIN
    SELECT id INTO found_project FROM public.projects WHERE access_pin = project_pin;
    
    IF found_project IS NULL THEN
        RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, FALSE;
        RETURN;
    END IF;
    
    -- Generate access token (using project_id + timestamp + secret)
    token := encode(digest(found_project::TEXT || NOW()::TEXT || 'tde_secret', 'sha256'), 'hex');
    
    -- Get client email from project_members
    SELECT email INTO client_email_val FROM public.project_members 
    WHERE project_id = found_project LIMIT 1;
    
    -- Return success
    RETURN QUERY
    SELECT 
        found_project,
        token,
        client_email_val,
        (SELECT name FROM public.projects WHERE id = found_project),
        TRUE;
END;
$$;

-- Function to update project progress
CREATE OR REPLACE FUNCTION update_project_progress(project_id_param UUID, new_progress INTEGER)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    admin_role TEXT;
BEGIN
    -- Check if caller is admin
    SELECT role INTO admin_role FROM public.profiles WHERE id = auth.uid();
    
    IF admin_role NOT IN ('admin', 'superadmin') THEN
        RETURN FALSE;
    END IF;
    
    -- Update progress
    UPDATE public.projects
    SET progress = new_progress, updated_at = CURRENT_TIMESTAMP
    WHERE id = project_id_param;
    
    -- Log activity
    INSERT INTO public.activity_log (project_id, user_id, action, entity_type, entity_id, details)
    VALUES (project_id_param, auth.uid(), 'updated', 'project', project_id_param, 
            jsonb_build_object('progress', new_progress));
    
    RETURN TRUE;
END;
$$;

-- Function to add internal note
CREATE OR REPLACE FUNCTION add_internal_note(project_id_param UUID, note_content TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    admin_role TEXT;
    note_id UUID;
BEGIN
    -- Check if caller is admin
    SELECT role INTO admin_role FROM public.profiles WHERE id = auth.uid();
    
    IF admin_role NOT IN ('admin', 'superadmin') THEN
        RETURN NULL;
    END IF;
    
    -- Insert note
    INSERT INTO public.internal_notes (project_id, content, created_by)
    VALUES (project_id_param, note_content, auth.uid())
    RETURNING id INTO note_id;
    
    RETURN note_id;
END;
$$;

-- ========================================
-- SETUP COMPLETE!
-- ========================================
-- Next steps:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Create admin user via Supabase Auth UI
-- 3. Update .env.local with your credentials
-- 4. Start the development server
-- 5. Test the application
