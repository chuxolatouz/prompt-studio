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
  params: Promise<{locale: string; tag: string}>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const {locale, tag} = await params;
  const nextLocale: AppLocale = isAppLocale(locale) ? locale : 'es';
  const decodedTag = decodeURIComponent(tag);
  const query = firstValue((await searchParams).q)?.trim();

  return buildMetadata({
    locale: nextLocale,
    pathname: `/prompts/tag/${encodeURIComponent(decodedTag)}`,
    title: nextLocale === 'es' ? `Prompts con la etiqueta ${decodedTag}` : `Prompts tagged ${decodedTag}`,
    description:
      nextLocale === 'es'
        ? `Explora prompts públicos etiquetados como ${decodedTag} y encuentra ideas listas para usar.`
        : `Browse public prompts tagged ${decodedTag} and find ready-to-use prompt ideas.`,
    noIndex: Boolean(query),
    imagePath: '/prompts/opengraph-image',
  });
}

export default async function LocalizedPromptTagPage({
  params,
  searchParams,
}: {
  params: Promise<{locale: string; tag: string}>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const {locale, tag} = await params;
  const nextLocale: AppLocale = isAppLocale(locale) ? locale : 'es';
  const decodedTag = decodeURIComponent(tag);

  return (
    <PromptLibraryPage
      locale={nextLocale}
      fixedTag={decodedTag}
      title={nextLocale === 'es' ? `Prompts con la etiqueta ${decodedTag}` : `Prompts tagged ${decodedTag}`}
      description={
        nextLocale === 'es'
          ? `Biblioteca pública de prompts filtrada por la etiqueta ${decodedTag}.`
          : `Public prompt library filtered by the ${decodedTag} tag.`
      }
      searchParams={await searchParams}
    />
  );
}
