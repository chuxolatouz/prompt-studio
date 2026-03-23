import type {Metadata} from 'next';
import {BuildersHubPage} from '@/features/builders/builders-hub-page';
import {isAppLocale, type AppLocale} from '@/i18n/routing';
import {buildMetadata} from '@/lib/seo';
import {seoCopy} from '@/lib/site';

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const nextLocale: AppLocale = isAppLocale(locale) ? locale : 'es';

  return buildMetadata({
    locale: nextLocale,
    pathname: '/builders',
    title: seoCopy[nextLocale].buildersTitle,
    description: seoCopy[nextLocale].buildersDescription,
  });
}

export default async function LocalizedBuildersPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  const nextLocale: AppLocale = isAppLocale(locale) ? locale : 'es';

  return <BuildersHubPage locale={nextLocale} />;
}
