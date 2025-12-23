#!/usr/bin/env node
// Simple SQL executor using Supabase client
// Usage: node run-sql.js "SELECT * FROM users LIMIT 5;"
// Or: node run-sql.js -f path/to/file.sql

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(supabaseUrl, supabaseServiceKey);

async function runSQL(sql) {
  try {
    console.log('🔍 Executing SQL...');
    console.log('📝 Query:', sql.length > 100 ? sql.substring(0, 100) + '...' : sql);

    const { data, error } = await admin.rpc('query', { query_text: sql });

    if (error) {
      console.error('❌ SQL Error:', error.message);
      console.error('Code:', error.code);
      if (error.details) console.error('Details:', error.details);
      if (error.hint) console.error('Hint:', error.hint);
      return false;
    }

    console.log('✅ Query executed successfully');
    if (data) {
      console.log('📊 Result:', JSON.stringify(data, null, 2));
    }
    return true;

  } catch (error) {
    console.error('❌ Execution failed:', error.message);
    return false;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage:');
  console.log('  node run-sql.js "SELECT version();"');
  console.log('  node run-sql.js -f path/to/file.sql');
  console.log('');
  console.log('Environment variables needed:');
  console.log('  NEXT_PUBLIC_SUPABASE_URL=https://copjpqtwdqrclfrwoaeb.supabase.co');
  console.log('  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  process.exit(1);
}

let sqlQuery;

if (args[0] === '-f') {
  // Read from file
  if (!args[1]) {
    console.error('❌ No file specified');
    process.exit(1);
  }

  try {
    sqlQuery = fs.readFileSync(args[1], 'utf8');
    console.log(`📁 Reading SQL from: ${args[1]}`);
  } catch (error) {
    console.error(`❌ Could not read file ${args[1]}:`, error.message);
    process.exit(1);
  }
} else {
  // Use command line argument as SQL
  sqlQuery = args.join(' ');
}

// Execute the SQL
runSQL(sqlQuery).then(success => {
  process.exit(success ? 0 : 1);
});