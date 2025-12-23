/**
 * Database-based Rate Limiting for Serverless Environments
 *
 * This provides persistent rate limiting when Redis is not available.
 * Uses Supabase database for atomic operations and data persistence.
 */

import { makeServerSupabase } from './supabaseServer';
import type { NextRequest } from 'next/server';

export interface RateLimitData {
  id: string;
  user_id: string;
  endpoint: string;
  character?: string;
  count: number;
  violations: number;
  reset_time: string;
  blocked_until?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Check if rate limit table exists and is accessible
 */
async function checkRateLimitTable(supabase: any): Promise<boolean> {
  try {
    // Check if table exists by trying to select from it
    const { error } = await supabase
      .from('rate_limits')
      .select('id')
      .limit(1);

    if (error && error.code === 'PGRST116') {
      console.warn('[Rate Limiting DB] Table does not exist. Please run the setup SQL first.');
      return false;
    } else if (error) {
      console.warn('[Rate Limiting DB] Table access error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.warn('[Rate Limiting DB] Table check failed:', error);
    return false;
  }
}

/**
 * Database-based rate limit check with atomic operations
 */
export async function dbRateLimitCheck(
  req: NextRequest,
  key: string,
  userId: string,
  endpoint: string,
  character: string | undefined,
  limit: number,
  windowSeconds: number,
  readOnly: boolean = false
): Promise<{
  count: number;
  violations: number;
  resetTime: number;
  isBlocked: boolean;
  allowed: boolean;
}> {
  const supabase = await makeServerSupabase(req);
  const now = new Date();
  const resetTime = new Date(now.getTime() + windowSeconds * 1000);

  try {
    // Check if table exists and is accessible
    const tableExists = await checkRateLimitTable(supabase);
    if (!tableExists) {
      console.warn('[Rate Limiting DB] Table not available, cannot proceed');
      return {
        count: readOnly ? 0 : 1,
        violations: 0,
        resetTime: resetTime.getTime(),
        isBlocked: false,
        allowed: true
      };
    }

    // Clean up expired entries first
    await supabase
      .from('rate_limits')
      .delete()
      .lt('reset_time', now.toISOString());

    if (readOnly) {
      // Read-only mode: just get current values
      const { data, error } = await supabase
        .from('rate_limits')
        .select('count, violations, reset_time, blocked_until')
        .eq('id', key)
        .gte('reset_time', now.toISOString())
        .maybeSingle();

      if (error) {
        console.warn('[Rate Limiting DB] Read query failed:', error);
        return {
          count: 0,
          violations: 0,
          resetTime: resetTime.getTime(),
          isBlocked: false,
          allowed: true
        };
      }

      if (!data) {
        // No entry exists, all limits available
        return {
          count: 0,
          violations: 0,
          resetTime: resetTime.getTime(),
          isBlocked: false,
          allowed: true
        };
      }

      const isBlocked = data.blocked_until && new Date(data.blocked_until) > now;
      const allowed = !isBlocked && data.count < limit;

      return {
        count: data.count,
        violations: data.violations,
        resetTime: new Date(data.reset_time).getTime(),
        isBlocked: !!isBlocked,
        allowed
      };
    } else {
      // Write mode: upsert with atomic increment
      const { data, error } = await supabase.rpc('increment_rate_limit', {
        p_id: key,
        p_user_id: userId,
        p_endpoint: endpoint,
        p_character: character,
        p_limit: limit,
        p_reset_time: resetTime.toISOString()
      });

      if (error) {
        console.warn('[Rate Limiting DB] Increment RPC failed:', error);

        // Fallback to manual upsert
        const { data: existing } = await supabase
          .from('rate_limits')
          .select('count, violations, blocked_until')
          .eq('id', key)
          .gte('reset_time', now.toISOString())
          .maybeSingle();

        let newCount = 1;
        let violations = 0;
        if (existing) {
          newCount = existing.count + 1;
          violations = existing.violations;
        }

        const { error: upsertError } = await supabase
          .from('rate_limits')
          .upsert({
            id: key,
            user_id: userId,
            endpoint: endpoint,
            character: character,
            count: newCount,
            violations: violations,
            reset_time: resetTime.toISOString(),
            updated_at: now.toISOString()
          });

        if (upsertError) {
          console.error('[Rate Limiting DB] Manual upsert failed:', upsertError);
          // Return safe defaults
          return {
            count: 1,
            violations: 0,
            resetTime: resetTime.getTime(),
            isBlocked: false,
            allowed: true
          };
        }

        const isBlocked = existing?.blocked_until && new Date(existing.blocked_until) > now;
        const allowed = !isBlocked && newCount <= limit;

        return {
          count: newCount,
          violations: violations,
          resetTime: resetTime.getTime(),
          isBlocked: !!isBlocked,
          allowed
        };
      }

      // RPC succeeded, use returned data
      // RPC returns a TABLE (array of rows), so we need to get the first row
      const result = (Array.isArray(data) ? data[0] : data) || {};
      const isBlocked = result.blocked_until && new Date(result.blocked_until) > now;
      const allowed = !isBlocked && result.count <= limit;

      return {
        count: result.count || 1,
        violations: result.violations || 0,
        resetTime: resetTime.getTime(),
        isBlocked: !!isBlocked,
        allowed
      };
    }
  } catch (error) {
    console.error('[Rate Limiting DB] Database operation failed:', error);

    // Return safe defaults on error
    return {
      count: readOnly ? 0 : 1,
      violations: 0,
      resetTime: resetTime.getTime(),
      isBlocked: false,
      allowed: true
    };
  }
}

/**
 * Reset rate limit for a user (used when they sign up to give them bonus free messages)
 */
export async function resetRateLimitForUser(
  userId: string,
  endpoint: string = 'chat',
  character?: string
): Promise<boolean> {
  try {
    // Use admin client directly since this is called from auth callback
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // The rate limit key format is: rl:user:{userId}:{endpoint}:{character?}:{timestamp}
    // We need to delete ALL keys that match this user + endpoint pattern
    // Use LIKE pattern matching on the id column
    const pattern = `rl:user:${userId}:${endpoint}%`;

    console.log(`[Rate Limiting DB] Deleting rate limits matching pattern: ${pattern}`);

    const { data: deletedRows, error } = await supabase
      .from('rate_limits')
      .delete()
      .like('id', pattern)
      .select();

    if (error) {
      console.error('[Rate Limiting DB] Failed to reset rate limit:', error);
      return false;
    }

    console.log(`[Rate Limiting DB] ✅ Reset rate limit for user ${userId} on ${endpoint}${character ? ` (${character})` : ''} - deleted ${deletedRows?.length || 0} records`);
    return true;
  } catch (error) {
    console.error('[Rate Limiting DB] Error resetting rate limit:', error);
    return false;
  }
}

// Database infrastructure setup is now handled via direct SQL execution in Supabase
// See rate-limiting-setup.sql for the complete setup script