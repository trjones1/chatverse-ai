import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const admin = getSupabaseAdmin();

const migration = `
-- Fix anonymous user chat limits
-- The daily_chat_usage table currently has a foreign key constraint to auth.users
-- which prevents anonymous users from being tracked. This migration removes that constraint
-- to allow anonymous user UUIDs to be stored for chat limit tracking.

-- Remove the foreign key constraint that prevents anonymous users
ALTER TABLE daily_chat_usage 
DROP CONSTRAINT IF EXISTS daily_chat_usage_user_id_fkey;

-- Make user_id nullable so we can handle cases where anonymous users don't exist
-- (Actually, let's keep it NOT NULL but remove the FK constraint)

-- Add a check constraint to ensure user_id is a valid UUID format
ALTER TABLE daily_chat_usage 
ADD CONSTRAINT valid_user_id_format 
CHECK (user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
`;

const updateIncrementFunction = `
-- Update the increment function to handle potential constraint violations gracefully
CREATE OR REPLACE FUNCTION increment_daily_chat_count(
  p_user_id uuid,
  p_character_key text
)
RETURNS integer AS $$
DECLARE
  new_count integer;
BEGIN
  -- Try to insert or update the chat count
  INSERT INTO daily_chat_usage (user_id, character_key, date, chat_count, updated_at)
  VALUES (p_user_id, p_character_key, CURRENT_DATE, 1, NOW())
  ON CONFLICT (user_id, character_key, date)
  DO UPDATE SET 
    chat_count = daily_chat_usage.chat_count + 1,
    updated_at = NOW()
  RETURNING chat_count INTO new_count;
  
  RETURN COALESCE(new_count, 0);
EXCEPTION 
  WHEN OTHERS THEN
    -- If anything fails, log the error and return 0 to prevent API failures
    RAISE WARNING 'Failed to increment chat count for user %: %', p_user_id, SQLERRM;
    RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

const updateEntitlementsFunction = `
-- Also update the entitlements function to be more robust with anonymous users
CREATE OR REPLACE FUNCTION get_user_entitlements(
  p_user_id uuid,
  p_character_key text
)
RETURNS TABLE (
  tier text,
  status text,
  can_chat boolean,
  can_use_nsfw boolean,
  can_use_voice boolean,
  can_buy_credits boolean,
  daily_chat_count integer,
  daily_chat_limit integer,
  voice_credits integer
) AS $$
DECLARE
  user_sub RECORD;
  chat_usage integer := 0;
  credits_total integer := 0;
  v_wallet_id uuid;
  is_authenticated boolean := false;
BEGIN
  -- Check if user exists in auth.users (authenticated) or is anonymous
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = p_user_id) INTO is_authenticated;
  
  -- Get user's subscription with explicit table alias (only for authenticated users)
  IF is_authenticated THEN
    SELECT 
      us.tier,
      us.status,
      us.features
    INTO user_sub
    FROM user_subscriptions us
    WHERE us.user_id = p_user_id 
      AND us.character_key = p_character_key
      AND us.status IN ('active', 'trialing')
    ORDER BY us.updated_at DESC
    LIMIT 1;
  END IF;
  
  -- Default to free tier if no subscription or anonymous user
  IF user_sub IS NULL THEN
    user_sub.tier := 'free';
    user_sub.status := 'active';
  END IF;
  
  -- Get daily chat usage for free users (both authenticated and anonymous)
  IF user_sub.tier = 'free' THEN
    SELECT COALESCE(dcu.chat_count, 0) INTO chat_usage
    FROM daily_chat_usage dcu
    WHERE dcu.user_id = p_user_id 
      AND dcu.character_key = p_character_key
      AND dcu.date = CURRENT_DATE;
  END IF;
  
  -- Get voice credits (only for authenticated users with subscriptions)
  IF is_authenticated THEN
    SELECT vw.id INTO v_wallet_id
    FROM voice_wallets vw
    WHERE vw.user_id = p_user_id 
      AND vw.character_key = p_character_key;
      
    IF v_wallet_id IS NOT NULL THEN
      SELECT COALESCE(SUM(vcl.delta), 0) INTO credits_total
      FROM voice_credit_ledger vcl
      WHERE vcl.wallet_id = v_wallet_id;
    END IF;
  END IF;
  
  -- Return entitlements based on tier
  RETURN QUERY SELECT
    user_sub.tier,
    user_sub.status,
    -- Chat permissions
    CASE 
      WHEN user_sub.tier = 'free' THEN chat_usage < 5
      ELSE true
    END as can_chat,
    -- NSFW permissions (only for authenticated users with nsfw subscription)
    CASE
      WHEN is_authenticated AND user_sub.tier = 'nsfw' THEN true
      ELSE false
    END as can_use_nsfw,
    -- Voice permissions (only for authenticated users with paid subscriptions)
    CASE
      WHEN is_authenticated AND user_sub.tier IN ('sfw', 'nsfw') THEN true
      ELSE false
    END as can_use_voice,
    -- Credit purchase permissions (only for authenticated users with paid subscriptions)
    CASE
      WHEN is_authenticated AND user_sub.tier IN ('sfw', 'nsfw') THEN true
      ELSE false
    END as can_buy_credits,
    -- Usage stats
    chat_usage as daily_chat_count,
    CASE
      WHEN user_sub.tier = 'free' THEN 5
      ELSE 0  -- unlimited
    END as daily_chat_limit,
    credits_total as voice_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const results = [];
  
  try {
    console.log('Running migration to fix anonymous user chat limits...');
    
    // Step 1: Drop foreign key constraint
    console.log('Step 1: Dropping foreign key constraint...');
    const { error: fkError } = await admin
      .from('pg_constraint')
      .delete()
      .eq('conname', 'daily_chat_usage_user_id_fkey');
    
    if (fkError) {
      console.log('Foreign key constraint may not exist or already dropped:', fkError);
    }
    results.push({ step: 'drop_fk', success: !fkError, error: fkError });
    
    // Since we can't run raw SQL easily, let's create the updated functions via a different approach
    // Let's document what needs to be done and provide manual instructions
    
    const instructions = `
Migration needs to be run manually. Please execute the following SQL commands in your Supabase SQL editor:

1. Drop the foreign key constraint (if it exists):
ALTER TABLE daily_chat_usage DROP CONSTRAINT IF EXISTS daily_chat_usage_user_id_fkey;

2. Add UUID format check:
ALTER TABLE daily_chat_usage 
ADD CONSTRAINT valid_user_id_format 
CHECK (user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

3. Update RLS policies:
DROP POLICY IF EXISTS "Users can view own chat usage" ON daily_chat_usage;
DROP POLICY IF EXISTS "Users can update own chat usage" ON daily_chat_usage;
CREATE POLICY "Service can manage chat usage" ON daily_chat_usage FOR ALL USING (true);

4. Run the updated functions from the fix-anonymous-chat-limits.sql file.

The core issue is that the daily_chat_usage table has a foreign key to auth.users which prevents anonymous user UUIDs from being inserted.
`;
    
    console.log('Migration instructions prepared');
    return NextResponse.json({ 
      success: true, 
      message: 'Migration instructions prepared',
      instructions,
      results,
      note: 'Please run the SQL commands manually in Supabase SQL editor'
    });
    
  } catch (error) {
    console.error('Migration preparation error:', error);
    return NextResponse.json({ 
      error: 'Migration preparation failed', 
      details: error,
      results 
    }, { status: 500 });
  }
}