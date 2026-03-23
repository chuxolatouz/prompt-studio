'use client';

import {useEffect, useState} from 'react';
import {Heart} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {Button} from '@/components/ui/button';
import {toast} from '@/components/ui/toast';
import {AuthGateModal} from '@/features/common/auth-gate-modal';
import {useAuth} from '@/features/common/auth-context';
import {getSupabaseBrowserClient} from '@/lib/supabase';

type PromptFavoriteButtonProps = {
  promptId: string;
  initialCount: number;
  returnTo: string;
  variant?: 'default' | 'outline' | 'secondary';
  compact?: boolean;
};

export function PromptFavoriteButton({
  promptId,
  initialCount,
  returnTo,
  variant = 'outline',
  compact = false,
}: PromptFavoriteButtonProps) {
  const t = useTranslations();
  const {user} = useAuth();
  const [count, setCount] = useState(initialCount);
  const [isFavorite, setIsFavorite] = useState(false);
  const [authGateOpen, setAuthGateOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsFavorite(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    supabase
      .from('favorites')
      .select('prompt_id')
      .eq('prompt_id', promptId)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({data}) => setIsFavorite(Boolean(data)));
  }, [promptId, user]);

  const toggleFavorite = async () => {
    if (!user) {
      setAuthGateOpen(true);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    if (isFavorite) {
      const {error} = await supabase.from('favorites').delete().eq('user_id', user.id).eq('prompt_id', promptId);
      if (error) {
        toast.error(t('common.genericError'));
        return;
      }

      setIsFavorite(false);
      setCount((previous) => Math.max(0, previous - 1));
      toast.success(t('gallery.favoriteRemoved'));
      return;
    }

    const {error} = await supabase.from('favorites').insert({user_id: user.id, prompt_id: promptId});
    if (error) {
      toast.error(t('common.genericError'));
      return;
    }

    setIsFavorite(true);
    setCount((previous) => previous + 1);
    toast.success(t('gallery.favoriteAdded'));
  };

  const buttonVariant = isFavorite ? 'secondary' : variant;
  const label = compact ? count.toString() : `${isFavorite ? t('gallery.favoriteRemove') : t('gallery.favoriteSave')} (${count})`;

  return (
    <>
      <AuthGateModal open={authGateOpen} onOpenChange={setAuthGateOpen} returnTo={returnTo} action="favorite" intent="favorite" />

      <Button variant={buttonVariant} onClick={toggleFavorite} title={!user ? t('gallery.loginToFavorite') : undefined}>
        <Heart className={`mr-2 h-4 w-4 ${isFavorite ? 'fill-white' : ''}`} />
        {label}
      </Button>
    </>
  );
}
