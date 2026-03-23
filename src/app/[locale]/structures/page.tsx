import type {Metadata} from 'next';
import {StructuresPage} from '@/features/structures/structures-page';
import {isAppLocale, type AppLocale} from '@/i18n/routing';
import {buildMetadata} from '@/lib/seo';
import {seoCopy} from '@/lib/site';

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const nextLocale: AppLocale = isAppLocale(locale) ? locale : 'es';

  return buildMetadata({
    locale: nextLocale,
    pathname: '/structures',
    title: seoCopy[nextLocale].structuresTitle,
    description: seoCopy[nextLocale].structuresDescription,
  });
}

export default function LocalizedStructuresPage() {
  return <StructuresPage />;
}
