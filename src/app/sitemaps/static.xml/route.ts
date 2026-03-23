import {toAbsoluteUrl} from '@/lib/site';

export async function GET() {
  const now = new Date().toISOString();
  const urls = [
    toAbsoluteUrl('es', '/'),
    toAbsoluteUrl('en', '/'),
    toAbsoluteUrl('es', '/prompts'),
    toAbsoluteUrl('en', '/prompts'),
    toAbsoluteUrl('es', '/prompt-builder'),
    toAbsoluteUrl('en', '/prompt-builder'),
    toAbsoluteUrl('es', '/structures'),
    toAbsoluteUrl('en', '/structures'),
    toAbsoluteUrl('es', '/builders'),
    toAbsoluteUrl('en', '/builders'),
    toAbsoluteUrl('es', '/skill-builder'),
    toAbsoluteUrl('en', '/skill-builder'),
    toAbsoluteUrl('es', '/agent-builder'),
    toAbsoluteUrl('en', '/agent-builder'),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${url}</loc>
    <lastmod>${now}</lastmod>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(body, {
    headers: {'content-type': 'application/xml; charset=utf-8'},
  });
}
