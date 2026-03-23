import type {MetadataRoute} from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'prompteero',
    short_name: 'prompteero',
    description: 'Guarda y encuentra prompts, publícalos y descubre prompts públicos listos para usar.',
    start_url: '/es',
    scope: '/',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#1660A1',
    categories: ['productivity', 'developer tools', 'education'],
    icons: [
      {
        src: '/brand/android-chrome-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/brand/android-chrome-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/brand/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
