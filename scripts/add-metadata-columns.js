// Simple script to add required metadata columns
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const admin = createClient(supabaseUrl, supabaseServiceKey);

async function addMetadataColumns() {
  console.log('🔧 Adding metadata columns...');

  const migrations = [
    // Add metadata to emotional_states
    `ALTER TABLE emotional_states ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';`,
    `CREATE INDEX IF NOT EXISTS idx_emotional_states_metadata ON emotional_states USING GIN (metadata);`,

    // Add metadata to episodic_memories
    `ALTER TABLE episodic_memories ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';`,
    `CREATE INDEX IF NOT EXISTS idx_episodic_memories_metadata ON episodic_memories USING GIN (metadata);`,

    // Ensure user_facts has all columns
    `ALTER TABLE user_facts ADD COLUMN IF NOT EXISTS birthday DATE;`,
    `ALTER TABLE user_facts ADD COLUMN IF NOT EXISTS location TEXT;`,
    `ALTER TABLE user_facts ADD COLUMN IF NOT EXISTS relationship_status TEXT;`,
    `ALTER TABLE user_facts ADD COLUMN IF NOT EXISTS dislikes JSONB DEFAULT '{}';`
  ];

  for (const sql of migrations) {
    try {
      console.log(`🔄 Running: ${sql.substring(0, 50)}...`);
      const { error } = await admin.rpc('exec_sql', { sql });

      if (error) {
        console.error(`❌ Error:`, error);
      } else {
        console.log(`✅ Success`);
      }
    } catch (err) {
      console.error(`❌ Exception:`, err.message);
    }
  }

  console.log('🎉 Metadata columns added! You can now run the migration script.');
}

addMetadataColumns();