/**
 * SEO da loja: o sitemap so leva pagina publica (nada oculto, de terceiro sem licenca ou de
 * campanha desligada), URLs absolutas, descricoes no tamanho e sem promessa inventada,
 * JSON-LD sem dado inventado e as paginas internas com noindex.
 *   npx tsx scripts/verificar-seo.mts
 */
import fs from 'fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { JsonLd } from '../components/seo/JsonLd';
import { FERRAMENTAS, caminhosIndexaveis } from '../lib/marketplace/indexacao';
import { PRODUTOS, porSecao, produtosPublicos, type Produto } from '../lib/marketplace/index';
import { ORDEM_SECOES } from '../lib/marketplace/tipos';
import { CAMPANHAS, campanhaAtiva } from '../lib/marketplace/campanhas';
import { DESCRICAO_SITE, IMAGEM_SOCIAL, SITE_URL, descricaoDoProduto, ldLoja, ldProduto, ldTrilha, metadadosPagina, naoIndexar, resumir, urlAbsoluta } from '../lib/seo';

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
ok('Natal no sitemap segue a chave da campanha', caminhos.includes(CAMPANHAS.natal.href) === campanhaAtiva('natal'));
const semNatal = caminhosIndexaveis(PRODUTOS, () => false), comNatal = caminhosIndexaveis(PRODUTOS, () => true);
const soDoNatal = PRODUTOS.filter((p) => p.campanha === 'natal');
ok('campanha desligada: sem /natal e sem peca so de Natal', !semNatal.includes('/natal') && soDoNatal.length > 0 && soDoNatal.every((p) => !semNatal.includes(`/produto/${p.slug}`)));
ok('campanha ligada: /natal no sitemap', comNatal.includes('/natal'));
const sitemap = fs.readFileSync('app/sitemap.ts', 'utf8'), robots = fs.readFileSync('app/robots.ts', 'utf8');
ok('sitemap e robots estaticos (export) e com URL absoluta', [sitemap, robots].every((t) => /export const dynamic = 'force-static'/.test(t) && /urlAbsoluta\(/.test(t)) && /caminhosIndexaveis\(\)/.test(sitemap));
ok('robots nao bloqueia pagina (noindex fica na pagina)', !/disallow/i.test(robots) && /sitemap: urlAbsoluta\('sitemap\.xml'\)/.test(robots));

// ---- URLs ----
ok('URL absoluta a partir do endereco do site', urlAbsoluta('/pecas') === `${SITE_URL}/pecas` && urlAbsoluta('/') === `${SITE_URL}/` && urlAbsoluta('marketplace/a b/1.jpg') === `${SITE_URL}/marketplace/a%20b/1.jpg`);
ok('endereco do site sem barra no fim', !SITE_URL.endsWith('/'));
const config = fs.readFileSync('next.config.mjs', 'utf8');
const cname = fs.readFileSync('public/CNAME', 'utf8').trim();
ok('next.config passa a URL do dominio proprio, o mesmo do public/CNAME', config.includes(`'https://${cname}'`) && /NEXT_PUBLIC_SITE_URL: site/.test(config) && /const base = ''/.test(config));

// ---- textos ----
const PROMESSA = /frete|gr[aá]tis|entrega|prazo|\d+\s*dias|garantia|avalia[cç][aã]o|estrelas|★|mais vendid/i;
ok('resumir nao mexe em texto curto', resumir('  Uma  frase   curta. ') === 'Uma frase curta.');
const longo = resumir('palavra '.repeat(40));
ok('resumir corta na palavra, ate 160, com reticencias', longo.length <= 160 && longo.endsWith('…') && !/\s…$/.test(longo) && longo.replace('…', '').split(' ').every((w) => w === 'palavra'));
const descricoes = publicos.map((p) => ({ p, d: descricaoDoProduto(p) }));
ok('descricao de todo produto publico com 50 a 160 caracteres', descricoes.every(({ d }) => d.length >= 50 && d.length <= 160), descricoes.filter(({ d }) => d.length < 50 || d.length > 160).map(({ p, d }) => `${p.slug}=${d.length}`).join(', '));
ok('descricao do produto sem promessa inventada (fora o que ja e do produto)', descricoes.every(({ p, d }) => !PROMESSA.test(d) || PROMESSA.test(p.descricao + p.personalizavel.join())));
const textosSeo = [DESCRICAO_SITE, IMAGEM_SOCIAL.alt, fs.readFileSync('lib/seo.ts', 'utf8'), ...['pecas', 'criar', 'design', 'editor', 'placas', 'secao/[slug]', 'produto/[slug]', 'natal'].map((r) => fs.readFileSync(`app/${r}/page.tsx`, 'utf8').match(/metadadosPagina\(\{[\s\S]*?\}\)/g)?.join('\n') ?? '')];
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
