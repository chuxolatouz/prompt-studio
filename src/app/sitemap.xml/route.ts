import {getBaseUrl} from '@/lib/site';

export async function GET() {
  const baseUrl = getBaseUrl().toString().replace(/\/$/, '');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${baseUrl}/sitemaps/static.xml</loc>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemaps/prompts.xml</loc>
  </sitemap>
</sitemapindex>`;

  return new Response(body, {
    headers: {'content-type': 'application/xml; charset=utf-8'},
  });
}
