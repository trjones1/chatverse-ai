#!/usr/bin/env node

// Fix email addresses in orders table using direct PostgreSQL connection
const { Client } = require('pg');

// Use the connection string from environment
const connectionString = process.env.SUPABASE_CONN_STRING;

if (!connectionString) {
  console.error('❌ Missing SUPABASE_CONN_STRING environment variable');
  process.exit(1);
}

async function fixOrdersEmailAddresses() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('🔗 Connected to database');
    
    // Find orders with incorrect emails and get correct ones in one query
    const query = `
      UPDATE public.orders 
      SET email = auth_users.email
      FROM auth.users auth_users
      WHERE public.orders.user_id = auth_users.id
        AND (public.orders.email = '' OR public.orders.email = 'unknown@example.com')
      RETURNING public.orders.id, public.orders.email, auth_users.email as correct_email;
    `;
    
    console.log('🔄 Updating orders with correct email addresses...');
    const result = await client.query(query);
    
    console.log(`✅ Updated ${result.rowCount} orders:`);
    result.rows.forEach(row => {
      console.log(`   • Order ${row.id}: ${row.email}`);
    });
    
  } catch (error) {
    console.error('💥 Error:', error);
  } finally {
    await client.end();
    console.log('🔚 Database connection closed');
  }
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