'use client';

import {useState} from 'react';
import Link from 'next/link';
import {Menu} from 'lucide-react';
import {usePathname} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {cn} from '@/lib/utils';
import {LocaleSwitcher} from '@/components/layout/locale-switcher';
import {Logo} from '@/components/layout/logo';
import {Button} from '@/components/ui/button';
import {useAuth} from '@/features/common/auth-context';

const builderLinks = [
  {href: '/prompt-builder', key: 'nav.promptBuilder'},
  {href: '/skill-builder', key: 'nav.skillBuilder'},
  {href: '/agent-builder', key: 'nav.agentBuilder'},
];

const mainLinks = [
  {href: '/', key: 'nav.home'},
  {href: '/structures', key: 'nav.structures'},
  {href: '/gallery', key: 'nav.gallery'},
];

export function SiteHeader() {
  const pathname = usePathname();
  const t = useTranslations();
  const {user, profileName, signOut} = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const userLabel = profileName || user?.email || t('common.account');

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--prompteero-light)] bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2">
        <Link href="/" className="flex items-center gap-2 rounded-lg px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--prompteero-blue)]" onClick={() => setMobileOpen(false)}>
          <Logo variant="icon" size={28} className="sm:hidden" priority />
          <Logo variant="full" size={120} className="hidden sm:block" priority />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {[mainLinks[0], {href: '/builders', key: 'nav.builders'}, ...mainLinks.slice(1)].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-lg px-3 py-2 text-sm text-[color:var(--prompteero-dark)]',
                pathname === link.href || (link.href === '/builders' && builderLinks.some((item) => pathname === item.href))
                  ? 'bg-[color:var(--prompteero-blue)] !text-white'
                  : 'hover:bg-slate-100'
              )}
            >
              {t(link.key)}
            </Link>
          ))}
          {user ? (
            <>
              <Link
                href="/dashboard"
                className={cn(
                  'rounded-lg px-2 py-1 text-sm text-[color:var(--prompteero-dark)]',
                  pathname === '/dashboard' ? 'bg-[color:var(--prompteero-blue)] !text-white' : 'hover:bg-slate-100'
                )}
              >
                {t('nav.dashboard')}
              </Link>
              <div className="max-w-[220px] truncate rounded-lg border border-[color:var(--prompteero-light)] bg-slate-50 px-2 py-1 text-xs text-[color:var(--prompteero-mid)]">
                {userLabel}
              </div>
              <Button variant="secondary" size="sm" onClick={() => signOut()}>
                {t('auth.logout')}
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild size="sm">
                <Link href="/auth?mode=login">{t('auth.login')}</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/auth?mode=register">{t('auth.register')}</Link>
              </Button>
            </div>
          )}
        </nav>

        <div className="hidden lg:block">
          <LocaleSwitcher />
        </div>

        <button
          onClick={() => setMobileOpen((value) => !value)}
          className="rounded-lg border border-[color:var(--prompteero-light)] p-2 text-[color:var(--prompteero-dark)] lg:hidden"
          aria-label={t('nav.menu')}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {mobileOpen && (
        <div id="mobile-menu" className="border-t border-[color:var(--prompteero-light)] bg-white px-4 py-3 lg:hidden">
          <div className="mb-3">
            <LocaleSwitcher />
          </div>

          <div className="space-y-1">
            <Link href="/" onClick={() => setMobileOpen(false)} className="block rounded-lg px-2 py-2 text-sm hover:bg-slate-100">
              {t('nav.home')}
            </Link>

            <Link
              href="/builders"
              onClick={() => setMobileOpen(false)}
              className={cn(
                'block rounded-lg px-2 py-2 text-sm',
                pathname === '/builders' || builderLinks.some((item) => pathname === item.href)
                  ? 'bg-[color:var(--prompteero-blue)] !text-white'
                  : 'hover:bg-slate-100'
              )}
            >
              {t('nav.builders')}
            </Link>
            <div id="mobile-builders-submenu" className="space-y-1 pl-3">
              {builderLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'block rounded-lg px-2 py-2 text-sm',
                    pathname === link.href ? 'bg-slate-100 font-semibold' : 'hover:bg-slate-100'
                  )}
                >
                  {t(link.key)}
                </Link>
              ))}
            </div>

            {mainLinks.slice(1).map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className="block rounded-lg px-2 py-2 text-sm hover:bg-slate-100">
                {t(link.key)}
              </Link>
            ))}
            {user ? (
              <>
                <p className="rounded-lg bg-slate-50 px-2 py-2 text-xs text-[color:var(--prompteero-mid)]">{userLabel}</p>
                <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="block rounded-lg px-2 py-2 text-sm hover:bg-slate-100">
                  {t('nav.dashboard')}
                </Link>
                <button
                  onClick={async () => {
                    await signOut();
                    setMobileOpen(false);
                  }}
                  className="block w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-100"
                >
                  {t('auth.logout')}
                </button>
              </>
            ) : (
              <>
                <p className="px-2 pt-2 text-xs font-medium text-slate-500">{t('nav.authSection')}</p>
                <Link href="/auth?mode=login" onClick={() => setMobileOpen(false)} className="block rounded-lg bg-[color:var(--prompteero-blue)] px-2 py-2 text-sm font-medium text-white hover:bg-[#0f4f87]">
                  {t('auth.login')}
                </Link>
                <Link href="/auth?mode=register" onClick={() => setMobileOpen(false)} className="mt-2 block rounded-lg border border-[color:var(--prompteero-light)] px-2 py-2 text-sm font-medium text-[color:var(--prompteero-dark)] hover:bg-slate-50">
                  {t('auth.register')}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
