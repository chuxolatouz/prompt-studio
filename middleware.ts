import {NextRequest, NextResponse} from 'next/server';
import createMiddleware from 'next-intl/middleware';
import {isAppLocale, routing} from '@/i18n/routing';
import {localizePath} from '@/lib/site';

const handleI18nRouting = createMiddleware(routing);

function getPreferredLocale(request: NextRequest) {
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (isAppLocale(cookieLocale)) return cookieLocale;

  const acceptLanguage = request.headers.get('accept-language')?.toLowerCase() || '';
  if (acceptLanguage.includes('en')) return 'en';

  return routing.defaultLocale;
}

function normalizeInternalPath(pathname: string) {
  const normalized = pathname.replace(/\/+/g, '/');
  if (normalized === '') return '/';
  if (normalized !== '/' && normalized.endsWith('/')) return normalized.slice(0, -1);
  return normalized;
}

export default function middleware(request: NextRequest) {
  const pathname = normalizeInternalPath(request.nextUrl.pathname);
  const segments = pathname.split('/');
  const localeFromPath = segments[1];

  if (isAppLocale(localeFromPath)) {
    const localizedPath = normalizeInternalPath(`/${segments.slice(2).join('/')}`);

    if (localizedPath === '/gallery') {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = localizePath(localeFromPath, '/prompts');
      return NextResponse.redirect(redirectUrl, 308);
    }
  }

  if (pathname === '/gallery') {
    const locale = getPreferredLocale(request);
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = localizePath(locale, '/prompts');

    return NextResponse.redirect(redirectUrl, 308);
  }

  return handleI18nRouting(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
