-- SECURITY NOTICE:
-- This script creates a secure function to allow clients to log in using their Project ID and PIN.
-- It bypasses Row Level Security (RLS) for the specific project they are logging into.

-- 1. Create the RPC function
CREATE OR REPLACE FUNCTION login_client(p_id UUID, p_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (Admin), bypassing RLS
AS $$
DECLARE
    project_record RECORD;
    profile_record RECORD;
    result JSONB;
BEGIN
    -- 1. Verify credentials and fetch project
    SELECT * INTO project_record 
    FROM projects 
    WHERE id = p_id AND pin = p_pin;
    
    -- If no project found with matching ID and PIN, return NULL
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- 2. Fetch Client Profile (if exists)
    SELECT * INTO profile_record 
    FROM profiles 
    WHERE id = project_record.client_id;

    -- 3. Construct Result
    -- We combine project data with profile data nested under 'profiles' key
    -- to match the structure expected by the frontend.
    result := to_jsonb(project_record);
    
    IF profile_record IS NOT NULL THEN
        -- Add profile data as a separate property to match Supabase join format roughly
        -- Note: Front-end expects 'profiles' property
        result := result || jsonb_build_object('profiles', to_jsonb(profile_record));
    END IF;
    
    RETURN result;
END;
$$;

-- 2. Grant execute permission to anonymous users (so they can call it before logging in)
GRANT EXECUTE ON FUNCTION login_client(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION login_client(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION login_client(UUID, TEXT) TO service_role;

-- Usage Example (for testing in SQL Editor):
-- SELECT login_client('YOUR-PROJECT-UUID-HERE', '000000');
