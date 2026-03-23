import {getPublicPrompts} from '@/lib/public-prompts';
import {isAppLocale, type AppLocale} from '@/i18n/routing';
import {toAbsoluteUrl} from '@/lib/site';

export async function GET(_: Request, {params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  const nextLocale: AppLocale = isAppLocale(locale) ? locale : 'es';
  const prompts = await getPublicPrompts();

  return Response.json({
    version: 'https://jsonfeed.org/version/1.1',
    title: 'prompteero public prompts',
    home_page_url: toAbsoluteUrl(nextLocale, '/prompts'),
    feed_url: toAbsoluteUrl(nextLocale, '/prompts/feed'),
    description: 'Public prompts ready to save, browse and reuse.',
    items: prompts.map((prompt) => ({
      id: prompt.id,
      url: toAbsoluteUrl(nextLocale, `/p/${prompt.slug}`),
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
