import {getPublicPromptBySlug} from '@/lib/public-prompts';

export async function GET(_: Request, {params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params;
  const prompt = await getPublicPromptBySlug(slug);

  if (!prompt) {
    return new Response('Prompt not found', {status: 404, headers: {'content-type': 'text/plain; charset=utf-8'}});
  }

  return new Response(prompt.outputPrompt, {
    headers: {'content-type': 'text/plain; charset=utf-8'},
  });
}
