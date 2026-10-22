import type { MetadataRoute } from 'next';
import { DESCRICAO_SITE } from '@/lib/seo';

export const dynamic = 'force-static';

const BASE = process.env.NEXT_PUBLIC_BASE ?? '';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Scarprint',
    short_name: 'Scarprint',
    description: DESCRICAO_SITE,
    start_url: '/',
    display: 'browser',
    theme_color: '#2760A2',
    background_color: '#f7f8fa',
    icons: [
      { src: `${BASE}/icone-192.png`, sizes: '192x192', type: 'image/png' },
      { src: `${BASE}/icone-512.png`, sizes: '512x512', type: 'image/png' },
    ],
  };
}
