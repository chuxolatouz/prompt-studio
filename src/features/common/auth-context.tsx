'use client';

import {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {Session, User} from '@supabase/supabase-js';
import {getSupabaseBrowserClient, supabaseEnabled} from '@/lib/supabase';
import {authResultFromError, resolveRecoveryRedirectUrl, type AuthResult} from '@/lib/auth';

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profileName: string | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function syncProfile(user: User | null) {
  if (!user) return {isAdmin: false, profileName: null};
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return {isAdmin: false, profileName: user.email ?? null};
  const {data: profile} = await supabase.from('users_profile').select('is_admin,display_name').eq('id', user.id).maybeSingle();

  if (profile) {
    return {isAdmin: Boolean(profile.is_admin), profileName: profile.display_name || user.email || null};
  }

  const displayName = user.email?.split('@')[0] ?? 'Usuario';
  await supabase.from('users_profile').upsert({id: user.id, display_name: displayName}, {onConflict: 'id'});
  return {isAdmin: false, profileName: displayName || user.email || null};
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
        if (!supabase) return {status: 'unknown_error', messageKey: 'auth.disabled'};
        const {error} = await supabase.auth.signInWithPassword({email, password});
        return authResultFromError(error);
      },
      signUp: async (email, password) => {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) return {status: 'unknown_error', messageKey: 'auth.disabled'};
        const {data, error} = await supabase.auth.signUp({email, password});
        const result = authResultFromError(error);
        if (result.status !== 'success') return result;

        if (!data.session) {
          return {status: 'email_confirmation_required', messageKey: 'auth.emailConfirmationRequired'};
        }

        return {status: 'success'};
      },
      resetPassword: async (email) => {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) return {status: 'unknown_error', messageKey: 'auth.disabled'};

        const redirectTo = resolveRecoveryRedirectUrl();
        if (!redirectTo) {
          return {status: 'unknown_error', messageKey: 'auth.recoveryConfigError'};
        }

        const {error} = await supabase.auth.resetPasswordForEmail(email, {redirectTo});
        return authResultFromError(error);
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
