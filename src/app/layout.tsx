import type {Metadata} from 'next';
import {NextIntlClientProvider} from 'next-intl';
import {getLocale, getMessages} from 'next-intl/server';
import {SiteHeader} from '@/components/layout/site-header';
import {Providers} from '@/components/layout/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'prompteero',
  description: 'prompteero convierte ideas en prompts claros, utiles y listos para usar.',
  icons: {
    icon: [
      {url: '/brand/favicon-16.png', sizes: '16x16', type: 'image/png'},
      {url: '/brand/favicon-32.png', sizes: '32x32', type: 'image/png'},
    ],
    apple: '/brand/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className="bg-slate-50 text-[color:var(--prompteero-dark)] antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <SiteHeader />
            <main className="mx-auto min-h-[calc(100vh-44px)] w-full max-w-7xl px-4 py-6">{children}</main>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
