-- ========================================
-- CREATE ADMIN USER
-- ========================================
-- This script creates the first admin user
-- Run this AFTER the user has been created via Supabase Auth UI
-- and verified their email

-- Get the user ID from the email
-- Replace 'admin@tdegroup.com' with your admin email
-- and 'user_id_from_auth_ui' with the UUID shown in Authentication → Users

-- Step 1: Create admin profile in public.profiles table
INSERT INTO public.profiles (id, email, role, full_name, company)
VALUES (
    'REPLACE_WITH_USER_ID_FROM_AUTH_UI',  -- UUID from Supabase Auth → Users
    'admin@tdegroup.com',                 -- Your admin email
    'admin',                              -- Role
    'Admin User',                         -- Name
    'TDE Group'                           -- Company
)
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- ========================================
-- CREATE FIRST TEST PROJECT
-- ========================================
-- This creates a project that clients can access with PIN

INSERT INTO public.projects (
    name,
    description,
    client_name,
    client_email,
    project_type,
    status,
    progress,
    start_date,
    end_date,
    budget,
    access_pin,
    created_by
)
VALUES (
    'Construction - Immeuble Commercial',
    'Construction d''un immeuble commercial de 5 étages',
    'Acme Corporation',
    'contact@acme-corp.com',
    'construction',
    'active',
    35,
    '2026-01-15',
    '2026-12-31',
    150000.00,
    '123456',  -- PIN for client access - CHANGE THIS!
    'REPLACE_WITH_USER_ID_FROM_AUTH_UI'  -- Your admin user ID
);

-- Get the project ID from previous insert
-- SELECT id, name, access_pin FROM public.projects ORDER BY created_at DESC LIMIT 1;

-- ========================================
-- ADD CLIENT TO PROJECT
-- ========================================
-- After getting the project ID from above, add the client email:

INSERT INTO public.project_members (
    project_id,
    email,
    role
)
VALUES (
    'REPLACE_WITH_PROJECT_ID',  -- UUID from above query
    'client@acme-corp.com',     -- Client email
    'viewer'                    -- Permission level
);

-- ========================================
-- CREATE FIRST PHASE
-- ========================================

INSERT INTO public.phases (
    project_id,
    name,
    description,
    start_date,
    end_date,
    status,
    order_index
)
VALUES
    ('REPLACE_WITH_PROJECT_ID', 'Préparation du site', 'Préparation et nettoyage du terrain', '2026-01-15', '2026-02-28', 'completed', 1),
    ('REPLACE_WITH_PROJECT_ID', 'Fondations', 'Excavation et coulage des fondations', '2026-03-01', '2026-05-31', 'in-progress', 2),
    ('REPLACE_WITH_PROJECT_ID', 'Structure', 'Levage de la structure métallique', '2026-06-01', '2026-08-31', 'pending', 3),
    ('REPLACE_WITH_PROJECT_ID', 'Finitions', 'Finitions intérieures et extérieures', '2026-09-01', '2026-11-30', 'pending', 4),
    ('REPLACE_WITH_PROJECT_ID', 'Réception', 'Inspection finale et remise du projet', '2026-12-01', '2026-12-31', 'pending', 5);

-- ========================================
-- VERIFY SETUP
-- ========================================

-- Check if admin profile exists
SELECT id, email, role FROM public.profiles WHERE email = 'admin@tdegroup.com';

-- Check if project was created
SELECT id, name, access_pin, progress FROM public.projects 
ORDER BY created_at DESC LIMIT 1;

-- Check project phases
SELECT name, start_date, end_date, status, order_index 
FROM public.phases 
WHERE project_id = (SELECT id FROM public.projects ORDER BY created_at DESC LIMIT 1)
ORDER BY order_index;

-- Check project members
SELECT email, role FROM public.project_members 
WHERE project_id = (SELECT id FROM public.projects ORDER BY created_at DESC LIMIT 1);

-- ========================================
-- NOTES
-- ========================================
-- 1. Before running this script, create a user via Supabase Auth UI
-- 2. Copy the user ID (UUID) from Authentication → Users
-- 3. Replace 'REPLACE_WITH_USER_ID_FROM_AUTH_UI' with the actual UUID
-- 4. Replace 'REPLACE_WITH_PROJECT_ID' with the project UUID from the INSERT result
-- 5. Customize the project details as needed
-- 6. The access PIN is for client login (format: 6 digits)
-- 7. Keep the PIN safe and share it only with the client
