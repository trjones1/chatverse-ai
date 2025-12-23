#!/usr/bin/env node

// Seed the orders table with existing data from user_subscriptions, tips, and credits_grants
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function seedOrdersFromExistingData() {
  console.log('🌱 Seeding orders table with existing data...\n');
  
  try {
    // First check if orders table exists
    const { data: tableCheck, error: checkError } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true });

    if (checkError) {
      console.error('❌ Orders table does not exist. Please run create-orders-table.js first');
      process.exit(1);
    }

    console.log(`ℹ️ Orders table exists with ${tableCheck?.length || 0} existing records\n`);

    let totalSeeded = 0;

    // 1. SEED SUBSCRIPTION ORDERS FROM user_subscriptions
    console.log('1️⃣ Seeding subscription orders from user_subscriptions...');
    
    const { data: subscriptions, error: subsError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .not('user_id', 'is', null);

    if (subsError) {
      console.warn('⚠️ Error fetching subscriptions:', subsError.message);
    } else {
      console.log(`📊 Found ${subscriptions?.length || 0} subscriptions to migrate`);

      if (subscriptions && subscriptions.length > 0) {
        for (const sub of subscriptions) {
          try {
            // Create order record for subscription
            const orderData = {
              user_id: sub.user_id,
              email: sub.customer_email || 'unknown@example.com',
              character_key: 'lexi', // Default character, could be inferred from data
              
              order_type: 'subscription',
              status: sub.status === 'active' ? 'completed' : 'cancelled',
              
              product_type: sub.tier === 'sfw' ? 'sfw_premium' : 'nsfw_premium',
              product_name: sub.tier === 'sfw' ? 'SFW Premium Subscription' : 'NSFW Premium Subscription',
              tier: sub.tier,
              
              amount_cents: sub.tier === 'sfw' ? 999 : 2999, // $9.99 or $29.99
              currency: 'usd',
              
              stripe_customer_id: sub.stripe_customer_id,
              stripe_subscription_id: sub.stripe_subscription_id,
              
              subscription_status: sub.status,
              subscription_start_date: sub.current_period_start,
              subscription_end_date: sub.current_period_end,
              
              webhook_event_id: `migration_sub_${sub.id}`,
              created_at: sub.created_at,
              completed_at: sub.status === 'active' ? sub.created_at : null
            };

            const { error: insertError } = await supabase
              .from('orders')
              .insert(orderData);

            if (insertError) {
              if (insertError.message?.includes('duplicate')) {
                console.log(`   ↪️ Subscription ${sub.id} already migrated, skipping`);
              } else {
                console.warn(`   ⚠️ Error inserting subscription ${sub.id}:`, insertError.message);
              }
            } else {
              console.log(`   ✅ Migrated subscription: ${sub.tier} for user ${sub.user_id.substring(0, 8)}...`);
              totalSeeded++;
            }
          } catch (error) {
            console.warn(`   ❌ Error processing subscription ${sub.id}:`, error.message);
          }
        }
      }
    }

    console.log(`✅ Subscription seeding complete: ${totalSeeded} records\n`);

    // 2. SEED TIP ORDERS FROM tips table
    console.log('2️⃣ Seeding tip orders from tips table...');
    
    const { data: tips, error: tipsError } = await supabase
      .from('tips')
      .select('*')
      .eq('status', 'completed');

    if (tipsError) {
      console.warn('⚠️ Error fetching tips:', tipsError.message);
    } else {
      console.log(`📊 Found ${tips?.length || 0} completed tips to migrate`);

      if (tips && tips.length > 0) {
        for (const tip of tips) {
          try {
            const orderData = {
              stripe_payment_intent_id: tip.stripe_payment_intent_id,
              user_id: tip.user_id,
              email: tip.customer_email || 'unknown@example.com',
              character_key: tip.character_key || 'lexi',
              
              order_type: 'tip',
              status: 'completed',
              
              product_type: 'tip',
              product_name: `Tip to ${(tip.character_key || 'lexi').charAt(0).toUpperCase() + (tip.character_key || 'lexi').slice(1)}`,
              
              amount_cents: tip.amount_cents,
              currency: tip.currency || 'usd',
              
              tip_amount_cents: tip.amount_cents,
              tip_character: tip.character_key,
              
              stripe_metadata: tip.message ? { tip_message: tip.message } : {},
              webhook_event_id: `migration_tip_${tip.id}`,
              created_at: tip.created_at,
              completed_at: tip.updated_at || tip.created_at
            };

            const { error: insertError } = await supabase
              .from('orders')
              .insert(orderData);

            if (insertError) {
              if (insertError.message?.includes('duplicate')) {
                console.log(`   ↪️ Tip ${tip.id} already migrated, skipping`);
              } else {
                console.warn(`   ⚠️ Error inserting tip ${tip.id}:`, insertError.message);
              }
            } else {
              console.log(`   ✅ Migrated tip: $${(tip.amount_cents / 100).toFixed(2)} to ${tip.character_key}`);
              totalSeeded++;
            }
          } catch (error) {
            console.warn(`   ❌ Error processing tip ${tip.id}:`, error.message);
          }
        }
      }
    }

    console.log(`✅ Tips seeding complete\n`);

    // 3. SEED VOICE PACK ORDERS FROM credits_grants
    console.log('3️⃣ Seeding voice pack orders from credits_grants...');
    
    const { data: voicePacks, error: voiceError } = await supabase
      .from('credits_grants')
      .select('*')
      .like('reason', '%Credit pack%');

    if (voiceError) {
      console.warn('⚠️ Error fetching voice pack grants:', voiceError.message);
    } else {
      console.log(`📊 Found ${voicePacks?.length || 0} voice pack purchases to migrate`);

      if (voicePacks && voicePacks.length > 0) {
        for (const pack of voicePacks) {
          try {
            // Determine price based on credits
            let amountCents = 0;
            let productType = 'voice_pack';
            let productName = 'Voice Pack';
            
            switch (pack.credits) {
              case 10:
                amountCents = 500; // $5.00
                productType = 'voice_10';
                productName = 'Voice Pack (10 credits)';
                break;
              case 25:
                amountCents = 1000; // $10.00
                productType = 'voice_25';
                productName = 'Voice Pack (25 credits)';
                break;
              case 50:
                amountCents = 1800; // $18.00
                productType = 'voice_50';
                productName = 'Voice Pack (50 credits)';
                break;
              case 100:
                amountCents = 3500; // $35.00
                productType = 'voice_100';
                productName = 'Voice Pack (100 credits)';
                break;
              default:
                amountCents = pack.credits * 50; // Estimate at $0.50 per credit
                productType = 'voice_custom';
                productName = `Voice Pack (${pack.credits} credits)`;
            }

            const orderData = {
              user_id: pack.user_id,
              email: 'migration@example.com', // No email in credits_grants
              character_key: 'lexi', // Default character
              
              order_type: 'voice_pack',
              status: 'completed',
              
              product_type: productType,
              product_name: productName,
              tier: `voice_pack_${pack.credits}`,
              
              amount_cents: amountCents,
              currency: 'usd',
              
              voice_credits: pack.credits,
              
              stripe_metadata: { reason: pack.reason, migration_source: 'credits_grants' },
              webhook_event_id: `migration_voice_${pack.id}`,
              created_at: pack.created_at,
              completed_at: pack.created_at
            };

            const { error: insertError } = await supabase
              .from('orders')
              .insert(orderData);

            if (insertError) {
              if (insertError.message?.includes('duplicate')) {
                console.log(`   ↪️ Voice pack ${pack.id} already migrated, skipping`);
              } else {
                console.warn(`   ⚠️ Error inserting voice pack ${pack.id}:`, insertError.message);
              }
            } else {
              console.log(`   ✅ Migrated voice pack: ${pack.credits} credits ($${(amountCents / 100).toFixed(2)})`);
              totalSeeded++;
            }
          } catch (error) {
            console.warn(`   ❌ Error processing voice pack ${pack.id}:`, error.message);
          }
        }
      }
    }

    console.log(`✅ Voice pack seeding complete\n`);

    // Final verification
    const { data: finalCount, error: countError } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true });

    if (!countError) {
      console.log(`🎯 Orders table seeding complete!`);
      console.log(`📊 Total records in orders table: ${finalCount?.length || 0}`);
      console.log(`📈 Records added in this migration: ${totalSeeded}`);
      
      // Show breakdown by order type
      const { data: breakdown } = await supabase
        .from('orders')
        .select('order_type')
        .not('webhook_event_id', 'is', null);

      if (breakdown) {
        const counts = breakdown.reduce((acc, order) => {
          acc[order.order_type] = (acc[order.order_type] || 0) + 1;
          return acc;
        }, {});

        console.log('\n📋 Order type breakdown:');
        Object.entries(counts).forEach(([type, count]) => {
          console.log(`   ${type}: ${count} orders`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message || error);
    throw error;
  }
}

async function main() {
  console.log('🚨 SEED ORDERS TABLE FROM EXISTING DATA');
  console.log('This migrates historical data from user_subscriptions, tips, and credits_grants tables.\n');
  
  await seedOrdersFromExistingData();
  
  console.log('\n📝 Next steps:');
  console.log('1. Analytics dashboard should now show historical revenue data');
  console.log('2. Voice pack revenue should appear in analytics');
  console.log('3. All future purchases will continue to be tracked automatically');
  console.log('4. Test analytics endpoints to verify data accuracy');
}

main().catch(console.error);