#!/usr/bin/env node

/**
 * NUCLEAR ADMIN CLEANUP SCRIPT
 * 
 * Command line tool to wipe ALL user data across ALL tables
 * Use: npm run admin:cleanup or node scripts/admin-cleanup.js
 * 
 * ⚠️ WARNING: This will delete EVERYTHING for ALL users
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for admin operations

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function confirmNuclearCleanup() {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    console.log('\n🧨 NUCLEAR ADMIN CLEANUP SCRIPT');
    console.log('⚠️  WARNING: This will delete ALL user data for ALL users!');
    console.log('⚠️  This action cannot be undone!');
    
    readline.question('\nType "NUCLEAR WIPE" to confirm: ', (answer) => {
      readline.close();
      resolve(answer === 'NUCLEAR WIPE');
    });
  });
}

async function nuclearCleanup() {
  console.log('\n🧨 Starting NUCLEAR cleanup...');
  
  try {
    // Execute cleanup in dependency order to avoid foreign key constraints
    
    // 1. Clear voice credit ledger first (references voice_wallets)
    console.log('🗑️ Clearing voice credit ledger...');
    const { count: voiceCredits } = await supabase
      .from('voice_credit_ledger')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    // 2. Clear voice wallets
    console.log('🗑️ Clearing voice wallets...');
    const { count: voiceWallets } = await supabase
      .from('voice_wallets')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    // 3. Clear tip ledger
    console.log('🗑️ Clearing tip ledger...');
    const { count: tipLedger } = await supabase
      .from('tip_ledger')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    // 4. Clear enhanced memory tables (in dependency order)
    console.log('🧠 Clearing enhanced memory system...');
    
    // Memory triggers first (references episodic_memories)
    const { count: memoryTriggers } = await supabase
      .from('memory_triggers')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    // User facts (references episodic_memories)  
    const { count: userFacts } = await supabase
      .from('user_facts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Emotional states
    const { count: emotionalStates } = await supabase
      .from('emotional_states')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Episodic memories
    const { count: episodicMemories } = await supabase
      .from('episodic_memories')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Interaction log (chat messages)
    const { count: interactionLog } = await supabase
      .from('interaction_log')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    // 5. Clear legacy memory tables
    console.log('🧠 Clearing legacy memory tables...');
    await supabase.from('lexi_mem_interactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('lexi_mem_episodes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('lexi_mem_facts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    const { count: memories } = await supabase
      .from('memories')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    // 6. Clear daily chat usage
    console.log('📊 Clearing chat usage records...');
    const { count: chatUsage } = await supabase
      .from('daily_chat_usage')
      .delete()
      .neq('user_id', '00000000-0000-0000-0000-000000000000');

    // 7. Clear user display names
    console.log('👤 Clearing display names...');
    const { count: displayNames } = await supabase
      .from('user_display_names')
      .delete()
      .neq('user_id', '00000000-0000-0000-0000-000000000000');

    // 8. Clear user subscriptions last
    console.log('💳 Clearing user subscriptions...');
    const { count: userSubscriptions } = await supabase
      .from('user_subscriptions')
      .delete()
      .neq('user_id', '00000000-0000-0000-0000-000000000000');

    // Results summary
    console.log('\n✅ NUCLEAR CLEANUP COMPLETED SUCCESSFULLY!\n');
    console.log('🗂️  DESTRUCTION REPORT:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`👥 User subscriptions: ${userSubscriptions || 0}`);
    console.log(`🔊 Voice wallets: ${voiceWallets || 0}`);
    console.log(`💰 Voice credits: ${voiceCredits || 0}`);
    console.log(`💸 Tip transactions: ${tipLedger || 0}`);
    console.log(`📊 Chat usage records: ${chatUsage || 0}`);
    console.log(`👤 Display names: ${displayNames || 0}`);
    console.log(`\n🧠 ENHANCED MEMORY SYSTEM:`);
    console.log(`💬 Chat messages: ${interactionLog || 0}`);
    console.log(`📝 Episodic memories: ${episodicMemories || 0}`);
    console.log(`😊 Emotional states: ${emotionalStates || 0}`);
    console.log(`📋 User facts: ${userFacts || 0}`);
    console.log(`🔗 Memory triggers: ${memoryTriggers || 0}`);
    console.log(`🗃️ Legacy memories: ${memories || 0}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🧨 ALL USER DATA OBLITERATED!');
    console.log('🔬 Database is now clean for testing!');

  } catch (error) {
    console.error('\n❌ NUCLEAR CLEANUP FAILED!', error);
    process.exit(1);
  }
}

async function main() {
  // Check environment
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ NUCLEAR CLEANUP DISABLED IN PRODUCTION');
    console.error('This script only runs in development environments');
    process.exit(1);
  }

  // Confirm destructive action
  const confirmed = await confirmNuclearCleanup();
  
  if (!confirmed) {
    console.log('❌ Cleanup cancelled');
    process.exit(0);
  }

  // Execute nuclear cleanup
  await nuclearCleanup();
  
  console.log('\n🚀 Script completed successfully');
  process.exit(0);
}

// Handle ctrl+c gracefully
process.on('SIGINT', () => {
  console.log('\n❌ Cleanup cancelled by user');
  process.exit(0);
});

main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});