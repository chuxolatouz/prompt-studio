import type {Metadata} from 'next';
import {getLocale} from 'next-intl/server';
import {BuildersHubPage} from '@/features/builders/builders-hub-page';
import type {AppLocale} from '@/i18n/routing';
import {buildMetadata} from '@/lib/seo';
import {seoCopy} from '@/lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as AppLocale;

  return buildMetadata({
    locale,
    pathname: '/builders',
    title: seoCopy[locale].buildersTitle,
    description: seoCopy[locale].buildersDescription,
  });
}

export default async function BuildersHubRoute() {
  return <BuildersHubPage />;
}
