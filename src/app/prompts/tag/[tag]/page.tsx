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
  params: Promise<{tag: string}>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const locale = (await getLocale()) as AppLocale;
  const {tag} = await params;
  const decodedTag = decodeURIComponent(tag);
  const query = firstValue((await searchParams).q)?.trim();

  return buildMetadata({
    locale,
    pathname: `/prompts/tag/${encodeURIComponent(decodedTag)}`,
    title: locale === 'es' ? `Prompts con la etiqueta ${decodedTag}` : `Prompts tagged ${decodedTag}`,
    description:
      locale === 'es'
        ? `Explora prompts públicos etiquetados como ${decodedTag} y encuentra ideas listas para usar.`
        : `Browse public prompts tagged ${decodedTag} and find ready-to-use prompt ideas.`,
    noIndex: Boolean(query),
    imagePath: '/prompts/opengraph-image',
  });
}

export default async function PromptTagPage({
  params,
  searchParams,
}: {
  params: Promise<{tag: string}>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = (await getLocale()) as AppLocale;
  const {tag} = await params;
  const decodedTag = decodeURIComponent(tag);

  return (
    <PromptLibraryPage
      locale={locale}
      fixedTag={decodedTag}
      title={locale === 'es' ? `Prompts con la etiqueta ${decodedTag}` : `Prompts tagged ${decodedTag}`}
      description={
        locale === 'es'
          ? `Biblioteca pública de prompts filtrada por la etiqueta ${decodedTag}.`
          : `Public prompt library filtered by the ${decodedTag} tag.`
      }
      searchParams={await searchParams}
    />
  );
}
