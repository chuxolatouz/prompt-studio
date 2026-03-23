import type {Metadata} from 'next';
import {NextIntlClientProvider} from 'next-intl';
import {cookies, headers} from 'next/headers';
import {Providers} from '@/components/layout/providers';
import {isAppLocale} from '@/i18n/routing';
import {getBaseUrl, seoCopy, siteName} from '@/lib/site';
import esMessages from '@/i18n/es.json';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: getBaseUrl(),
  applicationName: siteName,
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: seoCopy.es.defaultDescription,
  icons: {
    icon: [
      {url: '/brand/favicon-16.png', sizes: '16x16', type: 'image/png'},
      {url: '/brand/favicon-32.png', sizes: '32x32', type: 'image/png'},
    ],
    apple: '/brand/apple-touch-icon.png',
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    siteName,
    type: 'website',
    images: [{url: '/opengraph-image', width: 1200, height: 630, alt: siteName}],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/opengraph-image'],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerLocale = (await headers()).get('X-NEXT-INTL-LOCALE');
  const cookieLocale = (await cookies()).get('NEXT_LOCALE')?.value;
  const htmlLocale = isAppLocale(headerLocale) ? headerLocale : isAppLocale(cookieLocale) ? cookieLocale : 'es';

  return (
    <html lang={htmlLocale}>
      <body className="bg-slate-50 text-[color:var(--prompteero-dark)] antialiased">
        <NextIntlClientProvider locale="es" messages={esMessages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
