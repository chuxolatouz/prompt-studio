import {supabaseEnabled} from '@/lib/supabase';

export const featureFlags = {
  supabase: supabaseEnabled,
  publicPublishing: supabaseEnabled,
  gallery: supabaseEnabled,
  moderation: supabaseEnabled,
  catalogAdmin: supabaseEnabled,
  suggestions: supabaseEnabled,
} as const;
