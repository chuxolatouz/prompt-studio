'use client';

import {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {Session, User} from '@supabase/supabase-js';
import {getSupabaseBrowserClient, supabaseEnabled} from '@/lib/supabase';

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profileName: string | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{error?: string}>;
  signUp: (email: string, password: string) => Promise<{error?: string}>;
  resetPassword: (email: string) => Promise<{error?: string}>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function syncProfile(user: User | null) {
  if (!user) return {isAdmin: false, profileName: null};
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return {isAdmin: false, profileName: user.email ?? null};

  const displayName = user.email?.split('@')[0] ?? 'Usuario';
  await supabase.from('users_profile').upsert({id: user.id, display_name: displayName}, {onConflict: 'id'});

  const {data: profile} = await supabase.from('users_profile').select('is_admin,display_name').eq('id', user.id).single();
  return {isAdmin: Boolean(profile?.is_admin), profileName: profile?.display_name || user.email || null};
}

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabaseEnabled || !supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({data}) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      const profile = await syncProfile(data.session?.user ?? null);
      setIsAdmin(profile.isAdmin);
      setProfileName(profile.profileName);
      setLoading(false);
    });

    const {
      data: {subscription},
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      const profile = await syncProfile(nextSession?.user ?? null);
      setIsAdmin(profile.isAdmin);
      setProfileName(profile.profileName);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profileName,
      isAdmin,
      loading,
      signIn: async (email, password) => {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) return {error: 'Supabase disabled'};
        const {error} = await supabase.auth.signInWithPassword({email, password});
        return {error: error?.message};
      },
      signUp: async (email, password) => {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) return {error: 'Supabase disabled'};
        const {data, error} = await supabase.auth.signUp({email, password});
        if (error) return {error: error.message};

        if (!data.session) {
          const {error: signInError} = await supabase.auth.signInWithPassword({email, password});
          if (signInError) return {error: signInError.message};
        }

        return {};
      },
      resetPassword: async (email) => {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) return {error: 'Supabase disabled'};
        const {error} = await supabase.auth.resetPasswordForEmail(email);
        return {error: error?.message};
      },
      signOut: async () => {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) return;
        await supabase.auth.signOut();
      },
    }),
    [isAdmin, loading, profileName, session, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
