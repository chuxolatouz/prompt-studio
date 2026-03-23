import type {Metadata} from 'next';
import type {AppLocale} from '@/i18n/routing';
import {siteName, toAbsoluteUrl} from '@/lib/site';

type MetadataInput = {
  locale: AppLocale;
  pathname: string;
  title: string;
  description: string;
  noIndex?: boolean;
  imagePath?: string;
};

export function buildMetadata({locale, pathname, title, description, noIndex = false, imagePath = '/opengraph-image'}: MetadataInput): Metadata {
  const canonical = toAbsoluteUrl(locale, pathname);
  const imageUrl = toAbsoluteUrl(locale, imagePath);

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        es: toAbsoluteUrl('es', pathname),
        en: toAbsoluteUrl('en', pathname),
        'x-default': toAbsoluteUrl('es', pathname),
      },
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
        },
    openGraph: {
      title: `${title} | ${siteName}`,
      description,
      url: canonical,
      siteName,
      locale,
      type: 'website',
      images: [{url: imageUrl, width: 1200, height: 630, alt: title}],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${siteName}`,
      description,
      images: [imageUrl],
    },
  };
}

export function toJsonLd(value: unknown) {
  return {__html: JSON.stringify(value)};
}
