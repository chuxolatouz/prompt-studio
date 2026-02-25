import {createClient, SupabaseClient} from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseEnabled = Boolean(url && anonKey);

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  if (!supabaseEnabled) return null;
  if (browserClient) return browserClient;

  browserClient = createClient(url!, anonKey!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return browserClient;
}

export type Visibility = 'public' | 'private';
export type Status = 'active' | 'hidden';
