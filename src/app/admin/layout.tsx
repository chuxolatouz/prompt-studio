import type {Metadata} from 'next';
import {getLocale} from 'next-intl/server';
import type {AppLocale} from '@/i18n/routing';
import {buildMetadata} from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as AppLocale;

  return buildMetadata({
    locale,
    pathname: '/admin',
    title: 'Admin',
    description: locale === 'es' ? 'Moderación interna de prompteero.' : 'Internal moderation for prompteero.',
    noIndex: true,
  });
}

export default function AdminLayout({children}: {children: React.ReactNode}) {
  return children;
}
