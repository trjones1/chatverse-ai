-- Create missing tables referenced in the codebase

-- Email preferences table for user notification settings
CREATE TABLE IF NOT EXISTS email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  marketing_emails BOOLEAN DEFAULT true,
  product_updates BOOLEAN DEFAULT true,
  security_alerts BOOLEAN DEFAULT true,
  retention_emails BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policy for email preferences
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own email preferences" ON email_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own email preferences" ON email_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage email preferences" ON email_preferences
  FOR ALL USING (auth.role() = 'service_role');

-- User activity logs table for tracking user actions
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_data JSONB,
  character_key TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policy for user activity logs
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity logs" ON user_activity_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage activity logs" ON user_activity_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_preferences_user_id ON email_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at);

-- Create trigger to automatically create email preferences for new users
CREATE OR REPLACE FUNCTION create_user_email_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO email_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS create_email_preferences_for_new_user ON auth.users;
CREATE TRIGGER create_email_preferences_for_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_email_preferences();