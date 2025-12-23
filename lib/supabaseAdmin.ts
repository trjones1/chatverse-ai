import { createClient, SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

export const getSupabaseAdmin = () => {
  // Return existing admin client if already created (singleton pattern)
  if (adminClient) {
    return adminClient;
  }
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  // Create and cache the admin client instance
  adminClient = createClient(url, key);
  return adminClient;
};
