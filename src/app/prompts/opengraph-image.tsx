import {ImageResponse} from 'next/og';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function PromptLibraryOpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 50%, #f0fdf4 100%)',
          color: '#0f172a',
          padding: '56px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', border: '2px solid #bfdbfe', borderRadius: 32, padding: 40}}>
          <div style={{display: 'flex', flexDirection: 'column', gap: 18}}>
            <div style={{fontSize: 28, fontWeight: 700, color: '#1660A1'}}>prompteero public prompts</div>
            <div style={{fontSize: 72, fontWeight: 800, lineHeight: 1.05, maxWidth: 900}}>Explora prompts públicos por macro y etiqueta</div>
            <div style={{fontSize: 30, lineHeight: 1.35, maxWidth: 920, color: '#334155'}}>
              Descubre prompts listos para copiar, guardar en favoritos y reutilizar en tu flujo.
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
