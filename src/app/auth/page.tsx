'use client';

import {useEffect, useState} from 'react';
import {useTranslations} from 'next-intl';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {useAuth} from '@/features/common/auth-context';
import {featureFlags} from '@/lib/feature-flags';
import {getSupabaseBrowserClient} from '@/lib/supabase';
import {toast} from 'sonner';

export default function AuthPage() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {user, signIn, signUp, loading} = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const queryMode = searchParams.get('mode');
  const nextPath = searchParams.get('next');
  const nextQuery = nextPath ? `&next=${encodeURIComponent(nextPath)}` : '';
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'recovery'>(() => {
    if (queryMode === 'register') return 'register';
    if (queryMode === 'forgot') return 'forgot';
    if (queryMode === 'recovery') return 'recovery';
    return 'login';
  });

  const resolveRecoveryRedirectUrl = () => {
    const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (configuredAppUrl) {
      return `${configuredAppUrl.replace(/\/$/, '')}/auth?mode=recovery`;
    }

    if (typeof window === 'undefined') return null;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return null;
    }
    return `${window.location.origin}/auth?mode=recovery`;
  };

  useEffect(() => {
    if (queryMode === 'register') {
      setMode('register');
      return;
    }
    if (queryMode === 'forgot') {
      setMode('forgot');
      return;
    }
    if (queryMode === 'recovery') {
      setMode('recovery');
      return;
    }
    if (queryMode === 'login') {
      setMode('login');
      return;
    }
    setMode('login');
  }, [queryMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setMode('recovery');
    }
  }, []);

  useEffect(() => {
    if (mode === 'recovery') return;
    if (!user) return;
    router.replace('/');
  }, [mode, user, router]);

  if (!featureFlags.supabase) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('auth.title')}</CardTitle>
          <CardDescription>{t('auth.disabled')}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (loading) return <p>{t('common.loading')}</p>;

  if (user) return null;

  const submit = async () => {
    const response = mode === 'login' ? await signIn(email, password) : await signUp(email, password);
    if (response.error) {
      toast.error(t('auth.genericError'));
      return;
    }
    toast.success(t(mode === 'login' ? 'auth.loginSuccess' : 'auth.registerSuccess'));
    router.push('/');
  };

  const sendRecoveryLink = async () => {
    if (!email.trim()) {
      toast.error(t('auth.resetNeedsEmail'));
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      toast.error(t('auth.genericError'));
      return;
    }

    const redirectTo = resolveRecoveryRedirectUrl();
    if (!redirectTo) {
      toast.error(t('auth.recoveryConfigError'));
      return;
    }

    const {error} = await supabase.auth.resetPasswordForEmail(email.trim(), {redirectTo});
    if (error) {
      toast.error(t('auth.genericError'));
      return;
    }
    toast.success(t('auth.resetSent'));
  };

  const updatePasswordFromRecovery = async () => {
    const trimmed = newPassword.trim();
    if (!trimmed || trimmed.length < 8) {
      toast.error(t('auth.passwordTooShort'));
      return;
    }
    if (trimmed !== confirmPassword.trim()) {
      toast.error(t('auth.passwordMismatch'));
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      toast.error(t('auth.genericError'));
      return;
    }

    const {error} = await supabase.auth.updateUser({password: trimmed});
    if (error) {
      toast.error(t('auth.genericError'));
      return;
    }

    toast.success(t('auth.passwordUpdated'));
    router.replace('/auth?mode=login');
  };

  const openMode = (nextMode: 'login' | 'register' | 'forgot' | 'recovery') => {
    setMode(nextMode);
    const query = `mode=${nextMode}${nextQuery}`;
    router.replace(`${pathname}?${query}`);
  };

  if (mode === 'recovery') {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle>{t('auth.recoveryTitle')}</CardTitle>
          <CardDescription>{t('auth.recoverySubtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-700">{t('auth.newPassword')}</p>
            <Input type="password" placeholder={t('auth.passwordPlaceholder')} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-700">{t('auth.confirmPassword')}</p>
            <Input type="password" placeholder={t('auth.passwordPlaceholder')} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <Button className="w-full" onClick={updatePasswordFromRecovery}>
            {t('auth.updatePassword')}
          </Button>
          <Button variant="outline" className="w-full" onClick={() => openMode('login')}>
            {t('auth.backToLogin')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (mode === 'forgot') {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle>{t('auth.forgotTitle')}</CardTitle>
          <CardDescription>{t('auth.forgotSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-700">{t('auth.email')}</p>
            <Input placeholder={t('auth.emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button className="w-full" onClick={sendRecoveryLink}>
            {t('auth.sendRecovery')}
          </Button>
          <Button variant="outline" className="w-full" onClick={() => openMode('login')}>
            {t('auth.backToLogin')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>{t('auth.title')}</CardTitle>
        <CardDescription>{t('auth.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={mode === 'login' ? 'default' : 'outline'}
            onClick={() => {
              openMode('login');
            }}
          >
            {t('auth.login')}
          </Button>
          <Button
            variant={mode === 'register' ? 'default' : 'outline'}
            onClick={() => {
              openMode('register');
            }}
          >
            {t('auth.register')}
          </Button>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-700">{t('auth.email')}</p>
          <Input placeholder={t('auth.emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-700">{t('auth.password')}</p>
          <Input type="password" placeholder={t('auth.passwordPlaceholder')} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button className="w-full" onClick={submit}>
          {t('auth.continue')}
        </Button>
        {mode === 'login' ? (
          <button type="button" onClick={() => openMode('forgot')} className="text-xs font-medium text-blue-700 underline underline-offset-2">
            {t('auth.forgotPassword')}
          </button>
        ) : null}
      </CardContent>
    </Card>
  );
}
