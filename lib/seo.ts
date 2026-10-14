/**
 * SEO da loja: URL publica do site, metadados por pagina (canonical, Open Graph, Twitter) e
 * os blocos JSON-LD. Puro e sem importar o cadastro (nada de produto oculto vem junto).
 * A URL do site vem do next.config (NEXT_PUBLIC_SITE_URL); fora do Next, o dev local.
 */
import type { Metadata } from 'next';
import type { Produto } from './marketplace/tipos';
import { SECOES } from './marketplace/tipos';

export const NOME = 'Scarprint';
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3111').replace(/\/+$/, '');

/** Endereco absoluto de uma pagina ou arquivo do site (`/produto/x`, `marketplace/x/1.jpg`). */
export const urlAbsoluta = (caminho: string) => `${SITE_URL}/${caminho.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/')}`;

export const DESCRICAO_SITE = 'Peças impressas em 3D sob medida: decoração, presentes com nome, letreiros e placas para empresas. Personalize, veja em 3D e peça orçamento.';

export const IMAGEM_SOCIAL = { url: urlAbsoluta('og/scarprint.png'), width: 1200, height: 630, alt: `${NOME}: peças impressas em 3D sob medida` };

/** Corta na ultima palavra que cabe em `max` caracteres (descricao de busca: ate ~160). */
export function resumir(texto: string, max = 160): string {
  const t = texto.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const corte = t.slice(0, max - 1);
  const espaco = corte.lastIndexOf(' ');
  return `${(espaco > 0 ? corte.slice(0, espaco) : corte).replace(/[\s,.;:]+$/, '')}…`;
}

interface Pagina {
  titulo: string;
  descricao: string;
  caminho: string;
  /** Sem o "| Scarprint" do template (titulo da home). */
  tituloAbsoluto?: boolean;
  imagem?: { url: string; width?: number; height?: number; alt?: string };
  /** `false`: fora do Google (noindex), mas os links continuam sendo seguidos. */
  indexar?: boolean;
}

/**
 * Metadados de uma pagina. O Open Graph do filho substitui o do pai inteiro no Next (as
 * imagens nao sao herdadas), entao imagem, nome do site e idioma vao sempre explicitos.
 */
export function metadadosPagina({ titulo, descricao, caminho, tituloAbsoluto, imagem = IMAGEM_SOCIAL, indexar = true }: Pagina): Metadata {
  const tituloCompleto = tituloAbsoluto ? titulo : `${titulo} | ${NOME}`;
  const description = resumir(descricao);
  const url = urlAbsoluta(caminho);
  return {
    title: tituloAbsoluto ? { absolute: titulo } : titulo,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'website', locale: 'pt_BR', siteName: NOME, url, title: tituloCompleto, description, images: [imagem] },
    twitter: { card: 'summary_large_image', title: tituloCompleto, description, images: [imagem.url] },
    ...(indexar ? {} : { robots: { index: false, follow: true } }),
  };
}

/** Metadados so para tirar a pagina do Google (busca, orcamento, paginas internas). */
export const naoIndexar = (titulo: string, descricao?: string): Metadata => ({ title: titulo, ...(descricao ? { description: descricao } : {}), robots: { index: false, follow: true } });

/**
 * Descricao de busca do produto: o paragrafo e, por prioridade, o que couber em 160 sem
 * cortar frase (impressao 3D, o que da para escolher, convite ao orcamento).
 */
export function descricaoDoProduto(p: Produto): string {
  const extras = ['Impressão 3D sob medida.', p.personalizavel.length ? `Você escolhe: ${p.personalizavel.join(', ').toLowerCase()}.` : '', 'Peça orçamento.'];
  return resumir(extras.reduce((d, extra) => (extra && `${d} ${extra}`.length <= 160 ? `${d} ${extra}` : d), p.descricao));
}

// ---- JSON-LD (schema.org) ----

type Ld = Record<string, unknown>;

export function ldLoja(): Ld {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': `${urlAbsoluta('/')}#organizacao`, name: NOME, url: urlAbsoluta('/'), logo: urlAbsoluta('og/scarprint-logo.png'), description: DESCRICAO_SITE },
      { '@type': 'WebSite', '@id': `${urlAbsoluta('/')}#site`, name: NOME, url: urlAbsoluta('/'), inLanguage: 'pt-BR', publisher: { '@id': `${urlAbsoluta('/')}#organizacao` } },
    ],
  };
}

/** Trilha de navegacao, igual a que aparece na pagina. */
export function ldTrilha(itens: { nome: string; caminho: string }[]): Ld {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: itens.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.nome, item: urlAbsoluta(it.caminho) })),
  };
}

/**
 * Produto so com preco definido: sem oferta o Google acusa o bloco incompleto, e preco
 * inventado nao entra. Com o preco validado, o bloco liga sozinho.
 */
export function ldProduto(p: Produto): Ld | null {
  if (p.preco.status !== 'definido') return null;
  const url = urlAbsoluta(`/produto/${p.slug}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.nome,
    description: p.descricao,
    category: `${SECOES[p.secao].nome} > ${p.tipo}`,
    brand: { '@type': 'Brand', name: NOME },
    url,
    ...(p.midias.length ? { image: p.midias.map((m) => urlAbsoluta(m)) } : {}),
    offers: { '@type': 'Offer', price: p.preco.valor.toFixed(2), priceCurrency: 'BRL', availability: 'https://schema.org/MadeToOrder', url },
  };
}
