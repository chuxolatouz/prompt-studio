import {ImageResponse} from 'next/og';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          background: 'linear-gradient(135deg, #ecfeff 0%, #ffffff 48%, #dcfce7 100%)',
          color: '#0f172a',
          padding: '56px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', border: '2px solid #bfdbfe', borderRadius: 32, padding: 40}}>
          <div style={{display: 'flex', flexDirection: 'column', gap: 18}}>
            <div style={{fontSize: 28, fontWeight: 700, color: '#1660A1'}}>prompteero</div>
            <div style={{fontSize: 72, fontWeight: 800, lineHeight: 1.05, maxWidth: 900}}>Guarda y encuentra prompts listos para usar</div>
            <div style={{fontSize: 30, lineHeight: 1.35, maxWidth: 920, color: '#334155'}}>
              Publica tus prompts, explora una biblioteca pública y reutiliza ideas con Prompt Builder y taxonomías por macro y etiqueta.
            </div>
          </div>
          <div style={{display: 'flex', gap: 16}}>
            <div style={{background: '#1660A1', color: '#ffffff', padding: '16px 22px', borderRadius: 9999, fontSize: 24}}>Prompt library</div>
            <div style={{background: '#ffffff', color: '#0f172a', padding: '16px 22px', borderRadius: 9999, fontSize: 24, border: '1px solid #cbd5e1'}}>Prompt Builder</div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
