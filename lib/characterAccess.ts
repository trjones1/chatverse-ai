/**
 * Character Access Management
 * 
 * Handles multi-character authentication where users can have access
 * to multiple characters under a single email account.
 */

import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export interface CharacterAccess {
  id: string;
  user_id: string;
  character_key: string;
  subscription_tier: string;
  subscription_status: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  settings: Record<string, any>;
  granted_at: string;
  created_at: string;
  updated_at: string;
}

export interface UserCharacterInfo {
  character_key: string;
  subscription_tier: string;
  subscription_status: string;
  settings: Record<string, any>;
  granted_at: string;
}

/**
 * Get all characters a user has access to
 */
export async function getUserCharacters(userId: string): Promise<UserCharacterInfo[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('user_character_access')
    .select(`
      character_key,
      subscription_tier,
      subscription_status,
      settings,
      granted_at
    `)
    .eq('user_id', userId)
    .eq('subscription_status', 'active')
    .order('granted_at', { ascending: true });

  if (error) {
    console.error('Error fetching user characters:', error);
    return [];
  }

  return data || [];
}

/**
 * Check if user has access to specific character
 */
export async function hasCharacterAccess(userId: string, characterKey: string): Promise<boolean> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('user_character_access')
    .select('id')
    .eq('user_id', userId)
    .eq('character_key', characterKey)
    .eq('subscription_status', 'active')
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking character access:', error);
    return false;
  }

  return !!data;
}

/**
 * Grant character access to a user (admin function)
 */
export async function grantCharacterAccess(
  userId: string,
  characterKey: string,
  subscriptionTier: string = 'free',
  grantedBy: string = 'system'
): Promise<{ success: boolean; error?: string }> {
  const sbAdmin = getSupabaseAdmin();
  
  const { data, error } = await sbAdmin
    .from('user_character_access')
    .insert({
      user_id: userId,
      character_key: characterKey,
      subscription_tier: subscriptionTier,
      granted_by: grantedBy
    })
    .select('id')
    .single();

  if (error) {
    // Check for duplicate constraint violation
    if (error.code === '23505') {
      return { 
        success: true, 
        error: 'User already has access to this character' 
      };
    }
    console.error('Error granting character access:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Update character subscription info
 */
export async function updateCharacterSubscription(
  userId: string,
  characterKey: string,
  updates: {
    subscription_tier?: string;
    subscription_status?: string;
    stripe_customer_id?: string;
    stripe_subscription_id?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const sbAdmin = getSupabaseAdmin();
  
  const { error } = await sbAdmin
    .from('user_character_access')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('character_key', characterKey);

  if (error) {
    console.error('Error updating character subscription:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get character subscription info
 */
export async function getCharacterSubscription(
  userId: string, 
  characterKey: string
): Promise<CharacterAccess | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('user_character_access')
    .select('*')
    .eq('user_id', userId)
    .eq('character_key', characterKey)
    .single();

  if (error) {
    console.error('Error fetching character subscription:', error);
    return null;
  }

  return data;
}

/**
 * Remove character access (soft delete by setting status to inactive)
 */
export async function removeCharacterAccess(
  userId: string,
  characterKey: string
): Promise<{ success: boolean; error?: string }> {
  const sbAdmin = getSupabaseAdmin();
  
  const { error } = await sbAdmin
    .from('user_character_access')
    .update({
      subscription_status: 'inactive',
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('character_key', characterKey);

  if (error) {
    console.error('Error removing character access:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}