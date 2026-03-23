import type {Metadata} from 'next';
import {PromptLibraryPage} from '@/features/gallery/prompt-library-page';
import {isAppLocale, type AppLocale} from '@/i18n/routing';
import {buildMetadata} from '@/lib/seo';
import {seoCopy} from '@/lib/site';

function firstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{locale: string}>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const {locale} = await params;
  const nextLocale: AppLocale = isAppLocale(locale) ? locale : 'es';
  const query = firstValue((await searchParams).q)?.trim();

  return buildMetadata({
    locale: nextLocale,
    pathname: '/prompts',
    title: seoCopy[nextLocale].promptsTitle,
    description: seoCopy[nextLocale].promptsDescription,
    noIndex: Boolean(query),
    imagePath: '/prompts/opengraph-image',
  });
}

export default async function LocalizedPromptsPage({
  params,
  searchParams,
}: {
  params: Promise<{locale: string}>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const {locale} = await params;
  const nextLocale: AppLocale = isAppLocale(locale) ? locale : 'es';

  return (
    <PromptLibraryPage
      locale={nextLocale}
      title={seoCopy[nextLocale].promptsTitle}
      description={seoCopy[nextLocale].promptsDescription}
      searchParams={await searchParams}
    />
  );
}
