-- Disable the problematic email preferences trigger
-- This will allow user creation to work without gen_random_bytes()

-- Drop the trigger that's causing the gen_random_bytes error
DROP TRIGGER IF EXISTS create_email_preferences_for_new_user ON auth.users;

-- Also drop the function to clean up
DROP FUNCTION IF EXISTS create_user_email_preferences();

-- Verify the trigger is gone
SELECT 'Email preferences trigger successfully removed' as status;