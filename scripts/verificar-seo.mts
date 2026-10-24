/**
 * SEO da loja: o sitemap so leva pagina publica (nada oculto, de terceiro sem licenca ou de
 * campanha desligada), URLs absolutas, descricoes no tamanho e sem promessa inventada,
 * JSON-LD sem dado inventado e as paginas internas com noindex.
 *   npx tsx scripts/verificar-seo.mts
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { renderToStaticMarkup } from 'react-dom/server';
import { JsonLd } from '../components/seo/JsonLd';
import { FERRAMENTAS, caminhosIndexaveis } from '../lib/marketplace/indexacao';
import { PRODUTOS, porSecao, produtosPublicos, type Produto } from '../lib/marketplace/index';
import { ORDEM_SECOES } from '../lib/marketplace/tipos';
import { CAMPANHAS, campanhaAtiva } from '../lib/marketplace/campanhas';
import { DESCRICAO_SITE, IMAGEM_SOCIAL, SITE_URL, descricaoDoProduto, ldLoja, ldProduto, ldTrilha, metadadosPagina, naoIndexar, resumir, urlAbsoluta } from '../lib/seo';
import { CHAVE_INDEXNOW, SITE as SITE_INDEXNOW, urlsDoSitemap } from './indexnow.mjs';
import { arquivoDoCaminho, assinatura, comLastmod, conferirSaida, datarSitemap, datasDoSitemap, leitura } from './seo-saida.mjs';

let falhas = 0, total = 0;
const ok = (nome: string, cond: boolean, detalhe = '') => {
  total++;
  if (!cond) falhas++;
  console.log(`${cond ? '  ok   ' : ' FALHA '} ${nome}${detalhe ? `  -> ${detalhe}` : ''}`);
};

// ---- sitemap ----
const caminhos = caminhosIndexaveis();
const publicos = produtosPublicos();
const ocultos = PRODUTOS.filter((p) => !publicos.includes(p));
ok('sitemap sem repeticao', new Set(caminhos).size === caminhos.length);
ok('sitemap tem home, todas as pecas e as ferramentas', ['/', '/pecas', ...FERRAMENTAS].every((c) => caminhos.includes(c)));
ok('sitemap tem todo produto publico', publicos.every((p) => caminhos.includes(`/produto/${p.slug}`)), publicos.filter((p) => !caminhos.includes(`/produto/${p.slug}`)).map((p) => p.slug).join(', '));
ok('sitemap sem produto oculto ou de terceiro sem licenca', ocultos.length > 0 && ocultos.every((p) => !caminhos.includes(`/produto/${p.slug}`)), ocultos.filter((p) => caminhos.includes(`/produto/${p.slug}`)).map((p) => p.slug).join(', '));
const terceiro = PRODUTOS.find((p) => p.origem === 'terceiros' && p.licenca !== 'comercial-ok')!;
ok('terceiro sem licenca fora do sitemap mesmo marcado publico', !caminhosIndexaveis([{ ...terceiro, visibilidade: 'publico' }]).includes(`/produto/${terceiro.slug}`));
ok('sitemap so com secoes que tem peca publica', ORDEM_SECOES.every((s) => caminhos.includes(`/secao/${s}`) === porSecao(s).length > 0));
ok('Sensoriais (sem peca publica) fora do sitemap', !caminhos.includes('/secao/sensoriais'));
ok('sitemap sem busca, orcamento, guia interno e enderecos antigos', !caminhos.some((c) => /^\/(busca|orcamento|sistema|moldes)\b/.test(c)));
ok('Natal sempre no sitemap, com a campanha ligada ou nao', caminhos.includes(CAMPANHAS.natal.href));
const semNatal = caminhosIndexaveis(PRODUTOS, () => false), comNatal = caminhosIndexaveis(PRODUTOS, () => true);
const soDoNatal = PRODUTOS.filter((p) => p.campanha === 'natal');
ok('campanha desligada: /natal fica, mas sem peca so de Natal', semNatal.includes('/natal') && soDoNatal.length > 0 && soDoNatal.every((p) => !semNatal.includes(`/produto/${p.slug}`)));
ok('campanha ligada: /natal no sitemap', comNatal.includes('/natal'));
ok('icones do site e manifest existem', ['app/favicon.ico', 'app/apple-icon.png', 'public/icone-192.png', 'public/icone-512.png', 'app/manifest.ts'].every((f) => fs.existsSync(f)), ['app/favicon.ico', 'app/apple-icon.png', 'public/icone-192.png', 'public/icone-512.png', 'app/manifest.ts'].filter((f) => !fs.existsSync(f)).join(', '));
const sitemap = fs.readFileSync('app/sitemap.ts', 'utf8'), robots = fs.readFileSync('app/robots.ts', 'utf8');
ok('sitemap e robots estaticos (export) e com URL absoluta', [sitemap, robots].every((t) => /export const dynamic = 'force-static'/.test(t) && /urlAbsoluta\(/.test(t)) && /caminhosIndexaveis\(\)/.test(sitemap));
ok('robots nao bloqueia pagina (noindex fica na pagina)', !/disallow/i.test(robots) && /sitemap: urlAbsoluta\('sitemap\.xml'\)/.test(robots));

// ---- URLs ----
ok('URL absoluta a partir do endereco do site', urlAbsoluta('/pecas') === `${SITE_URL}/pecas` && urlAbsoluta('/') === `${SITE_URL}/` && urlAbsoluta('marketplace/a b/1.jpg') === `${SITE_URL}/marketplace/a%20b/1.jpg`);
ok('endereco do site sem barra no fim', !SITE_URL.endsWith('/'));
const config = fs.readFileSync('next.config.mjs', 'utf8');
const cname = fs.readFileSync('public/CNAME', 'utf8').trim();
ok('next.config passa a URL do dominio proprio, o mesmo do public/CNAME', config.includes(`'https://${cname}'`) && /NEXT_PUBLIC_SITE_URL: site/.test(config) && /const base = ''/.test(config));

// ---- IndexNow (aviso ao Bing a cada publicacao) ----
const arquivoChave = `public/${CHAVE_INDEXNOW}.txt`;
ok('IndexNow: chave valida, com arquivo na raiz do site contendo a propria chave', /^[a-zA-Z0-9-]{8,128}$/.test(CHAVE_INDEXNOW) && fs.existsSync(arquivoChave) && fs.readFileSync(arquivoChave, 'utf8').trim() === CHAVE_INDEXNOW);
ok('IndexNow: avisa pelo dominio do public/CNAME', SITE_INDEXNOW === `https://${cname}`);
ok('IndexNow: le as URLs do sitemap', JSON.stringify(urlsDoSitemap('<urlset><url><loc>https://a.b/</loc></url><url><loc> https://a.b/x </loc></url></urlset>')) === JSON.stringify(['https://a.b/', 'https://a.b/x']));
const publicar = fs.readFileSync('scripts/publicar.mjs', 'utf8');
const posPush = (trecho: string) => publicar.includes(trecho) && publicar.indexOf("git('push'") < publicar.indexOf(trecho);
const antesDoPush = (trecho: string) => publicar.includes(trecho) && publicar.indexOf(trecho) < publicar.indexOf("git('push'");
ok('publicar: trava de SEO e datas do sitemap antes do push; IndexNow depois', antesDoPush('conferirSaida(SAIDA)') && antesDoPush('if (seo.erros.length) throw') && antesDoPush('comLastmod(') && antesDoPush('removidas.length > 5') && posPush('avisarIndexNow(avisar)'));
ok('publicar roda os testes de SEO', /'verificar-seo'/.test(publicar));

// ---- site gerado: trava de SEO e datas do sitemap (scripts/seo-saida.mjs) ----
const S = 'https://exemplo.com.br';
type Opcoes = { titulo?: string; descricao?: string | null; canonical?: string | null; robots?: string; lang?: string; corpo?: string; script?: string; ld?: string };
const pagina = (caminho: string, o: Opcoes = {}) => `<!DOCTYPE html><html lang="${o.lang ?? 'pt-BR'}"><head><meta charSet="utf-8"/><title>${o.titulo ?? `Pagina ${caminho}`}</title>${o.descricao === null ? '' : `<meta name="description" content="${o.descricao ?? `Descri&#x27;cao da pagina ${caminho}, comprida o bastante para passar.`}"/>`}${o.robots ? `<meta name="robots" content="${o.robots}"/>` : ''}${o.canonical === null ? '' : `<link rel="canonical" href="${o.canonical ?? (caminho === '/' ? S : `${S}${caminho}`)}"/>`}<meta property="og:image" content="${S}/og.png"/><script>self.__next_f.push([1,"${o.script ?? 'build-1'}"])</script>${o.ld ? `<script type="application/ld+json">${o.ld}</script>` : ''}</head><body><h1 class="a">Título</h1>${o.corpo ?? '<a href="/pecas">Peças</a><a href="/produto/a?cor=azul#topo">A</a><a href="https://wa.me/1">Zap</a><img src="/a.png" alt="A"/><img src="/b.png" alt=""/>'}</body></html>`;
const BASE: Record<string, string> = {
  'index.html': pagina('/'),
  'pecas.html': pagina('/pecas'),
  'produto/a.html': pagina('/produto/a', { ld: '{"@type":"Product"}' }),
  'busca.html': pagina('/busca', { robots: 'noindex, follow' }),
  '404.html': '<html lang="pt-BR"><title>404</title></html>',
  'robots.txt': `User-Agent: *\nAllow: /\n\nSitemap: ${S}/sitemap.xml\n`,
  'sitemap.xml': `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url>\n<loc>${S}/</loc>\n</url>\n<url>\n<loc>${S}/pecas</loc>\n</url>\n<url>\n<loc>${S}/produto/a</loc>\n</url>\n</urlset>\n`,
};
const raizTeste = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-saida-'));
let nTeste = 0;
const montar = (troca: Record<string, string | null> = {}) => {
  const dir = path.join(raizTeste, String(nTeste++));
  for (const [arq, txt] of Object.entries({ ...BASE, ...troca })) {
    if (txt === null) continue;
    fs.mkdirSync(path.dirname(path.join(dir, arq)), { recursive: true });
    fs.writeFileSync(path.join(dir, arq), txt);
  }
  fs.mkdirSync(path.join(dir, 'produto', 'a'), { recursive: true }); // pasta de prefetch ao lado da pagina, como no export
  return dir;
};
const erros = (troca: Record<string, string | null>) => conferirSaida(montar(troca), S).erros.join('\n');
const limpo = conferirSaida(montar(), S);
ok('trava de SEO: site certo passa sem erro nem aviso', limpo.erros.length === 0 && limpo.avisos.length === 0 && limpo.urls.length === 3, [...limpo.erros, ...limpo.avisos].join(' | '));
ok('trava de SEO: pega noindex numa pagina do sitemap', /noindex/.test(erros({ 'pecas.html': pagina('/pecas', { robots: 'noindex' }) })));
ok('trava de SEO: pega canonical errado ou ausente', /canonical/.test(erros({ 'pecas.html': pagina('/pecas', { canonical: `${S}/` }) })) && /canonical ausente/.test(erros({ 'pecas.html': pagina('/pecas', { canonical: null }) })));
ok('trava de SEO: pega pagina sem titulo, sem descricao ou em outro idioma', /titulos/.test(erros({ 'pecas.html': pagina('/pecas', { titulo: '' }) })) && /meta description/.test(erros({ 'pecas.html': pagina('/pecas', { descricao: null }) })) && /idioma en/.test(erros({ 'pecas.html': pagina('/pecas', { lang: 'en' }) })));
ok('trava de SEO: pega link interno quebrado (e aceita externo, ancora e ?query)', /link quebrado para \/sumiu/.test(erros({ 'pecas.html': pagina('/pecas', { corpo: '<a href="/sumiu">x</a><a href="#topo">t</a><a href="/produto/a?x=1">a</a>' }) })) && !/link quebrado/.test(erros({})));
ok('trava de SEO: pega link para pasta de prefetch (nao e pagina)', /link quebrado para \/produto\/a\//.test(erros({ 'pecas.html': pagina('/pecas', { corpo: '<a href="/produto/a/">x</a>' }) })));
ok('trava de SEO: pega imagem sem alt (alt="" de enfeite pode)', /imagem sem alt: \/c\.png/.test(erros({ 'pecas.html': pagina('/pecas', { corpo: '<img src="/c.png"/><img src="/d.png" alt=""/>' }) })));
ok('trava de SEO: pega JSON-LD invalido', /JSON-LD invalido/.test(erros({ 'produto/a.html': pagina('/produto/a', { ld: '{"@type":' }) })));
ok('trava de SEO: pega titulo repetido', /titulo repetido/.test(erros({ 'pecas.html': pagina('/pecas', { titulo: 'Pagina /' }) })));
ok('trava de SEO: pega pagina do sitemap que nao existe', /\/produto\/a: esta no sitemap mas a pagina nao existe/.test(erros({ 'produto/a.html': null })));
ok('trava de SEO: pega robots.txt bloqueando tudo ou sem sitemap', /bloqueia o site inteiro/.test(erros({ 'robots.txt': `User-Agent: *\nDisallow: /\nSitemap: ${S}/sitemap.xml\n` })) && /robots\.txt sem/.test(erros({ 'robots.txt': 'User-Agent: *\nAllow: /\n' })));
ok('trava de SEO: pega sitemap com URL de outro site ou sem 404', /fora do site/.test(erros({ 'sitemap.xml': BASE['sitemap.xml']!.replace(`${S}/pecas`, 'https://outro.com/pecas') })) && /404\.html/.test(erros({ '404.html': null })));
ok('trava de SEO: avisa (sem travar) descricao curta e pagina sem h1', (() => { const r = conferirSaida(montar({ 'pecas.html': pagina('/pecas', { descricao: 'Curta.', corpo: '<p>sem h1</p>' }).replace(/<h1[^]*?<\/h1>/, '') }), S); return r.erros.length === 0 && r.avisos.some((a) => /descricao com 6/.test(a)) && r.avisos.some((a) => /0 titulos h1/.test(a)); })());

const basePagina = pagina('/pecas');
ok('assinatura: igual quando so muda o que o buscador nao le (scripts do build, classes)', assinatura(basePagina) === assinatura(pagina('/pecas', { script: 'build-2' }).replace('class="a"', 'class="b"')));
ok('assinatura: muda com texto, titulo, descricao, imagem, link ou JSON-LD', [pagina('/pecas', { corpo: '<p>outro texto</p>' }), pagina('/pecas', { titulo: 'Outro' }), pagina('/pecas', { descricao: 'Outra descricao qualquer, tambem comprida o bastante.' }), basePagina.replace('/a.png', '/a2.png'), basePagina.replace('href="/pecas"', 'href="/criar"'), pagina('/pecas', { ld: '{}' })].every((h) => assinatura(h) !== assinatura(basePagina)));
ok('leitura: desfaz entidades do HTML (descricao e texto)', leitura(pagina('/x')).descricao === "Descri'cao da pagina /x, comprida o bastante para passar." && leitura(pagina('/x')).texto.includes('Título'));

const xmlCom = comLastmod(BASE['sitemap.xml']!, new Map([[`${S}/`, '2026-01-02T03:04:05Z'], [`${S}/pecas`, '']]));
ok('sitemap: lastmod logo depois do loc, so onde tem data, e le de volta', /<loc>https:\/\/exemplo\.com\.br\/<\/loc>\n<lastmod>2026-01-02T03:04:05Z<\/lastmod>/.test(xmlCom) && (xmlCom.match(/<lastmod>/g) ?? []).length === 1 && datasDoSitemap(xmlCom).get(`${S}/`) === '2026-01-02T03:04:05Z' && datasDoSitemap(xmlCom).get(`${S}/pecas`) === '');
ok('sitemap: lastmod nao duplica se ja tinha', (comLastmod(xmlCom, new Map([[`${S}/`, '2026-02-02T00:00:00Z']])).match(/<lastmod>/g) ?? []).length === 1);

const agora = new Date('2026-10-23T12:00:00.000Z');
const noAr = `<urlset><url><loc>${S}/</loc><lastmod>2026-01-01T00:00:00Z</lastmod></url><url><loc>${S}/pecas</loc></url><url><loc>${S}/sumiu</loc><lastmod>2026-01-01T00:00:00Z</lastmod></url></urlset>`;
const xmlNovo = BASE['sitemap.xml']!;
const dirDatas = montar();
const igualAoNovo = (url: string) => fs.readFileSync(arquivoDoCaminho(dirDatas, url.slice(S.length))!, 'utf8');
const d1 = await datarSitemap({ pasta: dirDatas, xmlNovo, xmlNoAr: noAr, agora, site: S, baixar: async (url: string) => (url === `${S}/pecas` ? pagina('/pecas', { titulo: 'Velho' }) : igualAoNovo(url)) });
ok('datas: igual mantem a data, alterada e nova ganham agora, removida aparece', d1.datas.get(`${S}/`) === '2026-01-01T00:00:00Z' && d1.datas.get(`${S}/pecas`) === '2026-10-23T12:00:00Z' && d1.datas.get(`${S}/produto/a`) === '2026-10-23T12:00:00Z' && JSON.stringify([d1.novas, d1.mudaram, d1.removidas]) === JSON.stringify([[`${S}/produto/a`], [`${S}/pecas`], [`${S}/sumiu`]]));
const d2 = await datarSitemap({ pasta: dirDatas, xmlNovo, xmlNoAr: noAr.replace(`<loc>${S}/pecas</loc>`, `<loc>${S}/pecas</loc><lastmod>2026-05-05T00:00:00Z</lastmod>`), agora, site: S, baixar: async () => null });
ok('datas: sem conseguir baixar a pagina, mantem a data que tinha e nao avisa', d2.datas.get(`${S}/`) === '2026-01-01T00:00:00Z' && d2.datas.get(`${S}/pecas`) === '2026-05-05T00:00:00Z' && d2.mudaram.length === 0);
const d3 = await datarSitemap({ pasta: dirDatas, xmlNovo, xmlNoAr: null, agora, site: S, baixar: async () => { throw new Error('nao devia baixar'); } });
ok('datas: sem o sitemap no ar, nenhuma data (melhor sem lastmod que com data errada)', d3.datas.size === 0 && d3.novas.length + d3.mudaram.length + d3.removidas.length === 0);
fs.rmSync(raizTeste, { recursive: true, force: true });

// ---- textos ----
const PROMESSA = /frete|gr[aá]tis|entrega|prazo|\d+\s*dias|garantia|avalia[cç][aã]o|estrelas|★|mais vendid/i;
ok('resumir nao mexe em texto curto', resumir('  Uma  frase   curta. ') === 'Uma frase curta.');
const longo = resumir('palavra '.repeat(40));
ok('resumir corta na palavra, ate 160, com reticencias', longo.length <= 160 && longo.endsWith('…') && !/\s…$/.test(longo) && longo.replace('…', '').split(' ').every((w) => w === 'palavra'));
const descricoes = publicos.map((p) => ({ p, d: descricaoDoProduto(p) }));
ok('descricao de todo produto publico com 50 a 160 caracteres', descricoes.every(({ d }) => d.length >= 50 && d.length <= 160), descricoes.filter(({ d }) => d.length < 50 || d.length > 160).map(({ p, d }) => `${p.slug}=${d.length}`).join(', '));
ok('descricao do produto sem promessa inventada (fora o que ja e do produto)', descricoes.every(({ p, d }) => !PROMESSA.test(d) || PROMESSA.test(p.descricao + p.personalizavel.join())));
const textosSeo = [DESCRICAO_SITE, IMAGEM_SOCIAL.alt, fs.readFileSync('lib/seo.ts', 'utf8'), ...['pecas', 'criar', 'design', 'editor', 'secao/[slug]', 'produto/[slug]', 'natal'].map((r) => fs.readFileSync(`app/${r}/page.tsx`, 'utf8').match(/metadadosPagina\(\{[\s\S]*?\}\)/g)?.join('\n') ?? '')];
ok('textos de SEO sem frete, prazo, garantia ou avaliacao inventados', textosSeo.every((t) => !PROMESSA.test(t.replace(/promessa inventada/gi, ''))));
ok('descricao do site ate 160', DESCRICAO_SITE.length <= 160);

// ---- metadados ----
const m = metadadosPagina({ titulo: 'Teste', descricao: 'Uma descrição de teste.', caminho: '/pecas' });
const og = m.openGraph as { url?: string; images?: { url: string }[]; locale?: string; siteName?: string; title?: string };
ok('pagina: canonical absoluto e igual ao og:url', m.alternates?.canonical === `${SITE_URL}/pecas` && og.url === `${SITE_URL}/pecas`);
ok('pagina: og com imagem explicita, pt_BR e nome do site (o Next nao herda imagem do pai)', og.images?.[0]?.url === IMAGEM_SOCIAL.url && og.locale === 'pt_BR' && og.siteName === 'Scarprint' && og.title === 'Teste | Scarprint');
ok('pagina: indexavel por padrao; indexar:false vira noindex,follow', !m.robots && JSON.stringify(metadadosPagina({ titulo: 'x', descricao: 'y', caminho: '/', indexar: false }).robots) === JSON.stringify({ index: false, follow: true }));
ok('naoIndexar: noindex mas segue os links', JSON.stringify(naoIndexar('x').robots) === JSON.stringify({ index: false, follow: true }));
ok('titulo absoluto nao leva o template', JSON.stringify(metadadosPagina({ titulo: 'Home', descricao: 'd', caminho: '/', tituloAbsoluto: true }).title) === JSON.stringify({ absolute: 'Home' }));
const paginas = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? paginas(`${dir}/${e.name}`) : /^(page|layout|not-found)\.tsx$/.test(e.name) ? [`${dir}/${e.name}`] : []));
const fontes = paginas('app').map((f) => ({ f, t: fs.readFileSync(f, 'utf8') }));
ok('nenhum titulo repete "| Scarprint" (o template ja poe)', fontes.every(({ t }) => !/\| Scarprint['`]/.test(t)), fontes.filter(({ t }) => /\| Scarprint['`]/.test(t)).map(({ f }) => f).join(', '));
for (const rota of ['app/busca/page.tsx', 'app/orcamento/page.tsx', 'app/sistema/layout.tsx', 'app/moldes/[id]/page.tsx']) {
  ok(`${rota}: noindex`, /naoIndexar\(/.test(fs.readFileSync(rota, 'utf8')));
}
ok('secao vazia com noindex', /indexar: porSecao\(slug\)\.length > 0/.test(fs.readFileSync('app/secao/[slug]/page.tsx', 'utf8')));
const raiz = fs.readFileSync('app/layout.tsx', 'utf8');
ok('layout raiz: metadataBase, template de titulo, og e theme-color', /metadataBase: new URL\(SITE_URL\)/.test(raiz) && /template: `%s \| \$\{NOME\}`/.test(raiz) && /images: \[IMAGEM_SOCIAL\]/.test(raiz) && /themeColor/.test(raiz));
ok('imagens de SEO existem em public/og', fs.existsSync('public/og/scarprint.png') && fs.existsSync('public/og/scarprint-logo.png') && IMAGEM_SOCIAL.url === urlAbsoluta('og/scarprint.png'));

// ---- JSON-LD ----
const base: Produto = { ...publicos[0]!, midias: [], preco: { status: 'validacao' } };
ok('sem preco validado nao sai Product (nada inventado)', ldProduto(base) === null && publicos.every((p) => p.preco.status !== 'validacao' || ldProduto(p) === null));
const comPreco = ldProduto({ ...base, preco: { status: 'definido', valor: 49.9 }, midias: ['marketplace/x/1.jpg'] }) as { offers: Record<string, string>; image: string[]; brand: { name: string } };
ok('com preco: oferta em BRL, sob encomenda, com foto absoluta', comPreco.offers.price === '49.90' && comPreco.offers.priceCurrency === 'BRL' && comPreco.offers.availability === 'https://schema.org/MadeToOrder' && comPreco.image[0] === `${SITE_URL}/marketplace/x/1.jpg` && comPreco.brand.name === 'Scarprint');
ok('com preco e sem foto: Product sem image', !('image' in (ldProduto({ ...base, preco: { status: 'definido', valor: 10 } }) ?? {})));
const trilha = ldTrilha([{ nome: 'Início', caminho: '/' }, { nome: 'Casa', caminho: '/secao/casa' }]) as { itemListElement: { position: number; item: string }[] };
ok('trilha numerada a partir de 1 com URL absoluta', trilha.itemListElement.map((i) => `${i.position}:${i.item}`).join() === `1:${SITE_URL}/,2:${SITE_URL}/secao/casa`);
const loja = JSON.stringify(ldLoja());
ok('home: Organization e WebSite com logo PNG', /"Organization"/.test(loja) && /"WebSite"/.test(loja) && loja.includes(urlAbsoluta('og/scarprint-logo.png')) && /"inLanguage":"pt-BR"/.test(loja));
const html = renderToStaticMarkup(JsonLd({ dados: { nome: '</script><script>alert(1)</script>' } })!);
ok('JSON-LD escapa < (texto nao fecha o script)', !html.includes('</script><script>') && html.includes('\\u003c/script>') && html.startsWith('<script type="application/ld+json">'));
ok('JSON-LD nulo nao desenha nada', JsonLd({ dados: null }) === null);

console.log(`\n${total - falhas}/${total} passaram\n`);
if (falhas) process.exit(1);
