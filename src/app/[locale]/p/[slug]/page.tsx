import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {getTranslations} from 'next-intl/server';
import {PromptDetailPage} from '@/features/gallery/prompt-detail-page';
import {getPublicPromptBySlug} from '@/lib/public-prompts';
import {buildMetadata} from '@/lib/seo';
import {isAppLocale, type AppLocale} from '@/i18n/routing';
import {siteName, toAbsoluteUrl} from '@/lib/site';

export async function generateMetadata({params}: {params: Promise<{locale: string; slug: string}>}): Promise<Metadata> {
  const {locale, slug} = await params;
  const nextLocale: AppLocale = isAppLocale(locale) ? locale : 'es';
  const prompt = await getPublicPromptBySlug(slug);

  if (!prompt) {
    return buildMetadata({
      locale: nextLocale,
      pathname: `/p/${slug}`,
      title: nextLocale === 'es' ? 'Prompt no disponible' : 'Prompt unavailable',
      description: nextLocale === 'es' ? 'Este prompt no existe o ya no es público.' : 'This prompt does not exist or is no longer public.',
      noIndex: true,
    });
  }

  return buildMetadata({
    locale: nextLocale,
    pathname: `/p/${slug}`,
    title: prompt.title,
    description: prompt.excerpt,
    imagePath: `/p/${slug}/opengraph-image`,
  });
}

export default async function LocalizedPromptPublicRoute({params}: {params: Promise<{locale: string; slug: string}>}) {
  const {locale, slug} = await params;
  const nextLocale: AppLocale = isAppLocale(locale) ? locale : 'es';
  const prompt = await getPublicPromptBySlug(slug);

  if (!prompt) notFound();

  const t = await getTranslations({locale: nextLocale});
  const canonical = toAbsoluteUrl(nextLocale, `/p/${slug}`);

  const creativeWork = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: prompt.title,
    description: prompt.excerpt,
    text: prompt.outputPrompt,
    url: canonical,
    inLanguage: prompt.language === 'auto' ? nextLocale : prompt.language,
    datePublished: prompt.createdAt,
    dateModified: prompt.updatedAt ?? prompt.createdAt,
    keywords: prompt.tags,
    isAccessibleForFree: true,
    author: {
      '@type': 'Person',
      name: prompt.authorName || t('gallery.anonymous'),
    },
    publisher: {
      '@type': 'Organization',
      name: siteName,
    },
    interactionStatistic: [
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/ViewAction',
        userInteractionCount: prompt.viewsCount,
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/LikeAction',
        userInteractionCount: prompt.favoritesCount,
      },
    ],
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: t('nav.home'),
        item: toAbsoluteUrl(nextLocale, '/'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: t('gallery.title'),
        item: toAbsoluteUrl(nextLocale, '/prompts'),
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: prompt.title,
        item: canonical,
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(creativeWork)}} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(breadcrumb)}} />
      <PromptDetailPage prompt={prompt} locale={nextLocale} />
    </>
  );
}
