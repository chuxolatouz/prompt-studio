'use client';

import {useEffect, useState} from 'react';
import {useTranslations} from 'next-intl';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {useAuth} from '@/features/common/auth-context';
import {UserSuggestionsCard} from '@/features/suggestions/user-suggestions-card';
import {Link} from '@/i18n/navigation';
import {buildAuthHref} from '@/lib/auth';
import {featureFlags} from '@/lib/feature-flags';
import {getSupabaseBrowserClient} from '@/lib/supabase';

type Item = {id: string; title: string; created_at?: string; visibility?: string};

export default function DashboardPage() {
  const t = useTranslations();
  const {user, loading, isAdmin} = useAuth();
  const [prompts, setPrompts] = useState<Item[]>([]);
  const [packs, setPacks] = useState<Item[]>([]);
  const [agents, setAgents] = useState<Item[]>([]);
  const [favorites, setFavorites] = useState<Item[]>([]);

  useEffect(() => {
    if (!featureFlags.supabase || !user) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    supabase.from('prompts').select('id,title,created_at,visibility').eq('owner_id', user.id).then(({data}) => {
      setPrompts((data as Item[]) ?? []);
    });

    supabase.from('skill_packs').select('id,title,created_at,visibility').eq('owner_id', user.id).then(({data}) => {
      setPacks((data as Item[]) ?? []);
    });

    supabase.from('agents').select('id,title,created_at,visibility').eq('owner_id', user.id).then(({data}) => {
      setAgents((data as Item[]) ?? []);
    });

    supabase
      .from('favorites')
      .select('prompt_id')
      .eq('user_id', user.id)
      .then(async ({data}) => {
        const ids = (data ?? []).map((row) => String((row as {prompt_id: string}).prompt_id)).filter(Boolean);

        if (ids.length === 0) {
          setFavorites([]);
          return;
        }

        const {data: promptData} = await supabase.from('prompts').select('id,title,created_at,visibility').in('id', ids);
        setFavorites((promptData as Item[]) ?? []);
      });
  }, [user]);

  const Section = ({title, subtitle, items}: {title: string; subtitle: string; items: Item[]}) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-slate-600">{t('dashboard.empty')}</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2">
              <p className="text-sm font-semibold">{item.title}</p>
              <Badge variant="secondary">{item.visibility || t('dashboard.local')}</Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );

  if (!featureFlags.supabase) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.disabledTitle')}</CardTitle>
            <CardDescription>{t('dashboard.disabledDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/builders">{t('auth.exploreBuilders')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-slate-600">{t('common.loading')}</p>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.authRequiredTitle')}</CardTitle>
            <CardDescription>{t('dashboard.authRequiredSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">{t('dashboard.authRequiredDescription')}</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href={buildAuthHref('login', {next: '/dashboard', intent: 'account'})}>{t('auth.login')}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/builders">{t('auth.exploreBuilders')}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.title')}</CardTitle>
          <CardDescription>{t('dashboard.subtitle')}</CardDescription>
        </CardHeader>
        {isAdmin ? (
          <CardContent className="pt-0">
            <Button asChild variant="outline">
              <Link href="/admin">{t('dashboard.goToAdmin')}</Link>
            </Button>
          </CardContent>
        ) : null}
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Section title={t('dashboard.prompts')} subtitle={t('dashboard.myPrompts')} items={prompts} />
        <Section title={t('dashboard.skillPacks')} subtitle={t('dashboard.myPacks')} items={packs} />
        <Section title={t('dashboard.agents')} subtitle={t('dashboard.myAgents')} items={agents} />
        <Section title={t('dashboard.favorites')} subtitle={t('dashboard.myFavorites')} items={favorites} />
      </div>
      <UserSuggestionsCard />
    </div>
  );
}
