/**
 * SEO do site gerado (a pasta do export), usado pelo `publicar.mjs`:
 * - conferirSaida: trava a publicacao se uma pagina do sitemap sair sem titulo ou descricao,
 *   com canonical errado, com noindex, com link interno quebrado, JSON-LD invalido ou imagem
 *   sem alt, ou se o robots.txt bloquear o site.
 * - assinatura: o que o buscador le de uma pagina (titulo, descricao, texto, imagens, links,
 *   JSON-LD), sem o que muda a cada build (scripts, ids, classes). Mudou a assinatura, a
 *   pagina mudou de verdade.
 * - datarSitemap / comLastmod: cada pagina do sitemap leva a data da ultima mudanca de
 *   verdade (lastmod), comparando o site novo com o que esta no ar. O Google usa essa data
 *   para escolher o que reler primeiro, mas so enquanto ela for confiavel.
 *   node scripts/seo-saida.mjs [pasta]   (confere sem publicar; padrao: .publicar)
 */
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { SITE, urlsDoSitemap } from './indexnow.mjs';

const ENTIDADES = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
export const desescapar = (s) =>
  s.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (m, e) => (e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENTIDADES[e.toLowerCase()] ?? m));

/** Atributos de uma tag (`<meta name="x" content="y"/>` -> { name, content }); sem valor = ''. */
export function atributos(tag) {
  const corpo = tag.replace(/^<[\w-]+/, '').replace(/\/?>$/, '');
  return Object.fromEntries([...corpo.matchAll(/([^\s=]+)(?:\s*=\s*"([^"]*)")?/g)].map((m) => [m[1].toLowerCase(), desescapar(m[2] ?? '')]));
}
const tags = (html, nome) => [...html.matchAll(new RegExp(`<${nome}\\b[^>]*>`, 'gi'))].map((m) => atributos(m[0]));
const meta = (html, chave, valor) => tags(html, 'meta').find((a) => a[chave] === valor)?.content;

/** O que importa para o buscador numa pagina. `alt` undefined = imagem sem o atributo. */
export function leitura(html) {
  const ld = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const corpo = html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<!--[\s\S]*?-->/g, '');
  const titulos = [...html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)].map((m) => desescapar(m[1]).trim());
  return {
    titulo: titulos[0] ?? '',
    titulos: titulos.length,
    descricao: meta(html, 'name', 'description'),
    robots: meta(html, 'name', 'robots') ?? '',
    canonical: tags(html, 'link').find((a) => a.rel === 'canonical')?.href,
    ogImagem: meta(html, 'property', 'og:image'),
    idioma: tags(html, 'html')[0]?.lang,
    h1: (corpo.match(/<h1\b/gi) ?? []).length,
    ld,
    imagens: tags(corpo, 'img').map((a) => ({ src: a.src, alt: a.alt })),
    links: tags(corpo, 'a').map((a) => a.href).filter(Boolean),
    texto: desescapar(corpo.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim(),
  };
}

export const assinatura = (html) => createHash('sha1').update(JSON.stringify(leitura(html))).digest('hex');

const ehArquivo = (p) => {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
};

/** Arquivo do export que o Pages serve para um caminho (`/pecas` -> pecas.html), ou null. */
export function arquivoDoCaminho(pasta, caminho) {
  const p = decodeURIComponent(caminho.split(/[?#]/)[0] || '/');
  if (p === '/') return ehArquivo(join(pasta, 'index.html')) ? join(pasta, 'index.html') : null;
  return [`${p}.html`, p, `${p}/index.html`].map((c) => join(pasta, c)).find(ehArquivo) ?? null;
}

/** Caminho interno de um href (`/x`, `https://<site>/x`), ou null se for externo/ancora. */
function caminhoInterno(href, site) {
  if (href.startsWith('/') && !href.startsWith('//')) return href;
  if (href === site || href.startsWith(`${site}/`) || href.startsWith(`${site}?`) || href.startsWith(`${site}#`)) return href.slice(site.length) || '/';
  return null;
}

/** `https://site` e `https://site/` sao o mesmo endereco. */
const mesmoEndereco = (url) => {
  try {
    return new URL(url).href;
  } catch {
    return url;
  }
};

/** Erros travam a publicacao; avisos so aparecem. */
export function conferirSaida(pasta = '.publicar', site = SITE) {
  const erros = [], avisos = [];
  const ler = (arq) => (ehArquivo(join(pasta, arq)) ? readFileSync(join(pasta, arq), 'utf8') : null);
  const xml = ler('sitemap.xml'), robots = ler('robots.txt');
  if (!xml) return { urls: [], erros: ['o build nao gerou sitemap.xml'], avisos };
  const urls = urlsDoSitemap(xml);
  if (!urls.length) erros.push('sitemap vazio');
  if (new Set(urls).size !== urls.length) erros.push('sitemap com URL repetida');
  if (!robots) erros.push('o build nao gerou robots.txt');
  else {
    if (!robots.includes(`Sitemap: ${site}/sitemap.xml`)) erros.push(`robots.txt sem "Sitemap: ${site}/sitemap.xml"`);
    if (/^\s*disallow:\s*\/\s*$/im.test(robots)) erros.push('robots.txt bloqueia o site inteiro (Disallow: /)');
  }
  if (!ler('404.html')) erros.push('o build nao gerou 404.html');

  const titulos = new Map(), descricoes = new Map(), quebrados = new Map();
  const juntar = (mapa, chave, valor) => mapa.set(chave, [...(mapa.get(chave) ?? []), valor]);
  for (const url of urls) {
    if (!url.startsWith(`${site}/`)) { erros.push(`sitemap com URL fora do site: ${url}`); continue; }
    const caminho = url.slice(site.length);
    const arquivo = arquivoDoCaminho(pasta, caminho);
    if (!arquivo) { erros.push(`${caminho}: esta no sitemap mas a pagina nao existe`); continue; }
    const l = leitura(readFileSync(arquivo, 'utf8'));
    const erro = (msg) => erros.push(`${caminho}: ${msg}`), aviso = (msg) => avisos.push(`${caminho}: ${msg}`);
    if (l.titulos !== 1 || !l.titulo) erro(`${l.titulos} titulos (precisa de exatamente 1, com texto)`);
    if (!l.descricao) erro('sem meta description');
    else if (l.descricao.length < 50 || l.descricao.length > 160) aviso(`descricao com ${l.descricao.length} caracteres (o ideal e 50 a 160)`);
    if (!l.canonical || mesmoEndereco(l.canonical) !== mesmoEndereco(url)) erro(`canonical ${l.canonical ?? 'ausente'} (precisa ser a propria pagina)`);
    if (/noindex/i.test(l.robots)) erro('noindex numa pagina do sitemap');
    if (l.idioma !== 'pt-BR') erro(`idioma ${l.idioma ?? 'ausente'} (precisa ser pt-BR)`);
    if (!l.ogImagem?.startsWith(`${site}/`)) erro(`og:image ${l.ogImagem ?? 'ausente'} (precisa ser imagem do site)`);
    if (l.h1 !== 1) aviso(`${l.h1} titulos h1 (o ideal e 1)`);
    for (const j of l.ld) {
      try { JSON.parse(j); } catch { erro('JSON-LD invalido'); }
    }
    const semAlt = l.imagens.filter((i) => i.alt === undefined).map((i) => i.src);
    if (semAlt.length) erro(`imagem sem alt: ${[...new Set(semAlt)].join(', ')}`);
    for (const href of new Set(l.links)) {
      const interno = caminhoInterno(href, site);
      if (interno !== null && !arquivoDoCaminho(pasta, interno)) juntar(quebrados, href, caminho);
    }
    juntar(titulos, l.titulo, caminho);
    if (l.descricao) juntar(descricoes, l.descricao, caminho);
  }
  for (const [href, paginas] of quebrados) erros.push(`link quebrado para ${href} (em ${paginas.length} pagina(s): ${paginas.slice(0, 3).join(', ')}${paginas.length > 3 ? '...' : ''})`);
  for (const [t, paginas] of titulos) if (paginas.length > 1) erros.push(`titulo repetido "${t}" em ${paginas.join(', ')}`);
  for (const [, paginas] of descricoes) if (paginas.length > 1) avisos.push(`descricao repetida em ${paginas.join(', ')}`);
  return { urls, erros, avisos };
}

/** url -> lastmod ('' se a url nao tinha data). */
export function datasDoSitemap(xml) {
  return new Map([...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => [m[1].match(/<loc>\s*([^<\s]+)\s*<\/loc>/)?.[1] ?? '', m[1].match(/<lastmod>\s*([^<\s]+)\s*<\/lastmod>/)?.[1] ?? '']));
}

/** O sitemap gerado pelo Next com <lastmod> depois de cada <loc> que tem data. */
export const comLastmod = (xml, datas) =>
  xml.replace(/<lastmod>[\s\S]*?<\/lastmod>\s*/g, '').replace(/<loc>\s*([^<\s]+)\s*<\/loc>/g, (m, url) => (datas.get(url) ? `${m}\n<lastmod>${datas.get(url)}</lastmod>` : m));

/** HTML da pagina no ar (sem cache do Pages), ou null se nao deu para ler. */
export async function paginaNoAr(url) {
  try {
    const r = await fetch(`${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`, { cache: 'no-store' });
    return r.ok ? await r.text() : null;
  } catch {
    return null;
  }
}

/**
 * Data de cada pagina do sitemap novo, comparando com o que esta no ar:
 * nova ou com assinatura diferente = `agora`; igual = a data que ja tinha (sem data ainda:
 * `agora`, uma vez so); nao deu para baixar = a data que ja tinha.
 * Sem o sitemap no ar (`xmlNoAr` null), nao data nada: melhor sem lastmod do que data errada.
 */
export async function datarSitemap({ pasta, xmlNovo, xmlNoAr, agora = new Date(), site = SITE, baixar = paginaNoAr }) {
  const urls = urlsDoSitemap(xmlNovo);
  const datas = new Map(), novas = [], mudaram = [];
  if (!xmlNoAr) return { datas, novas, mudaram, removidas: [] };
  const antes = datasDoSitemap(xmlNoAr);
  const hoje = agora.toISOString().replace(/\.\d{3}Z$/, 'Z');
  const fila = [...urls];
  const trabalhar = async () => {
    for (let url; (url = fila.shift()); ) {
      if (!antes.has(url)) { novas.push(url); datas.set(url, hoje); continue; }
      const noAr = await baixar(url);
      const arquivo = arquivoDoCaminho(pasta, url.slice(site.length));
      if (noAr !== null && arquivo && assinatura(noAr) !== assinatura(readFileSync(arquivo, 'utf8'))) { mudaram.push(url); datas.set(url, hoje); }
      else datas.set(url, antes.get(url) || hoje);
    }
  };
  await Promise.all(Array.from({ length: 8 }, trabalhar));
  const ordem = (a, b) => urls.indexOf(a) - urls.indexOf(b);
  return { datas, novas: novas.sort(ordem), mudaram: mudaram.sort(ordem), removidas: [...antes.keys()].filter((u) => u && !urls.includes(u)) };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const pasta = process.argv[2] ?? '.publicar';
  const { urls, erros, avisos } = conferirSaida(pasta);
  for (const a of avisos) console.log(`  aviso  ${a}`);
  for (const e of erros) console.log(`  ERRO   ${e}`);
  console.log(`\nSEO de ${pasta}: ${urls.length} paginas, ${erros.length} erro(s), ${avisos.length} aviso(s)`);
  if (erros.length) process.exit(1);
}
