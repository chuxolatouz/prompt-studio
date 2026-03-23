import {getPublicPrompts} from '@/lib/public-prompts';
import {toAbsoluteUrl} from '@/lib/site';

export async function GET() {
  const prompts = await getPublicPrompts();
  const sampleLinks = prompts.slice(0, 20).map((prompt) => `- ${toAbsoluteUrl('es', `/p/${prompt.slug}`)}`);
  const sampleSection = sampleLinks.length > 0 ? sampleLinks : ['- No public prompts published yet.'];

  const body = [
    '# prompteero',
    'prompteero is a bilingual website where you can store, publish and discover prompts.',
    '',
    'Primary indexes:',
    `- Spanish prompt library: ${toAbsoluteUrl('es', '/prompts')}`,
    `- English prompt library: ${toAbsoluteUrl('en', '/prompts')}`,
    '',
    'Machine-readable feeds:',
    `- ${toAbsoluteUrl('es', '/prompts/feed')}`,
    `- ${toAbsoluteUrl('en', '/prompts/feed')}`,
    '',
    'Raw prompt format:',
    '- /es/p/{slug}/raw',
    '- /es/p/{slug}/raw.txt',
    '- /en/p/{slug}/raw',
    '- /en/p/{slug}/raw.txt',
    '',
    'Sample public prompts:',
    ...sampleSection,
  ].join('\n');

  return new Response(body, {
    headers: {'content-type': 'text/plain; charset=utf-8'},
  });
}
