/**
 * Aviso imediato ao Bing (e aos outros buscadores do IndexNow) das paginas que entraram ou
 * sairam do sitemap. O `publicar.mjs` chama a cada publicacao, comparando o sitemap no ar com
 * o novo. O Google nao usa IndexNow: ele le o sitemap sozinho de tempos em tempos.
 * A chave e publica por natureza (`public/<chave>.txt`, servida na raiz do site): so prova que
 * o aviso vem de quem controla o dominio.
 *   node scripts/indexnow.mjs <url> [url...]   (avisa a mao, se a publicacao nao conseguiu)
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const CHAVE_INDEXNOW = '28c9b96e2f64ee3e87cd8f38b9c695a6';
/** https://<dominio> do public/CNAME, o mesmo que o Pages serve. */
export const SITE = `https://${readFileSync(new URL('../public/CNAME', import.meta.url), 'utf8').trim()}`;

export const urlsDoSitemap = (xml) => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);

/** Paginas novas e removidas, nesta ordem (removida o buscador confere e tira do indice). */
export function mudancas(antes, depois) {
  const a = new Set(antes), d = new Set(depois);
  return [...depois.filter((u) => !a.has(u)), ...antes.filter((u) => !d.has(u))];
}

/** URLs do sitemap no ar, ou null se nao deu para ler. O `?v=` fura o cache do Pages. */
export async function sitemapNoAr(site = SITE) {
  try {
    const r = await fetch(`${site}/sitemap.xml?v=${Date.now()}`, { cache: 'no-store' });
    return r.ok ? urlsDoSitemap(await r.text()) : null;
  } catch {
    return null;
  }
}

/** Espera o sitemap no ar ficar igual ao `esperado` (versao nova publicada). */
export async function esperarNoAr(esperado, { site = SITE, limiteMs = 10 * 60_000, passoMs = 20_000 } = {}) {
  const alvo = [...esperado].sort().join('\n');
  for (const fim = Date.now() + limiteMs; Date.now() < fim; await new Promise((r) => setTimeout(r, passoMs))) {
    const atual = await sitemapNoAr(site);
    if (atual && [...atual].sort().join('\n') === alvo) return true;
  }
  return false;
}

/** 200 = recebido; 202 = recebido, chave ainda em conferencia (normal na primeira vez). */
export async function avisarIndexNow(urls, site = SITE) {
  const r = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: new URL(site).host, key: CHAVE_INDEXNOW, keyLocation: `${site}/${CHAVE_INDEXNOW}.txt`, urlList: urls }),
  });
  return r.status;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const urls = process.argv.slice(2);
  if (!urls.length) throw new Error('uso: node scripts/indexnow.mjs <url> [url...]');
  console.log(`IndexNow: ${await avisarIndexNow(urls)} (${urls.length} paginas)`);
}
