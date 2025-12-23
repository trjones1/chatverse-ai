#!/usr/bin/env node

/**
 * Production Environment Variables Verification Script
 * 
 * This script helps verify that all required environment variables
 * are properly configured in the production deployment environment.
 * 
 * Run this script in production to diagnose environment variable issues.
 */

console.log('🔍 Production Environment Variables Verification');
console.log('================================================\n');

// Required environment variables for the application
const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_SECRET_KEY',
  'NODE_ENV'
];

const OPTIONAL_ENV_VARS = [
  'ELEVENLABS_API_KEY',
  'NEXT_PUBLIC_GTM_ID',
  'RESEND_API_KEY',
  'NEXT_PUBLIC_SITE_URL'
];

let hasErrors = false;

console.log('✅ REQUIRED Environment Variables:');
console.log('----------------------------------');

REQUIRED_ENV_VARS.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    // Mask sensitive values for logging
    const displayValue = varName.includes('KEY') || varName.includes('SECRET') 
      ? `${value.substring(0, 8)}...${value.substring(value.length - 8)}`
      : value.length > 50 
        ? `${value.substring(0, 30)}...`
        : value;
    
    console.log(`  ✅ ${varName}: ${displayValue}`);
  } else {
    console.log(`  ❌ ${varName}: MISSING`);
    hasErrors = true;
  }
});

console.log('\n📋 OPTIONAL Environment Variables:');
console.log('----------------------------------');

OPTIONAL_ENV_VARS.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    const displayValue = varName.includes('KEY') || varName.includes('SECRET') 
      ? `${value.substring(0, 8)}...${value.substring(value.length - 8)}`
      : value.length > 50 
        ? `${value.substring(0, 30)}...`
        : value;
    
    console.log(`  ✅ ${varName}: ${displayValue}`);
  } else {
    console.log(`  ⚠️  ${varName}: not set`);
  }
});

console.log('\n🔧 Environment Information:');
console.log('---------------------------');
console.log(`  Node.js Version: ${process.version}`);
console.log(`  Platform: ${process.platform}`);
console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`  Current Working Directory: ${process.cwd()}`);

// Test Supabase URL format
if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isValidFormat = url.startsWith('https://') && url.includes('.supabase.co');
  console.log(`  Supabase URL Format: ${isValidFormat ? '✅ Valid' : '❌ Invalid format'}`);
  
  if (!isValidFormat) {
    hasErrors = true;
  }
}

// Test Supabase Key format (JWT)
if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isJWT = key.startsWith('eyJ') && key.split('.').length === 3;
  console.log(`  Supabase Key Format: ${isJWT ? '✅ Valid JWT' : '❌ Invalid format'}`);
  
  if (!isJWT) {
    hasErrors = true;
  }
}

console.log('\n📊 Summary:');
console.log('-----------');

if (hasErrors) {
  console.log('❌ CONFIGURATION ISSUES DETECTED');
  console.log('\n🛠️  RECOMMENDED ACTIONS:');
  console.log('1. Verify all environment variables are set in your deployment platform');
  console.log('2. Check that NEXT_PUBLIC_* variables are properly configured');
  console.log('3. Ensure Supabase URL and keys are correct');
  console.log('4. Redeploy after fixing environment variables');
  process.exit(1);
} else {
  console.log('✅ ALL REQUIRED ENVIRONMENT VARIABLES PRESENT');
  console.log('\n🎉 Configuration appears to be correct!');
  process.exit(0);
}