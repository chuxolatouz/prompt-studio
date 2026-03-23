import {headers} from 'next/headers';
import {getPublicPrompts} from '@/lib/public-prompts';
import {isAppLocale, routing, type AppLocale} from '@/i18n/routing';
import {toAbsoluteUrl} from '@/lib/site';

async function getFeedLocale(): Promise<AppLocale> {
  const headerLocale = (await headers()).get('x-prompteero-locale');
  return isAppLocale(headerLocale) ? headerLocale : routing.defaultLocale;
}

export async function GET() {
  const locale = await getFeedLocale();
  const prompts = await getPublicPrompts();

  return Response.json({
    version: 'https://jsonfeed.org/version/1.1',
    title: 'prompteero public prompts',
    home_page_url: toAbsoluteUrl(locale, '/prompts'),
    feed_url: toAbsoluteUrl(locale, '/prompts/feed'),
    description: 'Public prompts ready to save, browse and reuse.',
    items: prompts.map((prompt) => ({
      id: prompt.id,
      url: toAbsoluteUrl(locale, `/p/${prompt.slug}`),
      title: prompt.title,
      content_text: prompt.outputPrompt,
      summary: prompt.excerpt,
      date_published: prompt.createdAt,
      date_modified: prompt.updatedAt ?? prompt.createdAt,
      tags: prompt.tags,
      language: prompt.language,
      author: prompt.authorName ? {name: prompt.authorName} : undefined,
    })),
  });
}
