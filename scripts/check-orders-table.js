#!/usr/bin/env node

// Check the actual structure of the orders table
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function checkOrdersTable() {
  console.log('🔍 Checking orders table structure...\n');
  
  try {
    // Try to select from the table to see what columns exist
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error accessing orders table:', error.message);
      
      // Try to get table info from information_schema
      const { data: schemaInfo, error: schemaError } = await supabase
        .rpc('exec_sql', {
          sql: `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'orders' 
            AND table_schema = 'public'
            ORDER BY ordinal_position;
          `
        });

      if (schemaError) {
        console.error('❌ Cannot check schema:', schemaError.message);
      } else {
        console.log('📋 Table columns from information_schema:');
        console.log(schemaInfo);
      }
    } else {
      console.log('✅ Orders table is accessible');
      console.log('📊 Current record count:', data?.length || 0);
      
      // Try a simple insert to test the schema
      console.log('\n🧪 Testing table schema with a simple insert...');
      
      const testData = {
        user_id: '00000000-0000-0000-0000-000000000000', // Test UUID
        email: 'test@example.com',
        character_key: 'test',
        order_type: 'tip',
        status: 'completed',
        product_type: 'test',
        product_name: 'Test Product',
        amount_cents: 100
      };

      const { error: insertError } = await supabase
        .from('orders')
        .insert(testData)
        .select();

      if (insertError) {
        console.error('❌ Test insert failed:', insertError.message);
        console.log('💡 This tells us what columns are missing or incorrect');
      } else {
        console.log('✅ Test insert successful - schema is working');
        
        // Clean up test record
        await supabase
          .from('orders')
          .delete()
          .eq('email', 'test@example.com');
        console.log('🧹 Cleaned up test record');
      }
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkOrdersTable().catch(console.error);