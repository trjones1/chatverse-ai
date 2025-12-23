#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugBillingPortal() {
  console.log('🔍 Debugging billing portal functionality...\n');
  
  try {
    // 1. Check stripe_customers table
    console.log('1. Checking stripe_customers table...');
    const { data: customers, error: customersError } = await supabase
      .from('stripe_customers')
      .select('*')
      .limit(10);
    
    if (customersError) {
      console.error('❌ Error accessing stripe_customers:', customersError);
    } else {
      console.log(`✅ Found ${customers.length} Stripe customer records`);
      if (customers.length > 0) {
        console.log('Sample customer:', customers[0]);
        
        // Test a real customer
        const testCustomer = customers[0];
        console.log(`\n2. Testing billing portal for customer: ${testCustomer.stripe_customer_id}`);
        
        try {
          const session = await stripe.billingPortal.sessions.create({
            customer: testCustomer.stripe_customer_id,
            return_url: 'https://chatwithlexi.com/dashboard',
          });
          console.log('✅ Billing portal session created successfully!');
          console.log('   Portal URL:', session.url);
          console.log('   Session ID:', session.id);
        } catch (stripeError) {
          console.error('❌ Failed to create billing portal session:', stripeError.message);
        }
      }
    }
    
    // 3. Check for users without Stripe customers
    console.log('\n3. Checking for users without Stripe customer records...');
    const { data: subscriptions, error: subsError } = await supabase
      .from('user_subscriptions')
      .select('user_id, stripe_customer_id, email')
      .limit(10);
    
    if (subsError) {
      console.error('❌ Error accessing user_subscriptions:', subsError);
    } else {
      console.log(`✅ Found ${subscriptions.length} subscription records`);
      
      for (const sub of subscriptions) {
        // Check if this user has a stripe_customers record
        const { data: customerRecord } = await supabase
          .from('stripe_customers')
          .select('stripe_customer_id')
          .eq('user_id', sub.user_id)
          .maybeSingle();
        
        if (!customerRecord) {
          console.log(`⚠️  User ${sub.user_id} has subscription but missing stripe_customers record`);
          console.log(`   Email: ${sub.email}, Stripe Customer: ${sub.stripe_customer_id}`);
          
          // Check if we can create the missing record
          if (sub.stripe_customer_id) {
            console.log(`   💡 Could create stripe_customers record with stripe_customer_id: ${sub.stripe_customer_id}`);
          }
        }
      }
    }
    
    // 4. Test Stripe customer lookup
    console.log('\n4. Testing Stripe customer retrieval...');
    if (customers && customers.length > 0) {
      const testCustomerId = customers[0].stripe_customer_id;
      try {
        const customer = await stripe.customers.retrieve(testCustomerId);
        console.log('✅ Stripe customer retrieval successful');
        console.log('   Customer email:', customer.email);
        console.log('   Customer created:', new Date(customer.created * 1000).toISOString());
      } catch (stripeError) {
        console.error('❌ Failed to retrieve Stripe customer:', stripeError.message);
      }
    }
    
    console.log('\n🎯 Billing portal debugging complete!');
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

debugBillingPortal().then(() => process.exit(0));