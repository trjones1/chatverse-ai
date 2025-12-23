import { createBrowserClient } from '@supabase/ssr'

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  // Return existing client if already created (singleton pattern)
  if (supabaseClient) {
    return supabaseClient
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // Enhanced error reporting for production debugging
  if (!supabaseUrl) {
    console.error('CRITICAL: Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
    console.error('Available env vars:', Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_')))
    throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL')
  }
  
  if (!supabaseAnonKey) {
    console.error('CRITICAL: Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
    console.error('NEXT_PUBLIC_SUPABASE_URL is present:', !!supabaseUrl)
    console.error('Available env vars:', Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_')))
    throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  try {
    // Create and cache the client instance
    supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
    console.log('✅ Supabase client created successfully')
    return supabaseClient
  } catch (error) {
    console.error('CRITICAL: Failed to create Supabase client:', error)
    console.error('URL length:', supabaseUrl.length, 'Key length:', supabaseAnonKey.length)
    throw error
  }
}