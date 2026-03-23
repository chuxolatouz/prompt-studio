import type {ReactNode} from 'react';
import {notFound} from 'next/navigation';
import {NextIntlClientProvider} from 'next-intl';
import {getMessages, setRequestLocale} from 'next-intl/server';
import {SiteHeader} from '@/components/layout/site-header';
import {isAppLocale, routing} from '@/i18n/routing';
import {seoCopy, siteName, toAbsoluteUrl} from '@/lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;

  if (!isAppLocale(locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    url: toAbsoluteUrl(locale, '/'),
    inLanguage: locale,
    description: seoCopy[locale].defaultDescription,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${toAbsoluteUrl(locale, '/prompts')}?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(websiteJsonLd)}} />
      <NextIntlClientProvider locale={locale} messages={messages}>
        <SiteHeader />
        <main className="mx-auto min-h-[calc(100vh-44px)] w-full max-w-7xl px-4 py-6">{children}</main>
      </NextIntlClientProvider>
    </>
  );
}
