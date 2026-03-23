import {ImageResponse} from 'next/og';
import {getPublicPromptBySlug} from '@/lib/public-prompts';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function PromptOpenGraphImage({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params;
  const prompt = await getPublicPromptBySlug(slug);
  const title = prompt?.title || 'Public prompt';
  const excerpt = prompt?.excerpt || 'Prompt ready to copy, fork and reuse.';
  const macro = prompt?.macro || 'Prompt';

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          background: 'linear-gradient(135deg, #0f172a 0%, #1660A1 100%)',
          color: '#ffffff',
          padding: '56px',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            border: '1px solid rgba(255,255,255,0.24)',
            borderRadius: 32,
            padding: 40,
          }}
        >
          <div style={{display: 'flex', flexDirection: 'column', gap: 18}}>
            <div style={{fontSize: 26, fontWeight: 700, color: '#bfdbfe'}}>prompteero · {macro}</div>
            <div style={{fontSize: 64, fontWeight: 800, lineHeight: 1.05, maxWidth: 980}}>{title}</div>
            <div style={{fontSize: 28, lineHeight: 1.35, maxWidth: 980, color: '#dbeafe'}}>{excerpt}</div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
