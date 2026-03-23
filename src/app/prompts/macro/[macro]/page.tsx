import type {Metadata} from 'next';
import {getLocale} from 'next-intl/server';
import {PromptLibraryPage} from '@/features/gallery/prompt-library-page';
import type {AppLocale} from '@/i18n/routing';
import {buildMetadata} from '@/lib/seo';

function firstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{macro: string}>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const locale = (await getLocale()) as AppLocale;
  const {macro} = await params;
  const decodedMacro = decodeURIComponent(macro);
  const query = firstValue((await searchParams).q)?.trim();

  return buildMetadata({
    locale,
    pathname: `/prompts/macro/${encodeURIComponent(decodedMacro)}`,
    title: locale === 'es' ? `Prompts con macro ${decodedMacro}` : `${decodedMacro} prompts`,
    description:
      locale === 'es'
        ? `Descubre prompts públicos organizados con la macro ${decodedMacro}.`
        : `Discover public prompts organized with the ${decodedMacro} macro.`,
    noIndex: Boolean(query),
    imagePath: '/prompts/opengraph-image',
  });
}

export default async function PromptMacroPage({
  params,
  searchParams,
}: {
  params: Promise<{macro: string}>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = (await getLocale()) as AppLocale;
  const {macro} = await params;
  const decodedMacro = decodeURIComponent(macro);

  return (
    <PromptLibraryPage
      locale={locale}
      fixedMacro={decodedMacro}
      title={locale === 'es' ? `Prompts con macro ${decodedMacro}` : `${decodedMacro} prompts`}
      description={
        locale === 'es'
          ? `Biblioteca pública de prompts filtrada por la macro ${decodedMacro}.`
          : `Public prompt library filtered by the ${decodedMacro} macro.`
      }
      searchParams={await searchParams}
    />
  );
}
