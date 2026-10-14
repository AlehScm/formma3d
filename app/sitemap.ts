import type { MetadataRoute } from 'next';
import { caminhosIndexaveis } from '@/lib/marketplace/indexacao';
import { urlAbsoluta } from '@/lib/seo';

// Export estatico: gerado uma vez no build (sitemap.xml).
export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  return caminhosIndexaveis().map((caminho) => ({ url: urlAbsoluta(caminho) }));
}
