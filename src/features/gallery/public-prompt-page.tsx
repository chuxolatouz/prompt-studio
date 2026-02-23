'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import {Copy, Heart, GitFork, Flag} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Textarea} from '@/components/ui/textarea';
import {AuthGateModal} from '@/features/common/auth-gate-modal';
import {useAuth} from '@/features/common/auth-context';
import {featureFlags} from '@/lib/feature-flags';
import {promptBuilderStateSchema} from '@/lib/schemas';
import {getSupabaseBrowserClient} from '@/lib/supabase';
import {storageKeys, writeLocal} from '@/lib/storage';
import {toast} from 'sonner';

type PromptDetail = {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  structure: string;
  tags: string[];
  output_prompt: string;
  favorites_count?: number;
  builder_state?: unknown;
  visibility: 'public' | 'private';
  status: 'active' | 'hidden';
  hidden_reason?: string | null;
  users_profile?: Array<{display_name: string | null}>;
};

export function PublicPromptPage({slug}: {slug: string}) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {user, isAdmin} = useAuth();
  const [item, setItem] = useState<PromptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [autoFavoriteDone, setAutoFavoriteDone] = useState(false);

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

    let mounted = true;

    const load = async () => {
      const {data} = await supabase
        .from('prompts')
        .select('*,users_profile(display_name)')
        .eq('slug', slug)
        .single();

      if (!mounted) return;

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
      setFavoriteCount((data as PromptDetail).favorites_count ?? 0);
      setLoading(false);

      if (data.status === 'active' && data.visibility === 'public') {
        await supabase.rpc('increment_prompt_views', {prompt_slug: slug});
      }

      if (user) {
        const {data: mine} = await supabase.from('favorites').select('prompt_id').eq('prompt_id', data.id).eq('user_id', user.id).maybeSingle();
        setIsFavorite(Boolean(mine));
      }
    };

    void load();

    return () => {
      mounted = false;
    };
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
    toast.success(t('gallery.reported'));
  };

  const copyPrompt = async () => {
    if (!item) return;
    await navigator.clipboard.writeText(item.output_prompt);
    toast.success(t('actions.copied'));
  };

  const forkPrompt = async () => {
    if (!item) return;

    const parsedBuilder = promptBuilderStateSchema.safeParse(item.builder_state);
    const fallbackBuilder = {
      version: 2,
      title: `${item.title} ${t('gallery.fork')}`,
      role: '',
      structure: item.structure,
      niche: 'all',
      antiHallucination: true,
      tags: item.tags || [],
      columns: [
        {id: 'role', title: t('promptBuilder.columns.role'), items: []},
        {id: 'goal', title: t('promptBuilder.columns.goal'), items: []},
        {id: 'context', title: t('promptBuilder.columns.context'), items: []},
        {id: 'inputs', title: t('promptBuilder.columns.inputs'), items: []},
        {id: 'constraints', title: t('promptBuilder.columns.constraints'), items: []},
        {id: 'output-format', title: t('promptBuilder.columns.output-format'), items: []},
        {id: 'examples', title: t('promptBuilder.columns.examples'), items: []},
      ],
      segmentOrder: ['role', 'goal', 'context', 'inputs', 'constraints', 'output-format', 'examples'],
      macro: item.structure,
      onboardingCompleted: true,
      preferredMode: 'pro' as const,
    };

    if (!user) {
      writeLocal(storageKeys.promptDrafts, {
        state: parsedBuilder.success ? parsedBuilder.data : fallbackBuilder,
        updatedAt: new Date().toISOString(),
      });
      toast.success(t('gallery.forked'));
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const {error} = await supabase.from('prompts').insert({
      owner_id: user.id,
      title: `${item.title} ${t('gallery.fork')}`,
      slug: `${item.slug}-fork-${Math.random().toString(36).slice(2, 7)}`,
      language: 'auto',
      visibility: 'private',
      status: 'active',
      hidden_reason: null,
      structure: item.structure,
      tags: item.tags,
      builder_state: parsedBuilder.success ? parsedBuilder.data : fallbackBuilder,
      output_prompt: item.output_prompt,
    });

    if (error) {
      toast.error(t('common.genericError'));
      return;
    }

    toast.success(t('gallery.forked'));
  };

  const toggleFavorite = useCallback(async () => {
    if (!item) return;
    if (!user) {
      setAuthGateOpen(true);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    if (isFavorite) {
      const {error} = await supabase.from('favorites').delete().eq('user_id', user.id).eq('prompt_id', item.id);
      if (error) {
        toast.error(t('common.genericError'));
        return;
      }
      setIsFavorite(false);
      setFavoriteCount((prev) => Math.max(0, prev - 1));
      toast.success(t('gallery.favoriteRemoved'));
      return;
    }

    const {error} = await supabase.from('favorites').insert({user_id: user.id, prompt_id: item.id});
    if (error) {
      toast.error(t('common.genericError'));
      return;
    }

    setIsFavorite(true);
    setFavoriteCount((prev) => prev + 1);
    toast.success(t('gallery.favoriteAdded'));
  }, [item, user, t, isFavorite]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action !== 'favorite' || !user || !item || autoFavoriteDone) return;

    setAutoFavoriteDone(true);
    void toggleFavorite().finally(() => router.replace(pathname));
  }, [searchParams, user, item, autoFavoriteDone, pathname, router, toggleFavorite]);

  const subtitle = useMemo(() => {
    if (!item) return '';
    const author = item.users_profile?.[0]?.display_name || t('gallery.anonymous');
    return `${item.structure} · ${item.tags.join(', ')} · ${t('gallery.publishedBy', {name: author})}`;
  }, [item, t]);

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
    <>
      <AuthGateModal open={authGateOpen} onOpenChange={setAuthGateOpen} returnTo={`/p/${slug}`} action="favorite" />

      <Card>
        <CardHeader>
          <CardTitle>{item.title}</CardTitle>
          <CardDescription>{subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {item.status === 'hidden' && (
            <p className="rounded-xl bg-amber-100 p-2 text-sm text-amber-900">
              {t('gallery.hiddenByAdmin')}: {item.hidden_reason || t('gallery.noReason')}
            </p>
          )}

          <Textarea value={item.output_prompt} readOnly className="min-h-[420px]" />

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" onClick={copyPrompt}>
              <Copy className="mr-2 h-4 w-4" />
              {t('gallery.copyPrompt')}
            </Button>

            <Button variant="outline" onClick={forkPrompt}>
              <GitFork className="mr-2 h-4 w-4" />
              {t('gallery.fork')}
            </Button>

            <Button
              variant={isFavorite ? 'secondary' : 'default'}
              onClick={toggleFavorite}
              title={!user ? t('gallery.loginToFavorite') : undefined}
            >
              <Heart className={`mr-2 h-4 w-4 ${isFavorite ? 'fill-white' : ''}`} />
              {(isFavorite ? t('gallery.favoriteRemove') : t('gallery.favoriteSave'))} ({favoriteCount})
            </Button>

            <Button variant="destructive" onClick={reportPrompt}>
              <Flag className="mr-2 h-4 w-4" />
              {t('gallery.report')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
