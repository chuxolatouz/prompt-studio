import {getRequestConfig} from 'next-intl/server';
import {cookies, headers} from 'next/headers';
import {isAppLocale, routing} from './routing';

export default getRequestConfig(async ({locale, requestLocale}) => {
  const headerLocale = (await headers()).get('x-prompteero-locale');
  const cookieLocale = (await cookies()).get('NEXT_LOCALE')?.value;
  const requestedLocale = locale ?? (await requestLocale) ?? headerLocale ?? cookieLocale;
  const nextLocale = isAppLocale(requestedLocale) ? requestedLocale : routing.defaultLocale;

  return {
    locale: nextLocale,
    messages: (await import(`./${nextLocale}.json`)).default,
  };
});
