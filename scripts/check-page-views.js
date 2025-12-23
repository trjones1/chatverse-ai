// Quick script to check if page_views table exists and has data
// Run with: node scripts/check-page-views.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  console.error('Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPageViews() {
  console.log('🔍 Checking page_views table...\n');

  // Check if table exists
  const { data: tables, error: tablesError } = await supabase
    .from('page_views')
    .select('*')
    .limit(1);

  if (tablesError) {
    if (tablesError.message.includes('relation "public.page_views" does not exist')) {
      console.error('❌ TABLE DOES NOT EXIST');
      console.error('\nThe page_views table has not been created yet.');
      console.error('\n📋 TO FIX: Run the migration in Supabase SQL Editor:');
      console.error('   1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql');
      console.error('   2. Copy contents of: supabase/migrations/20251003000000_page_view_tracking.sql');
      console.error('   3. Paste and execute in SQL editor');
      console.error('   4. Re-run this script to verify\n');
      process.exit(1);
    } else {
      console.error('❌ Error checking table:', tablesError);
      process.exit(1);
    }
  }

  console.log('✅ Table exists!\n');

  // Check for data
  const { data: rows, error: countError } = await supabase
    .from('page_views')
    .select('*', { count: 'exact', head: false });

  if (countError) {
    console.error('❌ Error counting rows:', countError);
    process.exit(1);
  }

  console.log(`📊 Total page views: ${rows?.length || 0}`);

  if (rows && rows.length > 0) {
    console.log('\n📋 Recent page views:');
    rows.slice(0, 5).forEach((row, i) => {
      console.log(`  ${i + 1}. ${row.character_key} - ${row.visitor_id.substring(0, 20)}... - ${row.engaged ? 'ENGAGED' : 'not engaged'}`);
    });
  } else {
    console.log('\n⚠️  No page view data yet');
    console.log('   This means either:');
    console.log('   1. The tracking hook is not firing on the frontend');
    console.log('   2. The API endpoint is failing');
    console.log('   3. No one has visited the page yet');
    console.log('\n💡 TIP: Visit https://chatwithlexi.com and check browser console for tracking errors');
  }

  // Test the analytics function
  console.log('\n🧪 Testing get_page_view_analytics function...');
  const { data: analytics, error: analyticsError } = await supabase
    .rpc('get_page_view_analytics', {
      p_character_key: null,
      p_days_back: 7
    });

  if (analyticsError) {
    if (analyticsError.message.includes('function public.get_page_view_analytics') && analyticsError.message.includes('does not exist')) {
      console.error('❌ FUNCTION DOES NOT EXIST');
      console.error('   The migration was not fully applied. Re-run the migration SQL.');
    } else {
      console.error('❌ Error calling analytics function:', analyticsError);
    }
  } else {
    console.log('✅ Analytics function works!');
    console.log('   Result:', analytics);
  }
}

checkPageViews().catch(err => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
