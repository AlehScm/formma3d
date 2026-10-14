import type { MetadataRoute } from 'next';
import { urlAbsoluta } from '@/lib/seo';

export const dynamic = 'force-static';

// Tudo liberado: o que nao deve ir para o Google tem noindex na propria pagina (bloquear
// aqui esconderia o noindex). No GitHub Pages o robots fica em /formma3d e so vale com
// dominio proprio; o sitemap vale pelo Search Console mesmo assim.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/' }, sitemap: urlAbsoluta('sitemap.xml') };
}
