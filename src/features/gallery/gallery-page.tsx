'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {useTranslations} from 'next-intl';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {featureFlags} from '@/lib/feature-flags';
import {getSupabaseBrowserClient} from '@/lib/supabase';

type PromptRow = {
  id: string;
  title: string;
  slug: string;
  tags: string[];
  structure: string;
  created_at: string;
  views_count: number;
  owner_id: string;
  users_profile?: Array<{display_name: string | null}>;
};

export function GalleryPage() {
  const t = useTranslations();
  const [items, setItems] = useState<PromptRow[]>([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'recent' | 'views'>('recent');

  useEffect(() => {
    if (!featureFlags.gallery) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    supabase
      .from('prompts')
      .select('id,title,slug,tags,structure,created_at,views_count,owner_id,users_profile(display_name)')
      .eq('visibility', 'public')
      .eq('status', 'active')
      .then(({data}) => setItems(((data as unknown) as PromptRow[]) ?? []));
  }, []);

  const filtered = useMemo(() => {
    const byQuery = items.filter((item) => {
      const haystack = `${item.title} ${item.tags.join(' ')} ${item.structure}`.toLowerCase();
      return haystack.includes(query.toLowerCase());
    });

    return byQuery.sort((a, b) => {
      if (sort === 'views') return b.views_count - a.views_count;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [items, query, sort]);

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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('gallery.title')}</CardTitle>
          <CardDescription>{t('gallery.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('gallery.search')} />
          <Select value={sort} onValueChange={(value: 'recent' | 'views') => setSort(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">{t('gallery.sortRecent')}</SelectItem>
              <SelectItem value="views">{t('gallery.sortViews')}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="space-y-3 pt-4 text-sm text-slate-600">
              <p>{t('gallery.empty')}</p>
              <Button asChild>
                <Link href="/prompt-builder">{t('gallery.emptyCta')}</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          filtered.map((item) => (
            <Link key={item.id} href={`/p/${item.slug}`}>
              <Card className="h-full hover:border-blue-300 hover:bg-blue-50/40">
                <CardHeader>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <CardDescription>{item.users_profile?.[0]?.display_name || t('gallery.anonymous')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge>{item.structure}</Badge>
                    {item.tags?.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">
                    {new Date(item.created_at).toLocaleDateString()} · {item.views_count} views
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
