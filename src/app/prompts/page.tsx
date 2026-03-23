import type {Metadata} from 'next';
import {getLocale} from 'next-intl/server';
import {PromptLibraryPage} from '@/features/gallery/prompt-library-page';
import type {AppLocale} from '@/i18n/routing';
import {buildMetadata} from '@/lib/seo';
import {seoCopy} from '@/lib/site';

function firstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const locale = (await getLocale()) as AppLocale;
  const params = await searchParams;
  const noIndex = Boolean(firstValue(params.q)?.trim());

  return buildMetadata({
    locale,
    pathname: '/prompts',
    title: seoCopy[locale].promptsTitle,
    description: seoCopy[locale].promptsDescription,
    noIndex,
    imagePath: '/prompts/opengraph-image',
  });
}

export default async function PromptsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = (await getLocale()) as AppLocale;

  return (
    <PromptLibraryPage
      locale={locale}
      title={seoCopy[locale].promptsTitle}
      description={seoCopy[locale].promptsDescription}
      searchParams={await searchParams}
    />
  );
}
