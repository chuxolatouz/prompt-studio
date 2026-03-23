import type {Metadata} from 'next';
import {getLocale} from 'next-intl/server';
import type {AppLocale} from '@/i18n/routing';
import {buildMetadata} from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as AppLocale;

  return buildMetadata({
    locale,
    pathname: '/auth',
    title: locale === 'es' ? 'Acceso' : 'Access',
    description: locale === 'es' ? 'Acceso a tu cuenta de prompteero.' : 'Access your prompteero account.',
    noIndex: true,
  });
}

export default function AuthLayout({children}: {children: React.ReactNode}) {
  return children;
}
