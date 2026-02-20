-- Add project manager fields to projects table
-- Run this in Supabase SQL Editor to add the new columns

-- Check if columns exist before adding (this prevents errors if already added)
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS project_manager TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS manager_email TEXT DEFAULT NULL;

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_projects_project_manager ON public.projects(project_manager);
CREATE INDEX IF NOT EXISTS idx_projects_manager_email ON public.projects(manager_email);

-- Update created_at and updated_at
ALTER TABLE public.projects 
MODIFY COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Display confirmation
SELECT 'Project manager fields added successfully' as status;
