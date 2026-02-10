'use client';

import {useEffect, useState} from 'react';
import {useTranslations} from 'next-intl';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Textarea} from '@/components/ui/textarea';
import {useAuth} from '@/features/common/auth-context';
import {featureFlags} from '@/lib/feature-flags';
import {getSupabaseBrowserClient} from '@/lib/supabase';

type PromptDetail = {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  structure: string;
  tags: string[];
  output_prompt: string;
  visibility: 'public' | 'private';
  status: 'active' | 'hidden';
  hidden_reason?: string | null;
};

export function PublicPromptPage({slug}: {slug: string}) {
  const t = useTranslations();
  const {user, isAdmin} = useAuth();
  const [item, setItem] = useState<PromptDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!featureFlags.gallery) {
      setLoading(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase
      .from('prompts')
      .select('id,owner_id,title,slug,structure,tags,output_prompt,visibility,status,hidden_reason')
      .eq('slug', slug)
      .single()
      .then(async ({data}) => {
        if (!data) {
          setItem(null);
          setLoading(false);
          return;
        }

        const canView =
          data.status === 'active' && data.visibility === 'public'
            ? true
            : user && (isAdmin || user.id === data.owner_id || data.visibility === 'private');

        if (!canView) {
          setItem(null);
          setLoading(false);
          return;
        }

        setItem(data as PromptDetail);
        setLoading(false);

        if (data.status === 'active' && data.visibility === 'public') {
          const {error: viewError} = await supabase.rpc('increment_prompt_views', {prompt_slug: slug});
          if (viewError) {
            console.warn(viewError.message);
          }
        }
      });
  }, [slug, user, isAdmin]);

  const reportPrompt = async () => {
    if (!item) return;
    const reason = prompt(t('gallery.reportReason')) || '';
    if (!reason.trim()) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    await supabase.from('reports').insert({
      reporter_id: user?.id ?? null,
      target_type: 'prompt',
      target_id: item.id,
      reason,
      status: 'open',
    });
    alert(t('gallery.reported'));
  };

  const duplicatePrompt = async () => {
    if (!user || !item) {
      alert(t('promptBuilder.loginRequired'));
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const {error} = await supabase.from('prompts').insert({
      owner_id: user.id,
      title: `${item.title} Copy`,
      slug: `${item.slug}-copy-${Math.random().toString(36).slice(2, 7)}`,
      language: 'auto',
      visibility: 'private',
      status: 'active',
      hidden_reason: null,
      structure: item.structure,
      tags: item.tags,
      builder_state: {},
      output_prompt: item.output_prompt,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert(t('gallery.duplicated'));
  };

  if (!featureFlags.gallery) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('gallery.disabledTitle')}</CardTitle>
          <CardDescription>{t('gallery.disabled')}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (loading) {
    return <p className="text-sm text-slate-600">{t('common.loading')}</p>;
  }

  if (!item) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('gallery.notFound')}</CardTitle>
          <CardDescription>{t('gallery.notFoundDesc')}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{item.title}</CardTitle>
        <CardDescription>
          {item.structure} · {item.tags.join(', ')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {item.status === 'hidden' && (
          <p className="rounded-xl bg-amber-100 p-2 text-sm text-amber-900">
            {t('gallery.hiddenByAdmin')}: {item.hidden_reason || t('gallery.noReason')}
          </p>
        )}
        <Textarea value={item.output_prompt} readOnly className="min-h-[420px]" />
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={duplicatePrompt} disabled={!user}>
            {t('gallery.duplicate')}
          </Button>
          <Button variant="destructive" onClick={reportPrompt}>
            {t('gallery.report')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
