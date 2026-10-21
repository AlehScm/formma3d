import type { MetadataRoute } from 'next';
import { urlAbsoluta } from '@/lib/seo';

export const dynamic = 'force-static';

// Tudo liberado: o que nao deve ir para o Google tem noindex na propria pagina (bloquear
// aqui esconderia o noindex).
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/' }, sitemap: urlAbsoluta('sitemap.xml') };
}
