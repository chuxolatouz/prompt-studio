import type {AuthError} from '@supabase/supabase-js';
import {localizePath} from '@/lib/site';

export type AuthIntent = 'publish' | 'favorite' | 'account' | 'save' | 'general';
export type AuthMode = 'login' | 'register' | 'forgot' | 'recovery';
export type AuthGateAction = 'publish' | 'favorite';
export type AuthResultStatus =
  | 'success'
  | 'invalid_credentials'
  | 'email_in_use'
  | 'email_confirmation_required'
  | 'rate_limited'
  | 'unknown_error';

export type AuthResult = {
  status: AuthResultStatus;
  messageKey?: string;
};

const LOCAL_BASE_URL = 'http://localhost';

export function parseAuthIntent(value?: string | null): AuthIntent {
  switch (value) {
    case 'publish':
    case 'favorite':
    case 'account':
    case 'save':
      return value;
    default:
      return 'general';
  }
}

export function getDefaultAuthDestination(intent: AuthIntent) {
  return intent === 'account' ? '/dashboard' : '/';
}

export function sanitizeNextPath(value?: string | null, fallback = '/') {
  if (!value) return fallback;
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;

  try {
    const url = new URL(value, LOCAL_BASE_URL);
    if (url.origin !== LOCAL_BASE_URL) return fallback;
    return `${url.pathname}${url.search}${url.hash}` || fallback;
  } catch {
    return fallback;
  }
}

export function buildAuthHref(mode: AuthMode, options: {next?: string | null; intent?: AuthIntent} = {}) {
  const params = new URLSearchParams({mode});
  const safeNext = sanitizeNextPath(options.next, '');
  const intent = options.intent ?? 'general';

  if (safeNext) {
    params.set('next', safeNext);
  }

  params.set('intent', intent);
  return `/auth?${params.toString()}`;
}

export function appendAuthAction(path: string, action: AuthGateAction) {
  const safePath = sanitizeNextPath(path, '/');
  const url = new URL(safePath, LOCAL_BASE_URL);

  if (url.searchParams.get('action') !== action) {
    url.searchParams.set('action', action);
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

export function resolveRecoveryRedirectUrl() {
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const recoveryPath = localizePath('es', buildAuthHref('recovery', {intent: 'general'}));

  if (configuredAppUrl) {
    return `${configuredAppUrl.replace(/\/$/, '')}${recoveryPath}`;
  }

  if (typeof window === 'undefined') return null;
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return null;
  }

  return `${window.location.origin}${recoveryPath}`;
}

export function authResultFromError(error?: Pick<AuthError, 'message' | 'status' | 'code'> | null): AuthResult {
  if (!error) {
    return {status: 'success'};
  }

  const message = (error.message || '').toLowerCase();

  if (error.status === 429 || message.includes('rate limit')) {
    return {status: 'rate_limited', messageKey: 'auth.rateLimited'};
  }

  if (message.includes('invalid login credentials') || message.includes('invalid credentials') || message.includes('invalid grant')) {
    return {status: 'invalid_credentials', messageKey: 'auth.invalidCredentials'};
  }

  if (message.includes('already registered') || message.includes('already been registered')) {
    return {status: 'email_in_use', messageKey: 'auth.emailInUse'};
  }

  if (message.includes('email not confirmed')) {
    return {status: 'email_confirmation_required', messageKey: 'auth.emailConfirmationRequired'};
  }

  return {status: 'unknown_error', messageKey: 'auth.genericError'};
}
