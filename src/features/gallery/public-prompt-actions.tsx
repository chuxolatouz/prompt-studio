'use client';

import {Copy, Flag, GitFork} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {Button} from '@/components/ui/button';
import {toast} from '@/components/ui/toast';
import {useAuth} from '@/features/common/auth-context';
import {PromptFavoriteButton} from '@/features/gallery/prompt-favorite-button';
import {promptBuilderStateSchema} from '@/lib/schemas';
import {storageKeys, writeLocal} from '@/lib/storage';
import {getSupabaseBrowserClient} from '@/lib/supabase';

type PublicPromptActionsProps = {
  item: {
    id: string;
    slug: string;
    title: string;
    structure: string;
    tags: string[];
    outputPrompt: string;
    favoritesCount: number;
    builderState?: unknown;
  };
  returnTo: string;
};

export function PublicPromptActions({item, returnTo}: PublicPromptActionsProps) {
  const t = useTranslations();
  const {user} = useAuth();

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(item.outputPrompt);
    toast.success(t('actions.copied'));
  };

  const forkPrompt = async () => {
    const parsedBuilder = promptBuilderStateSchema.safeParse(item.builderState);
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
      output_prompt: item.outputPrompt,
    });

    if (error) {
      toast.error(t('common.genericError'));
      return;
    }

    toast.success(t('gallery.forked'));
  };

  const reportPrompt = async () => {
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

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <Button variant="outline" onClick={copyPrompt}>
        <Copy className="mr-2 h-4 w-4" />
        {t('gallery.copyPrompt')}
      </Button>

      <Button variant="outline" onClick={forkPrompt}>
        <GitFork className="mr-2 h-4 w-4" />
        {t('gallery.fork')}
      </Button>

      <PromptFavoriteButton promptId={item.id} initialCount={item.favoritesCount} returnTo={returnTo} variant="default" />

      <Button variant="destructive" onClick={reportPrompt}>
        <Flag className="mr-2 h-4 w-4" />
        {t('gallery.report')}
      </Button>
    </div>
  );
}
