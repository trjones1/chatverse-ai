#!/usr/bin/env node

// Fix email addresses in orders table by looking up correct emails from auth.users
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixOrdersEmailAddresses() {
  console.log('🔍 Finding orders with incorrect email addresses...');
  
  // Get orders with missing or placeholder emails
  const { data: ordersToFix, error: ordersError } = await supabase
    .from('orders')
    .select('id, user_id, email')
    .or('email.eq.,email.eq.unknown@example.com');
    
  if (ordersError) {
    console.error('❌ Error fetching orders:', ordersError);
    return;
  }
  
  console.log(`📋 Found ${ordersToFix.length} orders with incorrect emails`);
  
  if (ordersToFix.length === 0) {
    console.log('✅ No orders need email fixes');
    return;
  }
  
  // Get unique user IDs
  const userIds = [...new Set(ordersToFix.map(order => order.user_id))];
  console.log(`👥 Looking up emails for ${userIds.length} unique users...`);
  
  // Look up correct emails using direct SQL query
  const userIdsString = userIds.map(id => `'${id}'`).join(',');
  const { data: users, error: usersError } = await supabase.rpc('exec_sql', {
    query: `SELECT id, email FROM auth.users WHERE id IN (${userIdsString})`
  });
    
  if (usersError) {
    console.error('❌ Error fetching users:', usersError);
    return;
  }
  
  // Create user email lookup map
  const userEmailMap = {};
  users.forEach(user => {
    userEmailMap[user.id] = user.email;
  });
  
  console.log(`📧 Found emails for ${users.length} users`);
  
  // Update orders with correct emails
  let updatedCount = 0;
  let skippedCount = 0;
  
  for (const order of ordersToFix) {
    const correctEmail = userEmailMap[order.user_id];
    
    if (!correctEmail) {
      console.log(`⚠️  No email found for user ${order.user_id}, order ${order.id}`);
      skippedCount++;
      continue;
    }
    
    if (correctEmail === order.email) {
      console.log(`✓ Order ${order.id} already has correct email`);
      continue;
    }
    
    console.log(`📝 Updating order ${order.id}: "${order.email}" → "${correctEmail}"`);
    
    const { error: updateError } = await supabase
      .from('orders')
      .update({ email: correctEmail })
      .eq('id', order.id);
      
    if (updateError) {
      console.error(`❌ Error updating order ${order.id}:`, updateError);
      skippedCount++;
    } else {
      updatedCount++;
    }
  }
  
  console.log(`\n✅ Email fix complete:`);
  console.log(`   • Updated: ${updatedCount} orders`);
  console.log(`   • Skipped: ${skippedCount} orders`);
  console.log(`   • Total processed: ${ordersToFix.length} orders`);
}

// Run the fix
fixOrdersEmailAddresses()
  .then(() => {
    console.log('🎉 Orders email fix completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Orders email fix failed:', error);
    process.exit(1);
  });