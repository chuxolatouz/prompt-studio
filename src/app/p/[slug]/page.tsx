import {PublicPromptPage} from '@/features/gallery/public-prompt-page';

export default async function PromptPublicRoute({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params;
  return <PublicPromptPage slug={slug} />;
}
