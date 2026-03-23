import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {getLocale, getTranslations} from 'next-intl/server';
import {PromptDetailPage} from '@/features/gallery/prompt-detail-page';
import type {AppLocale} from '@/i18n/routing';
import {getPublicPromptBySlug} from '@/lib/public-prompts';
import {buildMetadata} from '@/lib/seo';
import {siteName, toAbsoluteUrl} from '@/lib/site';

export async function generateMetadata({params}: {params: Promise<{slug: string}>}): Promise<Metadata> {
  const locale = (await getLocale()) as AppLocale;
  const {slug} = await params;
  const prompt = await getPublicPromptBySlug(slug);

  if (!prompt) {
    return buildMetadata({
      locale,
      pathname: `/p/${slug}`,
      title: locale === 'es' ? 'Prompt no disponible' : 'Prompt unavailable',
      description: locale === 'es' ? 'Este prompt no existe o ya no es público.' : 'This prompt does not exist or is no longer public.',
      noIndex: true,
    });
  }

  return buildMetadata({
    locale,
    pathname: `/p/${slug}`,
    title: prompt.title,
    description: prompt.excerpt,
    imagePath: `/p/${slug}/opengraph-image`,
  });
}

export default async function PromptPublicRoute({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params;
  const prompt = await getPublicPromptBySlug(slug);
  if (!prompt) notFound();

  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations();
  const canonical = toAbsoluteUrl(locale, `/p/${slug}`);

  const creativeWork = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: prompt.title,
    description: prompt.excerpt,
    text: prompt.outputPrompt,
    url: canonical,
    inLanguage: prompt.language === 'auto' ? locale : prompt.language,
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
        item: toAbsoluteUrl(locale, '/'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: t('gallery.title'),
        item: toAbsoluteUrl(locale, '/prompts'),
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
      <PromptDetailPage prompt={prompt} />
    </>
  );
}
