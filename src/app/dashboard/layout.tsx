import type {Metadata} from 'next';
import {getLocale} from 'next-intl/server';
import type {AppLocale} from '@/i18n/routing';
import {buildMetadata} from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as AppLocale;

  return buildMetadata({
    locale,
    pathname: '/dashboard',
    title: locale === 'es' ? 'Mi cuenta' : 'Dashboard',
    description: locale === 'es' ? 'Panel personal de prompteero.' : 'Your prompteero dashboard.',
    noIndex: true,
  });
}

export default function DashboardLayout({children}: {children: React.ReactNode}) {
  return children;
}
