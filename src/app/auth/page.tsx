'use client';

import {useEffect, useState} from 'react';
import {useTranslations} from 'next-intl';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {useAuth} from '@/features/common/auth-context';
import {featureFlags} from '@/lib/feature-flags';
import {toast} from 'sonner';

export default function AuthPage() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {user, signIn, signUp, resetPassword, signOut, loading} = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const queryMode = searchParams.get('mode');
  const nextPath = searchParams.get('next');
  const nextQuery = nextPath ? `&next=${encodeURIComponent(nextPath)}` : '';
  const [mode, setMode] = useState<'login' | 'register'>(queryMode === 'register' ? 'register' : 'login');

  useEffect(() => {
    if (queryMode === 'register') {
      setMode('register');
      return;
    }
    if (queryMode === 'login') {
      setMode('login');
    }
  }, [queryMode]);

  useEffect(() => {
    if (!user || !nextPath) return;
    router.replace(nextPath);
  }, [user, nextPath, router]);

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

  if (user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('auth.loggedIn')}</CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => signOut()}>{t('auth.logout')}</Button>
        </CardContent>
      </Card>
    );
  }

  const submit = async () => {
    const response = mode === 'login' ? await signIn(email, password) : await signUp(email, password);
    if (response.error) {
      toast.error(t('auth.genericError'));
      return;
    }
    toast.success(t(mode === 'login' ? 'auth.loginSuccess' : 'auth.registerSuccess'));
    if (nextPath) {
      router.push(nextPath);
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      toast.error(t('auth.resetNeedsEmail'));
      return;
    }
    const response = await resetPassword(email.trim());
    if (response.error) {
      toast.error(t('auth.genericError'));
      return;
    }
    toast.success(t('auth.resetSent'));
  };

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
              setMode('login');
              router.replace(`${pathname}?mode=login${nextQuery}`);
            }}
          >
            {t('auth.login')}
          </Button>
          <Button
            variant={mode === 'register' ? 'default' : 'outline'}
            onClick={() => {
              setMode('register');
              router.replace(`${pathname}?mode=register${nextQuery}`);
            }}
          >
            {t('auth.register')}
          </Button>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-700">{t('auth.email')}</p>
          <Input placeholder="correo@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-700">{t('auth.password')}</p>
          <Input type="password" placeholder="********" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button className="w-full" onClick={submit}>
          {t('auth.continue')}
        </Button>
        {mode === 'login' ? (
          <button type="button" onClick={handleResetPassword} className="text-xs font-medium text-blue-700 underline underline-offset-2">
            {t('auth.forgotPassword')}
          </button>
        ) : null}
      </CardContent>
    </Card>
  );
}
