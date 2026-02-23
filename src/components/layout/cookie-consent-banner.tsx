'use client';

import {useEffect, useState} from 'react';
import {useTranslations} from 'next-intl';
import {Button} from '@/components/ui/button';

const COOKIE_CONSENT_KEY = 'prompteero_cookie_consent';

function getCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const encodedName = encodeURIComponent(name);
  const match = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${encodedName}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(encodedName.length + 1));
}

function setCookie(name: string, value: string) {
  if (typeof document === 'undefined') return;
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; Max-Age=15552000; SameSite=Lax${secure}`;
}

export function CookieConsentBanner() {
  const t = useTranslations();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = getCookie(COOKIE_CONSENT_KEY);
    if (!consent) setVisible(true);
  }, []);

  const acceptCookies = () => {
    setCookie(COOKIE_CONSENT_KEY, 'accepted');
    setVisible(false);
  };

  const rejectOptionalCookies = () => {
    setCookie(COOKIE_CONSENT_KEY, 'rejected');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border border-slate-300 bg-white/95 p-4 shadow-lg backdrop-blur sm:inset-x-6 sm:bottom-5">
      <p className="text-sm font-semibold text-slate-900">{t('cookies.title')}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-700">{t('cookies.description')}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={acceptCookies}>
          {t('cookies.accept')}
        </Button>
        <Button size="sm" variant="outline" onClick={rejectOptionalCookies}>
          {t('cookies.reject')}
        </Button>
      </div>
    </div>
  );
}
