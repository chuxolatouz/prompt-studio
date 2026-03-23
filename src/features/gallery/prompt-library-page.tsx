import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {EmptyState} from '@/components/builder/EmptyState';
import {Link} from '@/i18n/navigation';
import type {AppLocale} from '@/i18n/routing';
import {PromptFavoriteButton} from '@/features/gallery/prompt-favorite-button';
import {type PromptSortMode, searchPublicPrompts} from '@/lib/public-prompts';
import {toJsonLd} from '@/lib/seo';
import {localizePath, siteName, toAbsoluteUrl} from '@/lib/site';
import {getTranslations} from 'next-intl/server';
import {Heart, Search, SlidersHorizontal} from 'lucide-react';

type PromptLibraryPageProps = {
  locale: AppLocale;
  title: string;
  description: string;
  searchParams?: Record<string, string | string[] | undefined>;
  fixedTag?: string;
  fixedMacro?: string;
};

function firstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeSort(value?: string): PromptSortMode {
  if (value === 'views' || value === 'favorites') return value;
  return 'recent';
}

function normalizePage(value?: string) {
  const parsed = Number.parseInt(value ?? '1', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function buildListHref(
  pathname: string,
  {
    q,
    sort,
    macro,
    tag,
    page,
  }: {
    q?: string;
    sort?: string;
    macro?: string;
    tag?: string;
    page?: number;
  }
) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (sort && sort !== 'recent') params.set('sort', sort);
  if (macro && macro !== 'all') params.set('macro', macro);
  if (tag && tag !== 'all') params.set('tag', tag);
  if (page && page > 1) params.set('page', String(page));
  const query = params.toString();

  return query ? `${pathname}?${query}` : pathname;
}

export async function PromptLibraryPage({locale, title, description, searchParams = {}, fixedTag, fixedMacro}: PromptLibraryPageProps) {
  const t = await getTranslations();
  const q = firstValue(searchParams.q)?.trim() ?? '';
  const sort = normalizeSort(firstValue(searchParams.sort));
  const page = normalizePage(firstValue(searchParams.page));
  const selectedMacro = fixedMacro ?? firstValue(searchParams.macro) ?? 'all';
  const selectedTag = fixedTag ?? firstValue(searchParams.tag) ?? 'all';

  const result = await searchPublicPrompts({
    q,
    sort,
    page,
    macro: selectedMacro === 'all' ? undefined : selectedMacro,
    tag: selectedTag === 'all' ? undefined : selectedTag,
  });

  const basePath = fixedTag
    ? `/prompts/tag/${encodeURIComponent(fixedTag)}`
    : fixedMacro
      ? `/prompts/macro/${encodeURIComponent(fixedMacro)}`
      : '/prompts';
  const currentHref = buildListHref(basePath, {
    q,
    sort,
    macro: selectedMacro,
    tag: selectedTag,
    page: result.page,
  });
  const resetHref = fixedTag || fixedMacro ? basePath : '/prompts';
  const localizedAction = localizePath(locale, basePath);
  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url: toAbsoluteUrl(locale, currentHref),
    isPartOf: {
      '@type': 'WebSite',
      name: siteName,
      url: toAbsoluteUrl(locale, '/'),
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: result.items.length,
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: result.items.map((item, index) => ({
        '@type': 'ListItem',
        position: (result.page - 1) * result.pageSize + index + 1,
        url: toAbsoluteUrl(locale, `/p/${item.slug}`),
        name: item.title,
        description: item.excerpt,
      })),
    },
  };

  return (
    <div className="space-y-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={toJsonLd(collectionJsonLd)} />

      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('gallery.title')}</CardTitle>
          <CardDescription>{t('gallery.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={localizedAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className="xl:col-span-2">
              <span className="sr-only">{t('gallery.search')}</span>
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder={t('gallery.search')}
                className="flex h-10 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              />
            </label>

            <label>
              <span className="sr-only">{t('gallery.sortRecent')}</span>
              <select
                name="sort"
                defaultValue={sort}
                className="flex h-10 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <option value="recent">{t('gallery.sortRecent')}</option>
                <option value="views">{t('gallery.sortViews')}</option>
                <option value="favorites">{t('gallery.sortTopFavorites')}</option>
              </select>
            </label>

            {fixedMacro ? (
              <input type="hidden" name="macro" value={fixedMacro} />
            ) : (
              <label>
                <span className="sr-only">{t('gallery.filtersMacro')}</span>
                <select
                  name="macro"
                  defaultValue={selectedMacro}
                  className="flex h-10 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <option value="all">{t('gallery.allMacros')}</option>
                  {result.macros.map((macro) => (
                    <option key={macro} value={macro}>
                      {macro}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {fixedTag ? (
              <input type="hidden" name="tag" value={fixedTag} />
            ) : (
              <label>
                <span className="sr-only">{t('gallery.filtersTag')}</span>
                <select
                  name="tag"
                  defaultValue={selectedTag}
                  className="flex h-10 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <option value="all">{t('gallery.allTags')}</option>
                  {result.tags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="flex gap-2 xl:col-span-5">
              <Button type="submit">
                <Search className="mr-2 h-4 w-4" />
                {t('common.search')}
              </Button>
              <Button asChild variant="outline">
                <Link href={resetHref}>{t('actions.cancel')}</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {result.items.length === 0 ? (
        <EmptyState
          iconName="search"
          title={t('gallery.emptyTitle')}
          description={t('gallery.empty')}
          primaryCTA={{label: t('gallery.emptyCta'), href: '/prompt-builder'}}
          secondaryCTA={{label: t('gallery.secondaryEmptyCta'), href: '/structures'}}
        />
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {result.items.map((item) => (
              <Card key={item.id} className="h-full hover:border-blue-300 hover:bg-blue-50/40">
                <CardHeader>
                  <CardTitle className="text-base">
                    <Link href={`/p/${item.slug}`} className="hover:text-blue-700">
                      {item.title}
                    </Link>
                  </CardTitle>
                  <CardDescription>
                    {t('gallery.publishedBy', {name: item.authorName || t('gallery.anonymous')})}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/prompts/macro/${encodeURIComponent(item.macro)}`}>
                      <Badge>{t('gallery.macroBadge', {macro: item.macro})}</Badge>
                    </Link>
                    {item.tags.slice(0, 3).map((tag) => (
                      <Link key={tag} href={`/prompts/tag/${encodeURIComponent(tag)}`}>
                        <Badge variant="secondary">{tag}</Badge>
                      </Link>
                    ))}
                  </div>

                  <p className="text-sm leading-relaxed text-slate-700">{item.excerpt}</p>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{new Date(item.createdAt).toLocaleDateString(locale)}</span>
                    <span>
                      {item.viewsCount} {t('gallery.viewsLabel')}
                    </span>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <PromptFavoriteButton promptId={item.id} initialCount={item.favoritesCount} returnTo={currentHref} />
                    <Button asChild>
                      <Link href={`/p/${item.slug}`}>{t('gallery.viewDetail')}</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1">
                  <SlidersHorizontal className="h-4 w-4" />
                  {result.total} {t('gallery.title').toLowerCase()}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Heart className="h-4 w-4" />
                  {t('gallery.favorite')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {result.page > 1 ? (
                  <Button asChild variant="outline">
                    <Link
                      href={buildListHref(basePath, {
                        q,
                        sort,
                        macro: selectedMacro,
                        tag: selectedTag,
                        page: result.page - 1,
                      })}
                    >
                      {t('gallery.prev')}
                    </Link>
                  </Button>
                ) : null}
                {result.page < result.totalPages ? (
                  <Button asChild variant="outline">
                    <Link
                      href={buildListHref(basePath, {
                        q,
                        sort,
                        macro: selectedMacro,
                        tag: selectedTag,
                        page: result.page + 1,
                      })}
                    >
                      {t('gallery.next')}
                    </Link>
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
