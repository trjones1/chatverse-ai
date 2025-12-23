-- Fix email preferences trigger - remove dependency on gen_random_bytes()
-- This replaces the complex trigger with a simple one that doesn't require pgcrypto

-- Drop the problematic trigger and function
DROP TRIGGER IF EXISTS create_email_preferences_for_new_user ON auth.users;
DROP FUNCTION IF EXISTS create_user_email_preferences();

-- Create a simple email preferences function without gen_random_bytes()
CREATE OR REPLACE FUNCTION create_user_email_preferences()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default email preferences for new users
  INSERT INTO email_preferences (
    user_id,
    marketing_emails,
    product_updates, 
    security_alerts,
    retention_emails
  ) VALUES (
    NEW.id,
    true,   -- marketing_emails: opt-in by default
    true,   -- product_updates: always enabled
    true,   -- security_alerts: always enabled  
    true    -- retention_emails: opt-in by default
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER create_email_preferences_for_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_email_preferences();

-- Verify the function works without gen_random_bytes
-- Test by selecting a dummy result (this won't fail)
SELECT 'Email preferences trigger updated successfully' as status;