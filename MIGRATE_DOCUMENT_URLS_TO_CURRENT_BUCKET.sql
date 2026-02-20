-- Normalize document URLs to the current Supabase project + bucket
-- 1) Replace OLD_PROJECT_REF with your old Supabase project ref if needed.
-- 2) Execute in the current project SQL editor.

BEGIN;

-- Optional: map known old bucket names to "project-documents"
UPDATE public.documents
SET file_url = regexp_replace(
    file_url,
    '/storage/v1/object/public/(documents|project_documents)/',
    '/storage/v1/object/public/project-documents/'
)
WHERE file_url ~ '/storage/v1/object/public/(documents|project_documents)/';

-- Optional: rewrite old project host to current project host
-- Replace OLD_PROJECT_REF before running, or remove this block.
UPDATE public.documents
SET file_url = replace(
    file_url,
    'https://OLD_PROJECT_REF.supabase.co',
    'https://dorxlomdjobujvefpdpo.supabase.co'
)
WHERE file_url LIKE 'https://OLD_PROJECT_REF.supabase.co/%';

COMMIT;

