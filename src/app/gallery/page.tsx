import {getLocale} from 'next-intl/server';
import {permanentRedirect} from 'next/navigation';
import type {AppLocale} from '@/i18n/routing';
import {localizePath} from '@/lib/site';

export default async function GalleryRoute() {
  const locale = (await getLocale()) as AppLocale;
  permanentRedirect(localizePath(locale, '/prompts'));
}
