#!/usr/bin/env node

// Setup email retention system tables
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://copjpqtwdqrclfrwoaeb.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvcGpwcXR3ZHFyY2xmcndvYWViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzgxOTgyNywiZXhwIjoyMDY5Mzk1ODI3fQ.NCo6uRV5W3MTzc9VjuT2LbwGcHPA3aTm0V3Qd_GFxpQ'
);

async function setupEmailSystem() {
  console.log('🚀 Setting up email retention system...\n');

  try {
    // Create email_logs table
    console.log('Creating email_logs table...');
    const { error: emailLogsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS email_logs (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            email_address TEXT NOT NULL,
            campaign_type TEXT NOT NULL DEFAULT 'retention',
            subject TEXT NOT NULL,
            message_id TEXT,
            status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
            sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            delivered_at TIMESTAMPTZ,
            opened_at TIMESTAMPTZ,
            clicked_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );`
    });

    if (emailLogsError) {
      console.log('❌ email_logs table:', emailLogsError.message);
    } else {
      console.log('✅ email_logs table created');
    }

    // Create email_unsubscribes table
    console.log('Creating email_unsubscribes table...');
    const { error: unsubscribesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS email_unsubscribes (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            email_address TEXT NOT NULL,
            unsubscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            reason TEXT,
            token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );`
    });

    if (unsubscribesError) {
      console.log('❌ email_unsubscribes table:', unsubscribesError.message);
    } else {
      console.log('✅ email_unsubscribes table created');
    }

    // Create indexes
    console.log('Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_email_logs_campaign_type ON email_logs(campaign_type);',
      'CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);',
      'CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_user_id ON email_unsubscribes(user_id);'
    ];

    for (const indexSql of indexes) {
      const { error } = await supabase.rpc('exec_sql', { sql: indexSql });
      if (error) {
        console.log('❌ Index error:', error.message);
      }
    }
    console.log('✅ Indexes created');

    // Create the get_inactive_users function
    console.log('Creating get_inactive_users function...');
    const { error: functionError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION get_inactive_users(
            days_inactive INTEGER DEFAULT 7,
            email_limit INTEGER DEFAULT 50
        )
        RETURNS TABLE (
            user_id UUID,
            email_address TEXT,
            first_name TEXT,
            last_seen_at TIMESTAMPTZ,
            conversation_count INTEGER
        ) AS $$
        BEGIN
            RETURN QUERY
            WITH user_stats AS (
                SELECT 
                    u.id,
                    u.email,
                    u.raw_user_meta_data->>'first_name' as first_name,
                    COALESCE(u.last_sign_in_at, u.created_at) as last_seen_at,
                    COALESCE(conv_counts.count, 0) as conversation_count
                FROM auth.users u
                LEFT JOIN (
                    SELECT 
                        user_id,
                        COUNT(*) as count
                    FROM conversations
                    GROUP BY user_id
                ) conv_counts ON u.id = conv_counts.user_id
                WHERE u.email IS NOT NULL
                    AND COALESCE(u.last_sign_in_at, u.created_at) < NOW() - INTERVAL '1 day' * days_inactive
            )
            SELECT 
                us.id,
                us.email,
                us.first_name,
                us.last_seen_at,
                us.conversation_count::INTEGER
            FROM user_stats us
            LEFT JOIN email_unsubscribes eu ON us.id = eu.user_id
            LEFT JOIN email_logs el ON us.id = el.user_id 
                AND el.campaign_type = 'retention' 
                AND el.sent_at > NOW() - INTERVAL '7 days'
            WHERE eu.id IS NULL -- Not unsubscribed
                AND el.id IS NULL -- No recent retention emails
            ORDER BY us.last_seen_at ASC
            LIMIT email_limit;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;`
    });

    if (functionError) {
      console.log('❌ get_inactive_users function:', functionError.message);
    } else {
      console.log('✅ get_inactive_users function created');
    }

    console.log('\n🎉 Email retention system setup complete!');
    console.log('\n📋 Next steps:');
    console.log('   1. Add RESEND_API_KEY to environment variables');
    console.log('   2. Test email sending with the API endpoints');
    console.log('   3. Set up automated campaigns');

    return true;
  } catch (error) {
    console.error('❌ Setup failed:', error);
    return false;
  }
}

// Check if exec_sql function exists, create a simple version if not
async function ensureExecSqlFunction() {
  console.log('Checking exec_sql function...');
  
  // Try to create a simple exec_sql function if it doesn't exist
  const { error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1;' }).catch(async (err) => {
    if (err.message.includes('function exec_sql') || err.message.includes('does not exist')) {
      console.log('Creating exec_sql function...');
      // Use the SQL editor approach instead
      return { error: new Error('exec_sql not available') };
    }
    return { error: err };
  });

  if (error && error.message.includes('exec_sql not available')) {
    console.log('❌ exec_sql function not available. You need to run the migration manually in Supabase SQL editor.');
    return false;
  }

  return true;
}

async function main() {
  const canProceed = await ensureExecSqlFunction();
  if (!canProceed) {
    console.log('\n📝 Manual Setup Instructions:');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Run the contents of supabase/migrations/20250906000000_email_retention_system.sql');
    console.log('3. Then run this script again to verify setup');
    process.exit(1);
  }

  const success = await setupEmailSystem();
  process.exit(success ? 0 : 1);
}

main();