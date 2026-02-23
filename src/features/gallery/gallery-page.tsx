'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {Heart, SlidersHorizontal, Sparkles} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {AuthGateModal} from '@/features/common/auth-gate-modal';
import {useAuth} from '@/features/common/auth-context';
import {featureFlags} from '@/lib/feature-flags';
import {getSupabaseBrowserClient} from '@/lib/supabase';
import {toast} from 'sonner';

type PromptRow = {
  id: string;
  title: string;
  slug: string;
  tags: string[];
  structure: string;
  created_at: string;
  views_count: number;
  favorites_count?: number;
  owner_id: string;
  builder_state?: {
    macro?: string;
  } | null;
  users_profile?: Array<{display_name: string | null}>;
};

type SortMode = 'recent' | 'views' | 'favorites';

export function GalleryPage() {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {user} = useAuth();

  const [items, setItems] = useState<PromptRow[]>([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('recent');
  const [macroFilter, setMacroFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [favoriteCounts, setFavoriteCounts] = useState<Record<string, number>>({});
  const [myFavorites, setMyFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [pendingFavoriteId, setPendingFavoriteId] = useState<string | null>(null);

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

    const loadGallery = async () => {
      const {data: promptRows} = await supabase
        .from('prompts')
        .select('*,users_profile(display_name)')
        .eq('visibility', 'public')
        .eq('status', 'active');

      if (!mounted) return;
      const nextItems = ((promptRows as unknown) as PromptRow[]) ?? [];
      setItems(nextItems);
      setFavoriteCounts(
        nextItems.reduce<Record<string, number>>((acc, item) => {
          acc[item.id] = item.favorites_count ?? 0;
          return acc;
        }, {})
      );

      setLoading(false);
    };

    void loadGallery();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!user || !featureFlags.gallery) {
      setMyFavorites(new Set());
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    supabase
      .from('favorites')
      .select('prompt_id')
      .eq('user_id', user.id)
      .then(({data}) => {
        const next = new Set((data ?? []).map((row) => String((row as {prompt_id: string}).prompt_id)));
        setMyFavorites(next);
      });
  }, [user]);

  const macroOptions = useMemo(() => {
    const unique = new Set<string>();
    items.forEach((item) => unique.add(item.builder_state?.macro || item.structure));
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const tagOptions = useMemo(() => {
    const unique = new Set<string>();
    items.forEach((item) => item.tags?.forEach((tag) => unique.add(tag)));
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filtered = useMemo(() => {
    const byQuery = items.filter((item) => {
      const macro = item.builder_state?.macro || item.structure;
      const haystack = `${item.title} ${item.tags.join(' ')} ${item.structure} ${macro}`.toLowerCase();
      const queryMatch = haystack.includes(query.toLowerCase());
      const macroMatch = macroFilter === 'all' || macro === macroFilter;
      const tagMatch = tagFilter === 'all' || item.tags?.includes(tagFilter);
      return queryMatch && macroMatch && tagMatch;
    });

    return byQuery.sort((a, b) => {
      if (sort === 'views') return b.views_count - a.views_count;
      if (sort === 'favorites') return (favoriteCounts[b.id] || 0) - (favoriteCounts[a.id] || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [items, query, sort, macroFilter, tagFilter, favoriteCounts]);

  const toggleFavorite = async (promptId: string) => {
    if (!user) {
      setPendingFavoriteId(promptId);
      setAuthGateOpen(true);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const isFav = myFavorites.has(promptId);

    if (isFav) {
      const {error} = await supabase.from('favorites').delete().eq('user_id', user.id).eq('prompt_id', promptId);
      if (error) {
        toast.error(t('common.genericError'));
        return;
      }

      setMyFavorites((prev) => {
        const next = new Set(prev);
        next.delete(promptId);
        return next;
      });
      setFavoriteCounts((prev) => ({...prev, [promptId]: Math.max(0, (prev[promptId] || 0) - 1)}));
      toast.success(t('gallery.favoriteRemoved'));
      return;
    }

    const {error} = await supabase.from('favorites').insert({user_id: user.id, prompt_id: promptId});
    if (error) {
      toast.error(t('common.genericError'));
      return;
    }

    setMyFavorites((prev) => {
      const next = new Set(prev);
      next.add(promptId);
      return next;
    });
    setFavoriteCounts((prev) => ({...prev, [promptId]: (prev[promptId] || 0) + 1}));
    toast.success(t('gallery.favoriteAdded'));
  };

  useEffect(() => {
    const action = searchParams.get('action');
    const promptId = searchParams.get('promptId');
    if (action !== 'favorite' || !promptId || !user) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    if (myFavorites.has(promptId)) {
      router.replace(pathname);
      return;
    }

    const applyAutoFavorite = async () => {
      const {error} = await supabase.from('favorites').insert({user_id: user.id, prompt_id: promptId});
      if (error) {
        toast.error(t('common.genericError'));
        router.replace(pathname);
        return;
      }

      setMyFavorites((prev) => {
        const next = new Set(prev);
        next.add(promptId);
        return next;
      });
      setFavoriteCounts((prev) => ({...prev, [promptId]: (prev[promptId] || 0) + 1}));
      toast.success(t('gallery.favoriteAdded'));
      router.replace(pathname);
    };

    void applyAutoFavorite();
  }, [searchParams, user, myFavorites, pathname, router, t]);

  if (!featureFlags.gallery) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('gallery.title')}</CardTitle>
          <CardDescription>{t('gallery.disabled')}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <AuthGateModal
        open={authGateOpen}
        onOpenChange={setAuthGateOpen}
        returnTo={pendingFavoriteId ? `/gallery?action=favorite&promptId=${pendingFavoriteId}` : '/gallery'}
        action="favorite"
      />

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{t('gallery.title')}</CardTitle>
            <CardDescription>{t('gallery.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('gallery.search')} />

            <Select value={sort} onValueChange={(value: SortMode) => setSort(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">{t('gallery.sortRecent')}</SelectItem>
                <SelectItem value="views">{t('gallery.sortViews')}</SelectItem>
                <SelectItem value="favorites">{t('gallery.sortTopFavorites')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={macroFilter} onValueChange={setMacroFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('gallery.filtersMacro')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('gallery.allMacros')}</SelectItem>
                {macroOptions.map((macro) => (
                  <SelectItem key={macro} value={macro}>
                    {macro}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('gallery.filtersTag')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('gallery.allTags')}</SelectItem>
                {tagOptions.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <Card>
              <CardContent className="pt-4 text-sm text-slate-600">{t('common.loading')}</CardContent>
            </Card>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="space-y-3 pt-4 text-sm text-slate-600">
                <p className="text-base font-semibold text-slate-900">{t('gallery.emptyTitle')}</p>
                <p>{t('gallery.empty')}</p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <Link href="/prompt-builder">{t('gallery.emptyCta')}</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/structures">{t('gallery.secondaryEmptyCta')}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            filtered.map((item) => {
              const macro = item.builder_state?.macro || item.structure;
              const favCount = favoriteCounts[item.id] || 0;
              const isFavorite = myFavorites.has(item.id);

              return (
                <Card key={item.id} className="h-full hover:border-blue-300 hover:bg-blue-50/40">
                  <CardHeader>
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <CardDescription>
                      {t('gallery.publishedBy', {name: item.users_profile?.[0]?.display_name || t('gallery.anonymous')})}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge>{t('gallery.macroBadge', {macro})}</Badge>
                      {item.tags?.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                      <span className="inline-flex items-center gap-1">
                        <Heart className={`h-3.5 w-3.5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-500'}`} />
                        {favCount}
                      </span>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button
                        variant={isFavorite ? 'secondary' : 'outline'}
                        onClick={() => void toggleFavorite(item.id)}
                        title={!user ? t('gallery.loginToFavorite') : undefined}
                      >
                        <Heart className={`mr-2 h-4 w-4 ${isFavorite ? 'fill-white' : ''}`} />
                        {isFavorite ? t('gallery.favoriteRemove') : t('gallery.favoriteSave')}
                      </Button>
                      <Button asChild>
                        <Link href={`/p/${item.slug}`}>{t('gallery.viewDetail')}</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <Card>
          <CardContent className="flex items-center gap-2 pt-4 text-xs text-slate-500">
            <SlidersHorizontal className="h-4 w-4" />
            <span>{t('gallery.filtersMacro')}</span>
            <Sparkles className="h-4 w-4" />
            <span>{t('gallery.filtersTag')}</span>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
