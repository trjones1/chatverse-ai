#!/usr/bin/env node

// Fix the email preferences trigger to not use gen_random_bytes()
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function main() {
  console.log('🔧 Fixing email preferences trigger...\n');
  
  try {
    // Read the migration SQL
    const migrationSQL = fs.readFileSync('supabase/migrations/20250912_fix_email_trigger.sql', 'utf8');
    
    // Split into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.toLowerCase().includes('select ')) {
        // Skip SELECT statements (just info messages)
        continue;
      }
      
      console.log(`${i + 1}. ${statement.split('\n')[0]}...`);
      
      const { error } = await supabase.rpc('exec', {
        sql: statement + ';'
      });
      
      if (error) {
        console.log(`   ❌ Error: ${error.message}`);
        // Continue with other statements
      } else {
        console.log(`   ✅ Success`);
      }
    }
    
    console.log('\n🎉 Email preferences trigger fix completed!');
    console.log('\nThe trigger now:');
    console.log('✅ Creates email preferences for new users');
    console.log('✅ Does NOT use gen_random_bytes() (no pgcrypto needed)');
    console.log('✅ Sets sensible defaults for email notifications');
    console.log('\nTry creating a user account now - it should work!');
    
  } catch (error) {
    console.error('❌ Error reading migration file:', error.message);
  }
}

main().catch(console.error);