import type {MetadataRoute} from 'next';
import {getBaseUrl} from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();
  const host = baseUrl.host;

  return {
    rules: {
      userAgent: '*',
      allow: ['/es', '/en', '/es/prompts', '/en/prompts', '/es/p/', '/en/p/', '/es/structures', '/en/structures'],
      disallow: ['/es/auth', '/en/auth', '/es/dashboard', '/en/dashboard', '/es/admin', '/en/admin'],
    },
    sitemap: new URL('/sitemap.xml', baseUrl).toString(),
    host,
  };
}
