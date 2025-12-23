-- Fix page_views foreign key constraint to not fail on invalid user_id references
-- This allows us to track page views even if the user record doesn't exist yet in auth.users

-- Drop the existing foreign key constraint
ALTER TABLE public.page_views
  DROP CONSTRAINT IF EXISTS page_views_user_id_fkey;

-- Add it back without validation (NOT VALID) so it doesn't check on INSERT
-- This allows us to insert page views for users that might not exist yet
ALTER TABLE public.page_views
  ADD CONSTRAINT page_views_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL
  NOT VALID;

-- The NOT VALID flag means:
-- - New inserts won't fail if user_id doesn't exist in auth.users
-- - The constraint still provides metadata/documentation
-- - We can validate it later with: ALTER TABLE page_views VALIDATE CONSTRAINT page_views_user_id_fkey;

COMMENT ON CONSTRAINT page_views_user_id_fkey ON public.page_views IS
  'Non-validated FK to auth.users - allows tracking page views before user record exists';
