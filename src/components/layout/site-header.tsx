'use client';

import {useState} from 'react';
import Link from 'next/link';
import {Menu, Wrench} from 'lucide-react';
import {usePathname} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {cn} from '@/lib/utils';
import {LocaleSwitcher} from '@/components/layout/locale-switcher';
import {Logo} from '@/components/layout/logo';
import {Button} from '@/components/ui/button';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from '@/components/ui/dropdown-menu';

const builderLinks = [
  {href: '/prompt-builder', key: 'nav.promptBuilder'},
  {href: '/skill-builder', key: 'nav.skillBuilder'},
  {href: '/agent-builder', key: 'nav.agentBuilder'},
];

const mainLinks = [
  {href: '/', key: 'nav.home'},
  {href: '/structures', key: 'nav.structures'},
  {href: '/gallery', key: 'nav.gallery'},
  {href: '/dashboard', key: 'nav.dashboard'},
  {href: '/auth', key: 'nav.auth'},
];

export function SiteHeader() {
  const pathname = usePathname();
  const t = useTranslations();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileBuildersOpen, setMobileBuildersOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--prompteero-light)] bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
          <Logo variant="icon" size={32} className="sm:hidden" priority />
          <Logo variant="full" size={180} className="hidden sm:block" priority />
        </Link>

        <nav className="hidden items-center gap-2 lg:flex">
          <Link
            href="/"
            className={cn(
              'rounded-lg px-2 py-1 text-sm text-[color:var(--prompteero-dark)]',
              pathname === '/' ? 'bg-blue-100 text-[color:var(--prompteero-blue)]' : 'hover:bg-slate-100'
            )}
          >
            {t('nav.home')}
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-8 px-2 text-sm text-[color:var(--prompteero-dark)]',
                  builderLinks.some((link) => pathname === link.href) || pathname === '/builders'
                    ? 'bg-blue-100 text-[color:var(--prompteero-blue)] hover:bg-blue-100'
                    : 'hover:bg-slate-100'
                )}
              >
                <Wrench className="mr-1 h-4 w-4" />
                {t('nav.builders')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem asChild>
                <Link href="/builders">{t('nav.openBuilders')}</Link>
              </DropdownMenuItem>
              {builderLinks.map((link) => (
                <DropdownMenuItem key={link.href} asChild>
                  <Link href={link.href}>{t(link.key)}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {mainLinks.slice(1).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-lg px-2 py-1 text-sm text-[color:var(--prompteero-dark)]',
                pathname === link.href ? 'bg-blue-100 text-[color:var(--prompteero-blue)]' : 'hover:bg-slate-100'
              )}
            >
              {t(link.key)}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:block">
          <LocaleSwitcher />
        </div>

        <button
          onClick={() => setMobileOpen((value) => !value)}
          className="rounded-lg border border-[color:var(--prompteero-light)] p-2 text-[color:var(--prompteero-dark)] lg:hidden"
          aria-label={t('nav.menu')}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-[color:var(--prompteero-light)] bg-white px-4 py-3 lg:hidden">
          <div className="mb-3">
            <LocaleSwitcher />
          </div>

          <div className="space-y-1">
            <Link href="/" onClick={() => setMobileOpen(false)} className="block rounded-lg px-2 py-2 text-sm hover:bg-slate-100">
              {t('nav.home')}
            </Link>

            <button
              onClick={() => setMobileBuildersOpen((value) => !value)}
              className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-100"
            >
              <span>{t('nav.builders')}</span>
              <span>{mobileBuildersOpen ? '-' : '+'}</span>
            </button>

            {mobileBuildersOpen && (
              <div className="space-y-1 pl-3">
                <Link href="/builders" onClick={() => setMobileOpen(false)} className="block rounded-lg px-2 py-2 text-sm hover:bg-slate-100">
                  {t('nav.openBuilders')}
                </Link>
                {builderLinks.map((link) => (
                  <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className="block rounded-lg px-2 py-2 text-sm hover:bg-slate-100">
                    {t(link.key)}
                  </Link>
                ))}
              </div>
            )}

            {mainLinks.slice(1).map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className="block rounded-lg px-2 py-2 text-sm hover:bg-slate-100">
                {t(link.key)}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
