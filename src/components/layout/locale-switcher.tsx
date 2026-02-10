'use client';

import {useLocale, useTranslations} from 'next-intl';
import {usePathname, useRouter} from 'next/navigation';
import {Button} from '@/components/ui/button';

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (nextLocale: 'es' | 'en') => {
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000`;
    router.replace(pathname as never);
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-600">{t('language')}</span>
      <Button variant={locale === 'es' ? 'default' : 'outline'} size="sm" onClick={() => switchLocale('es')}>
        ES
      </Button>
      <Button variant={locale === 'en' ? 'default' : 'outline'} size="sm" onClick={() => switchLocale('en')}>
        EN
      </Button>
    </div>
  );
}
