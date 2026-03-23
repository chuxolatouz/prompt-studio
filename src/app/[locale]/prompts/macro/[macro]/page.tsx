import type {Metadata} from 'next';
import {PromptLibraryPage} from '@/features/gallery/prompt-library-page';
import {isAppLocale, type AppLocale} from '@/i18n/routing';
import {buildMetadata} from '@/lib/seo';

function firstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{locale: string; macro: string}>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const {locale, macro} = await params;
  const nextLocale: AppLocale = isAppLocale(locale) ? locale : 'es';
  const decodedMacro = decodeURIComponent(macro);
  const query = firstValue((await searchParams).q)?.trim();

  return buildMetadata({
    locale: nextLocale,
    pathname: `/prompts/macro/${encodeURIComponent(decodedMacro)}`,
    title: nextLocale === 'es' ? `Prompts con macro ${decodedMacro}` : `${decodedMacro} prompts`,
    description:
      nextLocale === 'es'
        ? `Descubre prompts públicos organizados con la macro ${decodedMacro}.`
        : `Discover public prompts organized with the ${decodedMacro} macro.`,
    noIndex: Boolean(query),
    imagePath: '/prompts/opengraph-image',
  });
}

export default async function LocalizedPromptMacroPage({
  params,
  searchParams,
}: {
  params: Promise<{locale: string; macro: string}>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const {locale, macro} = await params;
  const nextLocale: AppLocale = isAppLocale(locale) ? locale : 'es';
  const decodedMacro = decodeURIComponent(macro);

  return (
    <PromptLibraryPage
      locale={nextLocale}
      fixedMacro={decodedMacro}
      title={nextLocale === 'es' ? `Prompts con macro ${decodedMacro}` : `${decodedMacro} prompts`}
      description={
        nextLocale === 'es'
          ? `Biblioteca pública de prompts filtrada por la macro ${decodedMacro}.`
          : `Public prompt library filtered by the ${decodedMacro} macro.`
      }
      searchParams={await searchParams}
    />
  );
}
