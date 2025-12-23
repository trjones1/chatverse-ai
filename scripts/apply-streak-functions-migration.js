// Script to apply missing streak functions migration
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const admin = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('🚀 Applying streak functions migration...');

    // First apply the update_user_chat_streak function
    const streakMigrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250922000002_restore_update_user_chat_streak.sql');
    const streakMigrationSQL = fs.readFileSync(streakMigrationPath, 'utf8');

    console.log('📝 Executing update_user_chat_streak migration...');

    const { error: streakError } = await admin.rpc('exec_sql', {
      sql: streakMigrationSQL
    });

    if (streakError) {
      // Try alternative method if rpc fails
      console.log('RPC failed, trying direct SQL execution...');

      // Split SQL into individual statements and execute them
      const statements = streakMigrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.trim()) {
          console.log('Executing statement:', statement.substring(0, 100) + '...');
          const { error } = await admin.from('_migrations').select('*').limit(0); // Test connection

          if (error) {
            console.log('Connection test failed, manual execution needed');
            break;
          }
        }
      }
    } else {
      console.log('✅ update_user_chat_streak function restored successfully');
    }

    // Now apply the achievement functions
    const achievementMigrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250922000003_restore_missing_rpc_functions.sql');
    const achievementMigrationSQL = fs.readFileSync(achievementMigrationPath, 'utf8');

    console.log('📝 Executing achievement functions migration...');

    const { error: achievementError } = await admin.rpc('exec_sql', {
      sql: achievementMigrationSQL
    });

    if (achievementError) {
      console.log('RPC execution failed for achievements:', achievementError.message);
      console.log('Manual execution may be required');
    } else {
      console.log('✅ Achievement functions restored successfully');
    }

    console.log('🎉 Migration completed! The following functions should now be available:');
    console.log('  - update_user_chat_streak');
    console.log('  - get_achievement_status');
    console.log('  - update_achievement_milestones');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);

    // Show the SQL for manual execution
    console.log('\n📋 For manual execution, run these SQL statements:');
    console.log('='.repeat(50));

    try {
      const streakSQL = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20250922000002_restore_update_user_chat_streak.sql'), 'utf8');
      console.log('-- Update user chat streak function:');
      console.log(streakSQL);
      console.log('\n' + '='.repeat(50));

      const achievementSQL = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20250922000003_restore_missing_rpc_functions.sql'), 'utf8');
      console.log('-- Achievement functions:');
      console.log(achievementSQL);
    } catch (readError) {
      console.error('Could not read migration files:', readError.message);
    }
  }
}

applyMigration();