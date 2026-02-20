-- Enable RLS on sensitive tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- 1. ADMIN POLICIES (Full Access)
-- Assumption: Admins are authenticated via Supabase Auth and have a specific role or are just authenticated users for this MVP.
-- For stricter security, we should check auth.jwt() -> role, but for this project we'll allow authenticated users full access 
-- and handle client access strictly via RPC functions to bypass RLS for them (security definer).

CREATE POLICY "Admins have full access to projects"
ON projects
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins have full access to messages"
ON messages
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins have full access to tickets"
ON tickets
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 2. CLIENT ACCESS (Via Secure RPC)
-- Clients do not have Supabase Auth accounts (they use ID + PIN), so they cannot satisfy RLS policies directly using auth.uid().
-- Access will be granted via SECURITY DEFINER functions which bypass RLS.
-- This means NO direct SELECT on 'projects' table will work for anon users, which is perfect.

-- Secure Function to get project details (Excludes internal_notes)
-- Returns JSON to control exactly what fields are sent
CREATE OR REPLACE FUNCTION get_project_details_for_client(p_id UUID, p_pin TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (postgres), bypassing RLS
AS $$
DECLARE
    project_data JSON;
BEGIN
    SELECT json_build_object(
        'id', id,
        'client_id', client_id,
        'name', name,
        'location', location,
        'status', status,
        'progress', progress,
        'start_date', start_date,
        'end_date', end_date,
        'manager', manager,
        'description', description,
        'phases', phases,
        'documents', documents,
        'images', images,
        'created_at', created_at
        -- Intentionally OMITTING 'internal_notes'
    )
    INTO project_data
    FROM projects
    WHERE id = p_id AND pin = p_pin;

    IF project_data IS NULL THEN
        RAISE EXCEPTION 'Invalid Project ID or PIN';
    END IF;

    RETURN project_data;
END;
$$;

-- Secure Function to verify client login
CREATE OR REPLACE FUNCTION verify_client_project(p_id UUID, p_pin TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    project_exists BOOLEAN;
    result JSON;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM projects WHERE id = p_id AND pin = p_pin
    ) INTO project_exists;

    IF project_exists THEN
        SELECT json_build_object('success', true, 'id', p_id) INTO result;
    ELSE
        SELECT json_build_object('success', false, 'error', 'Invalid credentials') INTO result;
    END IF;

    RETURN result;
END;
$$;
