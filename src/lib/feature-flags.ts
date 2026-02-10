import {supabaseEnabled} from '@/lib/supabase';

export const featureFlags = {
  supabase: supabaseEnabled,
  publicPublishing: supabaseEnabled,
  gallery: supabaseEnabled,
  moderation: supabaseEnabled,
} as const;
