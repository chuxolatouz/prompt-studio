'use client';

import {useState} from 'react';
import {useTranslations} from 'next-intl';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {useAuth} from '@/features/common/auth-context';
import {featureFlags} from '@/lib/feature-flags';

export default function AuthPage() {
  const t = useTranslations();
  const {user, signIn, signUp, signOut, loading} = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');

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
      alert(response.error);
      return;
    }
    alert(t(mode === 'login' ? 'auth.loginSuccess' : 'auth.registerSuccess'));
  };

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>{t('auth.title')}</CardTitle>
        <CardDescription>{t('auth.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Button variant={mode === 'login' ? 'default' : 'outline'} onClick={() => setMode('login')}>
            {t('auth.login')}
          </Button>
          <Button variant={mode === 'register' ? 'default' : 'outline'} onClick={() => setMode('register')}>
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
