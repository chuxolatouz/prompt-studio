import {createClient, SupabaseClient} from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseEnabled = Boolean(url && anonKey);

let browserClient: SupabaseClient | null = null;

function readCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const encodedName = encodeURIComponent(name);
  const match = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${encodedName}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(encodedName.length + 1));
}

function writeCookie(name: string, value: string) {
  if (typeof document === 'undefined') return;
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}

function clearCookie(name: string) {
  if (typeof document === 'undefined') return;
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${encodeURIComponent(name)}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

const cookieStorage = {
  getItem: (key: string) => readCookie(key),
  setItem: (key: string, value: string) => {
    writeCookie(key, value);
  },
  removeItem: (key: string) => {
    clearCookie(key);
  },
};

export function getSupabaseBrowserClient() {
  if (!supabaseEnabled) return null;
  if (browserClient) return browserClient;

  browserClient = createClient(url!, anonKey!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: cookieStorage,
    },
  });
  return browserClient;
}

export type Visibility = 'public' | 'private';
export type Status = 'active' | 'hidden';
