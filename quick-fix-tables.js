// Quick fix script to create missing tables via HTTP API
const fetch = require('node:fetch');

const PROJECT_URL = 'https://copjpqtwdqrclfrwoaeb.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvcGpwcXR3ZHFyY2xmcndvYWViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzgxOTgyNywiZXhwIjoyMDY5Mzk1ODI3fQ.NCo6uRV5W3MTzc9VjuT2LbwGcHPA3aTm0V3Qd_GFxpQ';

async function createMissingTables() {
  console.log('🔧 Creating missing database tables...');

  try {
    // Try using the Management API
    const response = await fetch(`https://api.supabase.com/v1/projects/copjpqtwdqrclfrwoaeb/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          -- Email preferences table
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

          -- RLS policies
          ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;
          CREATE POLICY IF NOT EXISTS "Users can view their own email preferences" ON email_preferences
            FOR SELECT USING (auth.uid() = user_id);
          CREATE POLICY IF NOT EXISTS "Service role can manage email preferences" ON email_preferences
            FOR ALL USING (auth.role() = 'service_role');

          -- User activity logs table
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

          -- RLS policies
          ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
          CREATE POLICY IF NOT EXISTS "Users can view their own activity logs" ON user_activity_logs
            FOR SELECT USING (auth.uid() = user_id);
          CREATE POLICY IF NOT EXISTS "Service role can manage activity logs" ON user_activity_logs
            FOR ALL USING (auth.role() = 'service_role');

          -- Indexes
          CREATE INDEX IF NOT EXISTS idx_email_preferences_user_id ON email_preferences(user_id);
          CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
        `
      })
    });

    if (response.ok) {
      console.log('✅ Successfully created tables via Management API');
      return;
    }

    console.log('⚠️ Management API failed, trying direct approach...');

    // Fallback: try creating tables via edge function or other means
    console.log('Please manually run the migration: supabase migration up --file 20250912000000_add_missing_tables.sql');

  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
    console.log('📋 Please run this SQL manually in Supabase Dashboard:');
    console.log(`
-- Email preferences table
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

ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own email preferences" ON email_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage email preferences" ON email_preferences FOR ALL USING (auth.role() = 'service_role');

-- User activity logs table
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

ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own activity logs" ON user_activity_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage activity logs" ON user_activity_logs FOR ALL USING (auth.role() = 'service_role');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_preferences_user_id ON email_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
    `);
  }
}

createMissingTables();