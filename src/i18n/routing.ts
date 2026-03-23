import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['es', 'en'],
  defaultLocale: 'es',
  localePrefix: 'always',
  alternateLinks: true,
});

export type AppLocale = (typeof routing.locales)[number];

export function isAppLocale(value?: string | null): value is AppLocale {
  return Boolean(value && routing.locales.includes(value as AppLocale));
}
