import {getPublicPromptTaxonomy, getPublicPrompts} from '@/lib/public-prompts';
import {toAbsoluteUrl} from '@/lib/site';

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const prompts = await getPublicPrompts();
  const taxonomy = await getPublicPromptTaxonomy();
  const now = new Date().toISOString();

  const entries = [
    ...prompts.flatMap((prompt) => [
      {loc: toAbsoluteUrl('es', `/p/${prompt.slug}`), lastmod: prompt.updatedAt ?? prompt.createdAt},
      {loc: toAbsoluteUrl('en', `/p/${prompt.slug}`), lastmod: prompt.updatedAt ?? prompt.createdAt},
    ]),
    ...taxonomy.tags.flatMap((tag) => [
      {loc: toAbsoluteUrl('es', `/prompts/tag/${encodeURIComponent(tag)}`), lastmod: now},
      {loc: toAbsoluteUrl('en', `/prompts/tag/${encodeURIComponent(tag)}`), lastmod: now},
    ]),
    ...taxonomy.macros.flatMap((macro) => [
      {loc: toAbsoluteUrl('es', `/prompts/macro/${encodeURIComponent(macro)}`), lastmod: now},
      {loc: toAbsoluteUrl('en', `/prompts/macro/${encodeURIComponent(macro)}`), lastmod: now},
    ]),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    ({loc, lastmod}) => `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(body, {
    headers: {'content-type': 'application/xml; charset=utf-8'},
  });
}
