import type {Metadata} from 'next';
import {getLocale} from 'next-intl/server';
import {StructuresPage} from '@/features/structures/structures-page';
import type {AppLocale} from '@/i18n/routing';
import {buildMetadata} from '@/lib/seo';
import {seoCopy} from '@/lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as AppLocale;

  return buildMetadata({
    locale,
    pathname: '/structures',
    title: seoCopy[locale].structuresTitle,
    description: seoCopy[locale].structuresDescription,
  });
}

export default function StructuresRoute() {
  return <StructuresPage />;
}
