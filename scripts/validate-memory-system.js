#!/usr/bin/env node

/**
 * Memory System Validation Script
 * 
 * Tests the current memory system deployment and identifies issues.
 * Run this script to validate memory functionality before implementing enhancements.
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function validateMemorySystem() {
  console.log('🧠 Memory System Validation');
  console.log('==========================\n');

  const results = {
    database: { tables: 0, functions: 0 },
    integration: { working: 0, total: 3 },
    issues: []
  };

  // Test 1: Database Schema Validation
  console.log('1️⃣ Validating Database Schema...');
  
  const tables = [
    'user_facts',
    'emotional_states', 
    'episodic_memories',
    'interaction_log',
    'memory_triggers'
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
        
      if (error) {
        console.log(`   ❌ Table '${table}' not found or inaccessible: ${error.message}`);
        results.issues.push(`Missing table: ${table}`);
      } else {
        console.log(`   ✅ Table '${table}' exists`);
        results.database.tables++;
      }
    } catch (err) {
      console.log(`   ❌ Table '${table}' validation failed: ${err.message}`);
      results.issues.push(`Table validation failed: ${table}`);
    }
  }

  // Test 2: Database Functions Validation
  console.log('\n2️⃣ Validating Database Functions...');
  
  const functions = [
    'get_comprehensive_memory',
    'update_emotional_state_safe',
    'create_episodic_memory'
  ];

  for (const func of functions) {
    try {
      // Test with dummy parameters to see if function exists
      const { data, error } = await supabase.rpc(func, {
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_character_key: 'test'
      });
      
      if (error && error.code === '42883') {
        console.log(`   ❌ Function '${func}' not found`);
        results.issues.push(`Missing function: ${func}`);
      } else {
        console.log(`   ✅ Function '${func}' exists`);
        results.database.functions++;
      }
    } catch (err) {
      console.log(`   ❌ Function '${func}' validation failed: ${err.message}`);
      results.issues.push(`Function validation failed: ${func}`);
    }
  }

  // Test 3: Memory System Integration Test
  console.log('\n3️⃣ Testing Memory System Integration...');
  
  const testUserId = '493c6cdf-2394-4d3c-9a3a-1dae1999af2c'; // Your user ID from logs
  
  try {
    // Test memory retrieval
    console.log('   Testing memory retrieval...');
    const { data: memoryData, error: memoryError } = await supabase.rpc('get_comprehensive_memory', {
      p_user_id: testUserId,
      p_character_key: 'lexi',
      p_episode_limit: 5
    });
    
    if (memoryError) {
      console.log(`   ❌ Memory retrieval failed: ${memoryError.message}`);
      results.issues.push('Memory retrieval not working');
    } else {
      console.log(`   ✅ Memory retrieval successful`);
      console.log(`      Facts: ${memoryData?.[0]?.facts ? 'Present' : 'None'}`);
      console.log(`      Emotions: ${memoryData?.[0]?.emotions ? 'Present' : 'None'}`);
      console.log(`      Episodes: ${memoryData?.[0]?.episodes?.length || 0} found`);
      results.integration.working++;
    }
  } catch (err) {
    console.log(`   ❌ Memory integration test failed: ${err.message}`);
    results.issues.push('Memory integration broken');
  }

  try {
    // Test interaction logging
    console.log('   Testing interaction logging...');
    const { data: logData, error: logError } = await supabase
      .from('interaction_log')
      .insert({
        user_id: testUserId,
        character_key: 'lexi',
        role: 'user',
        content: 'Memory system validation test message',
        topics: ['test'],
        emotional_tone: 'neutral'
      })
      .select();
      
    if (logError) {
      console.log(`   ❌ Interaction logging failed: ${logError.message}`);
      results.issues.push('Interaction logging not working');
    } else {
      console.log(`   ✅ Interaction logging successful`);
      results.integration.working++;
    }
  } catch (err) {
    console.log(`   ❌ Interaction logging test failed: ${err.message}`);
    results.issues.push('Interaction logging broken');
  }

  try {
    // Test emotional state update
    console.log('   Testing emotional state updates...');
    const { data: emotionData, error: emotionError } = await supabase.rpc('update_emotional_state_safe', {
      p_user_id: testUserId,
      p_character_key: 'lexi',
      p_affection_delta: 1,
      p_trust_delta: 0,
      p_jealousy_delta: 0,
      p_playfulness_delta: 1,
      p_clinginess_delta: 0,
      p_intimacy_delta: 0
    });
    
    if (emotionError) {
      console.log(`   ❌ Emotional state update failed: ${emotionError.message}`);
      results.issues.push('Emotional state updates not working');
    } else {
      console.log(`   ✅ Emotional state update successful`);
      results.integration.working++;
    }
  } catch (err) {
    console.log(`   ❌ Emotional state test failed: ${err.message}`);
    results.issues.push('Emotional state updates broken');
  }

  // Test 4: Legacy Memory System Check
  console.log('\n4️⃣ Checking Legacy Memory System...');
  
  try {
    const { data: legacyData, error: legacyError } = await supabase
      .from('memories')
      .select('*')
      .eq('user_id', testUserId)
      .limit(5);
      
    if (legacyError) {
      console.log(`   ❌ Legacy memories table not accessible: ${legacyError.message}`);
    } else {
      console.log(`   ✅ Legacy memories table found with ${legacyData.length} entries`);
      if (legacyData.length > 0) {
        console.log(`      Latest memory: ${new Date(legacyData[0].created_at).toLocaleString()}`);
      }
    }
  } catch (err) {
    console.log(`   ❌ Legacy memory check failed: ${err.message}`);
  }

  // Results Summary
  console.log('\n📊 Validation Results');
  console.log('====================');
  console.log(`Database Tables: ${results.database.tables}/${tables.length}`);
  console.log(`Database Functions: ${results.database.functions}/${functions.length}`);
  console.log(`Integration Tests: ${results.integration.working}/${results.integration.total}`);
  
  if (results.issues.length === 0) {
    console.log('\n🎉 Memory system is fully functional!');
    return true;
  } else {
    console.log('\n⚠️  Issues Found:');
    results.issues.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}`);
    });
    
    console.log('\n🔧 Recommended Actions:');
    
    if (results.database.tables < tables.length) {
      console.log('   • Deploy enhanced memory schema migration');
      console.log('   • Run: supabase db push');
    }
    
    if (results.database.functions < functions.length) {
      console.log('   • Deploy database functions from migration');
      console.log('   • Check supabase/migrations/20250902120000_enhanced_memory_system.sql');
    }
    
    if (results.integration.working < results.integration.total) {
      console.log('   • Fix memory system integration in lib/memorySystem.ts');
      console.log('   • Validate database permissions and RLS policies');
    }
    
    return false;
  }
}

// Main execution
if (require.main === module) {
  validateMemorySystem()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Validation script failed:', error);
      process.exit(1);
    });
}

module.exports = { validateMemorySystem };