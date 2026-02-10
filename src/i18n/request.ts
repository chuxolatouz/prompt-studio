import {getRequestConfig} from 'next-intl/server';
import {cookies} from 'next/headers';

export default getRequestConfig(async () => {
  const localeCookie = (await cookies()).get('NEXT_LOCALE')?.value;
  const locale = localeCookie === 'en' ? 'en' : 'es';

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
