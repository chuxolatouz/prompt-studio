'use client';

import {useEffect, useState} from 'react';
import {useTranslations} from 'next-intl';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {useAuth} from '@/features/common/auth-context';
import {readLocal, storageKeys} from '@/lib/storage';
import {featureFlags} from '@/lib/feature-flags';
import {getSupabaseBrowserClient} from '@/lib/supabase';

type Item = {id: string; title: string; created_at?: string; visibility?: string};

export default function DashboardPage() {
  const t = useTranslations();
  const {user} = useAuth();
  const [prompts, setPrompts] = useState<Item[]>([]);
  const [packs, setPacks] = useState<Item[]>([]);
  const [agents, setAgents] = useState<Item[]>([]);
  const [favorites, setFavorites] = useState<Item[]>([]);

  useEffect(() => {
    const localPromptDraft = readLocal<{state?: {title?: string}} | null>(storageKeys.promptDrafts, null);
    const localPack = readLocal<any>(storageKeys.skillPacks, null);
    const localAgent = readLocal<any>(storageKeys.agents, null);

    setPrompts(localPromptDraft?.state ? [{id: 'local-p-0', title: localPromptDraft.state.title || t('dashboard.untitled')}] : []);
    setPacks(localPack ? [{id: localPack.id, title: localPack.title}] : []);
    setAgents(localAgent ? [{id: localAgent.id, title: localAgent.title}] : []);
    setFavorites([]);

    if (!featureFlags.supabase || !user) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    supabase.from('prompts').select('id,title,created_at,visibility').eq('owner_id', user.id).then(({data}) => {
      if (data) setPrompts((prev) => [...prev, ...(data as Item[])]);
    });

    supabase.from('skill_packs').select('id,title,created_at,visibility').eq('owner_id', user.id).then(({data}) => {
      if (data) setPacks((prev) => [...prev, ...(data as Item[])]);
    });

    supabase.from('agents').select('id,title,created_at,visibility').eq('owner_id', user.id).then(({data}) => {
      if (data) setAgents((prev) => [...prev, ...(data as Item[])]);
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
  }, [t, user]);

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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.title')}</CardTitle>
          <CardDescription>{t('dashboard.subtitle')}</CardDescription>
        </CardHeader>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Section title={t('dashboard.prompts')} subtitle={t('dashboard.myPrompts')} items={prompts} />
        <Section title={t('dashboard.skillPacks')} subtitle={t('dashboard.myPacks')} items={packs} />
        <Section title={t('dashboard.agents')} subtitle={t('dashboard.myAgents')} items={agents} />
        <Section title={t('dashboard.favorites')} subtitle={t('dashboard.myFavorites')} items={favorites} />
      </div>
    </div>
  );
}
