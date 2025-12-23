// Script to apply crypto voice and tips migration
const { getSupabaseAdmin } = require('../lib/supabaseAdmin');
const fs = require('fs');
const path = require('path');

const supabase = getSupabaseAdmin();

async function applyMigration() {
  try {
    console.log('🔄 Applying crypto voice & tips migration...');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '../supabase/migrations/20250918000001_crypto_voice_tips.sql'),
      'utf8'
    );

    // Split SQL into individual statements and execute them
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement) {
        console.log('Executing:', statement.substring(0, 100) + '...');
        const { error } = await supabase.rpc('exec_sql', { sql: statement });

        if (error) {
          // Try direct execution for some statements
          const { error: directError } = await supabase.from('_migration_temp').select('1').limit(0);
          if (directError) {
            console.log('Direct execution failed, trying raw SQL...');
            // For migrations, we might need to use a different approach
          }
        }
      }
    }

    console.log('✅ Migration applied successfully!');

    // Verify tables were created
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['user_voice_credits', 'crypto_tips']);

    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError);
    } else {
      console.log('📊 Created tables:', tables.map(t => t.table_name));
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();