import { createClient } from '@supabase/supabase-js';
import { ENV } from './env.ts';

// Initialize the Supabase client
// For backend usage, we use the secret API key to bypass RLS and perform admin operations
// In a real production scenario, be careful exposing this to clients.
export const supabase = createClient(
  ENV.SUPABASE_URL || 'https://placeholder.supabase.co',
  ENV.SUPABASE_SECRET_API_KEY || 'placeholder_key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
