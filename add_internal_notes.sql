-- Add internal_notes column to projects table
-- This column stores private admin notes invisible to clients

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS internal_notes TEXT DEFAULT '';

-- Add comment for documentation
COMMENT ON COLUMN projects.internal_notes IS 'Private notes for admin use only, not visible to clients';
