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
  const {user, signIn, signUp, signOut, loading} = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const queryMode = searchParams.get('mode');
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
      toast.error(response.error);
      return;
    }
    toast.success(t(mode === 'login' ? 'auth.loginSuccess' : 'auth.registerSuccess'));
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
              router.replace(`${pathname}?mode=login`);
            }}
          >
            {t('auth.login')}
          </Button>
          <Button
            variant={mode === 'register' ? 'default' : 'outline'}
            onClick={() => {
              setMode('register');
              router.replace(`${pathname}?mode=register`);
            }}
          >
            {t('auth.register')}
          </Button>
        </div>
        <Input placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input type="password" placeholder="********" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button className="w-full" onClick={submit}>
          {mode === 'login' ? t('auth.login') : t('auth.register')}
        </Button>
      </CardContent>
    </Card>
  );
}
