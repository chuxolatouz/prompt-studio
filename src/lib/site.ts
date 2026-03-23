import type {AppLocale} from '@/i18n/routing';

export const siteName = 'prompteero';
export const siteHandle = 'prompteero';

const fallbackBaseUrl = 'http://localhost:3000';

export const seoCopy: Record<
  AppLocale,
  {
    defaultTitle: string;
    defaultDescription: string;
    homeTitle: string;
    homeDescription: string;
    promptsTitle: string;
    promptsDescription: string;
    promptBuilderTitle: string;
    promptBuilderDescription: string;
    structuresTitle: string;
    structuresDescription: string;
    buildersTitle: string;
    buildersDescription: string;
    skillBuilderTitle: string;
    skillBuilderDescription: string;
    agentBuilderTitle: string;
    agentBuilderDescription: string;
  }
> = {
  es: {
    defaultTitle: 'Guarda y encuentra prompts',
    defaultDescription: 'Guarda tus prompts, publícalos y descubre prompts públicos listos para usar en una biblioteca bilingüe.',
    homeTitle: 'Guarda y encuentra prompts',
    homeDescription: 'Crea, guarda, publica y encuentra prompts listos para usar. prompteero combina Prompt Builder y biblioteca pública en un solo sitio.',
    promptsTitle: 'Prompts públicos para guardar y reutilizar',
    promptsDescription: 'Explora prompts públicos por macro y etiquetas, guarda favoritos y encuentra prompts listos para copiar, clonar o reutilizar.',
    promptBuilderTitle: 'Prompt Builder para crear y guardar prompts',
    promptBuilderDescription: 'Construye prompts por segmentos, ordénalos y publícalos en la biblioteca pública de prompteero.',
    structuresTitle: 'Estructuras de prompts',
    structuresDescription: 'Aprende estructuras como RTF, TAO, STAR o CO-STAR para escribir prompts más claros y reutilizables.',
    buildersTitle: 'Builders para prompts, skills y agents',
    buildersDescription: 'Explora los builders de prompteero y usa Prompt Builder como flujo principal para crear y guardar prompts.',
    skillBuilderTitle: 'Skill Builder',
    skillBuilderDescription: 'Crea skills reutilizables como complemento de tu biblioteca de prompts.',
    agentBuilderTitle: 'Agent Builder',
    agentBuilderDescription: 'Diseña agents documentados y úsalos como capa secundaria junto a tu biblioteca de prompts.',
  },
  en: {
    defaultTitle: 'Store and discover prompts',
    defaultDescription: 'Store your prompts, publish them and discover public prompts ready to use in a bilingual prompt library.',
    homeTitle: 'Store and discover prompts',
    homeDescription: 'Create, store, publish and discover ready-to-use prompts. prompteero combines a Prompt Builder with a public prompt library.',
    promptsTitle: 'Public prompts to save and reuse',
    promptsDescription: 'Browse public prompts by macro and tags, save favorites and find prompts ready to copy, fork or reuse.',
    promptBuilderTitle: 'Prompt Builder to create and store prompts',
    promptBuilderDescription: 'Build prompts piece by piece, reorder them and publish them to the public prompt library.',
    structuresTitle: 'Prompt structures',
    structuresDescription: 'Learn structures like RTF, TAO, STAR and CO-STAR to write clearer, reusable prompts.',
    buildersTitle: 'Builders for prompts, skills and agents',
    buildersDescription: 'Explore prompteero builders and use Prompt Builder as the main workflow to create and store prompts.',
    skillBuilderTitle: 'Skill Builder',
    skillBuilderDescription: 'Create reusable skills as a secondary layer next to your prompt library.',
    agentBuilderTitle: 'Agent Builder',
    agentBuilderDescription: 'Design text-first agents and use them as a secondary layer alongside your prompt library.',
  },
};

export function getBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return new URL(configured ? configured.replace(/\/$/, '') : fallbackBaseUrl);
}

export function localizePath(locale: AppLocale, pathname = '/') {
  const [pathWithoutHash, hash = ''] = pathname.split('#');
  const [rawPath = '/', search = ''] = pathWithoutHash.split('?');
  const normalizedPath = rawPath === '/' ? '' : rawPath.replace(/^\/+/, '');
  const localizedPath = normalizedPath ? `/${locale}/${normalizedPath}` : `/${locale}`;
  const nextSearch = search ? `?${search}` : '';
  const nextHash = hash ? `#${hash}` : '';

  return `${localizedPath}${nextSearch}${nextHash}`;
}

export function toAbsoluteUrl(locale: AppLocale, pathname = '/') {
  return new URL(localizePath(locale, pathname), getBaseUrl()).toString();
}

export function stripLocalePrefix(pathname: string) {
  const segments = pathname.split('/');
  const maybeLocale = segments[1];

  if (maybeLocale === 'es' || maybeLocale === 'en') {
    const rest = `/${segments.slice(2).join('/')}`.replace(/\/+/g, '/');
    return rest === '/' ? '/' : rest.replace(/\/$/, '') || '/';
  }

  return pathname;
}
