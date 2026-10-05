/**
 * Regras da loja: o que e oculto nunca aparece, terceiro sem licenca e oculto, nada de
 * preco antes da validacao, links de personalizar existem e o WhatsApp so com numero.
 *   npx tsx scripts/verificar-marketplace.mts
 */
import fs from 'fs';
import { MENSAGENS, ORDEM_SECOES, PRODUTOS, SECOES, buscar, destaquesPorSecao, pecaDaSecao, linkWhatsapp, porSecao, porSlug, produtosPublicos, secoesComContagem, textoDoPreco, urlDaMidia, type Produto } from '../lib/marketplace/index';
import { FOTOS } from '../lib/marketplace/fotos';
import { BANNERS, COMO_FUNCIONA, PERGUNTAS, VANTAGENS } from '../lib/marketplace/loja';
import { CASA, VITRINE_CASA } from '../lib/marketplace/universos';
import { camposPrincipais, resumoPersonalizacao, valoresIniciais } from '../lib/marketplace/personalizar';
import { receitaPorId } from '../lib/gerador/receitas';

let falhas = 0, total = 0;
const ok = (nome: string, cond: boolean, detalhe = '') => {
  total++;
  if (!cond) falhas++;
  console.log(`${cond ? '  ok   ' : ' FALHA '} ${nome}${detalhe ? `  -> ${detalhe}` : ''}`);
};

const slugs = PRODUTOS.map((p) => p.slug);
ok('slugs unicos', new Set(slugs).size === slugs.length);
ok('slugs so com letras minusculas, numeros e hifen', slugs.every((s) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s)), slugs.filter((s) => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s)).join(', '));
ok('toda peca numa secao valida, com tipo', PRODUTOS.every((p) => ORDEM_SECOES.includes(p.secao) && p.secao in SECOES && p.tipo.trim().length > 0));
ok('nao existe secao de brinquedos (restricao legal)', !ORDEM_SECOES.some((s) => /brinqued/i.test(s + SECOES[s].nome)) && !PRODUTOS.some((p) => /brinqued/i.test(p.slug + p.nome + p.resumo + p.descricao + p.tipo)));
ok('todo produto tem nome, resumo e descricao', PRODUTOS.every((p) => p.nome.trim() && p.resumo.trim() && p.descricao.trim()));

const publicos = produtosPublicos();
ok('oculto nunca e publico', publicos.every((p) => p.visibilidade === 'publico'));
const terceirosSemLicenca = PRODUTOS.filter((p) => p.origem === 'terceiros' && p.licenca !== 'comercial-ok');
ok('terceiro sem licenca confirmada esta oculto e fora da vitrine', terceirosSemLicenca.every((p) => p.visibilidade === 'oculto' && !publicos.includes(p)), terceirosSemLicenca.filter((p) => publicos.includes(p)).map((p) => p.slug).join(', '));
ok('terceiro publico so com licenca comercial confirmada (mesmo se marcado publico)', produtosPublicos([{ ...terceirosSemLicenca[0]!, visibilidade: 'publico' }]).length === 0);
ok('porSlug nao acha produto oculto', terceirosSemLicenca.every((p) => !porSlug(p.slug)));
ok('busca nao devolve oculto', buscar('polvo').length === 0 && buscar('fidget').length === 0);
ok('as 5 secoes existem, na ordem da loja', ORDEM_SECOES.join() === 'casa,colecionaveis,empresa,presentes,sensoriais');
ok('Casa, Colecionaveis, Empresa e Presentes tem pecas publicas', secoesComContagem().filter((c) => c.secao !== 'sensoriais').every((c) => c.total > 0), secoesComContagem().map((c) => `${c.secao}=${c.total}`).join(' '));
ok('Sensoriais: todos de terceiros, ocultos ate a licenca (0 publicos)', porSecao('sensoriais').length === 0 && PRODUTOS.filter((p) => p.secao === 'sensoriais').every((p) => p.origem === 'terceiros' && p.visibilidade === 'oculto'));
ok('porSecao e destaques so devolvem publicos', ORDEM_SECOES.every((s) => porSecao(s).every((p) => publicos.includes(p))) && destaquesPorSecao(4).every((d) => d.produtos.length <= 4 && d.produtos.every((p) => publicos.includes(p))));
ok('destaques vem primeiro na vitrine da secao', destaquesPorSecao(4).every((d) => { const i = d.produtos.findIndex((p) => !p.destaque); return i < 0 || d.produtos.slice(i).every((p) => !p.destaque); }));

ok('nenhum preco publicado antes da validacao', PRODUTOS.every((p) => p.preco.status === 'validacao'));
ok('texto do preco em validacao', publicos.every((p) => textoDoPreco(p) === 'Preço em validação'));
ok('sem fotos de terceiros e sem midia faltando', PRODUTOS.every((p) => p.midias.every((m) => fs.existsSync(`public/${m.replace(/^\//, '')}`))) && terceirosSemLicenca.every((p) => !p.midias.length));
ok('fotos so de produto publico (pasta public/marketplace/<slug>)', Object.keys(FOTOS).every((slug) => publicos.some((p) => p.slug === slug)), Object.keys(FOTOS).filter((slug) => !publicos.some((p) => p.slug === slug)).join(', '));
ok('url da foto com o prefixo do site', urlDaMidia('marketplace/x/a.jpg') === `${process.env.NEXT_PUBLIC_BASE ?? ''}/marketplace/x/a.jpg`);
ok('url da foto codifica nome com espacos', urlDaMidia('marketplace/x/foto 1.jpg') === `${process.env.NEXT_PUBLIC_BASE ?? ''}/marketplace/x/foto%201.jpg`);
const pastaFotos = 'public/marketplace';
const entradasFotos = fs.existsSync(pastaFotos) ? fs.readdirSync(pastaFotos, { withFileTypes: true }) : [];
ok('pasta publica de fotos nao inclui itens ocultos ou desconhecidos', entradasFotos.every((entrada) =>
  (entrada.name === '.gitkeep' && entrada.isFile()) ||
  (entrada.isDirectory() && publicos.some((p) => p.slug === entrada.name) &&
    fs.readdirSync(`${pastaFotos}/${entrada.name}`, { withFileTypes: true }).every((foto) => foto.isFile() && /\.(jpe?g|png|webp|avif)$/i.test(foto.name)))
));

const rotas = new Set(['/editor', '/placas', '/criar']);
const linkValido = (p: Produto) => {
  const h = p.personalizar?.href;
  if (!h) return true;
  const g = h.match(/^\/moldes\/([a-z0-9-]+)$/);
  return g ? !!receitaPorId(g[1]!) : rotas.has(h);
};
ok('todo "personalizar" leva a um gerador ou rota que existe', PRODUTOS.every(linkValido), PRODUTOS.filter((p) => !linkValido(p)).map((p) => `${p.slug} -> ${p.personalizar!.href}`).join(', '));
ok('rotas do editor e das placas existem', fs.existsSync('app/editor/page.tsx') && fs.existsSync('app/placas/page.tsx'));

ok('busca ignora acento e maiuscula', buscar('PLACA DE AVALIACAO').some((p) => p.slug === 'placa-avaliacao-google'));
ok('busca por secao', buscar('', 'casa').every((p) => p.secao === 'casa') && buscar('', 'casa').length > 0);

// Cor filha: cada secao tem os tokens completos e --secao-forte legivel (AA) sobre branco.
const css = fs.readFileSync('styles/marca.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const luzRel = (hex: string) => { const n = parseInt(hex.slice(1), 16); const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!; };
const contraste = (a: string, b: string) => { const [x, y] = [luzRel(a), luzRel(b)].sort((m, n) => n - m); return (x! + 0.05) / (y! + 0.05); };
for (const s of ORDEM_SECOES) {
  const bloco = css.match(new RegExp(String.raw`\[data-secao='${s}'\]\s*\{([^}]*)\}`))?.[1] ?? '';
  const tok = (n: string) => bloco.match(new RegExp(String.raw`--${n}:\s*(#[0-9a-fA-F]{6})`))?.[1];
  const completos = ['secao', 'secao-2', 'secao-suave', 'secao-forte', 'secao-borda', 'secao-universo-base', 'secao-universo-texto'].every((n) => tok(n)) && ['secao-fundo', 'secao-universo', 'secao-padrao'].every((n) => new RegExp(String.raw`--${n}:`).test(bloco));
  const c = tok('secao-forte') ? contraste(tok('secao-forte')!, '#ffffff') : 0;
  ok(`cor filha de ${SECOES[s].nome}: tokens completos e texto AA (${c.toFixed(1)}:1)`, completos && c >= 4.5 && contraste(tok('secao-forte')!, tok('secao-suave')!) >= 4.5);
  const cu = completos ? contraste(tok('secao-universo-texto')!, tok('secao-universo-base')!) : 0;
  ok(`universo ${SECOES[s].universo}: texto do palco AA (${cu.toFixed(1)}:1)`, cu >= 4.5 && !!SECOES[s].universo.trim());
  // Botao no palco: o acento proprio (palco escuro) ou o azul da marca com texto branco.
  const acao = tok('secao-acao'), acaoTexto = tok('secao-acao-texto');
  if (acao && acaoTexto) ok(`universo ${SECOES[s].universo}: botao do palco legivel`, contraste(acao, acaoTexto) >= 4.5, `${contraste(acao, acaoTexto).toFixed(1)}:1`);
}
const principaisAprovadas = { casa: '#c8b79e', colecionaveis: '#315c56', empresa: '#375a6d', presentes: '#c68f89', sensoriais: '#91a58a' };
const principais = ORDEM_SECOES.map((s) => ({ s, hex: css.match(new RegExp(String.raw`\[data-secao='${s}'\]\s*\{[^}]*--secao:\s*(#[0-9a-fA-F]{6})`))?.[1]?.toLowerCase() }));
ok('cores principais respeitam a paleta aprovada', principais.every(({ s, hex }) => hex === principaisAprovadas[s]));
ok('secoes identificadas por nomes distintos, nao somente cor', new Set(ORDEM_SECOES.map((s) => SECOES[s].nome.trim())).size === ORDEM_SECOES.length && ORDEM_SECOES.every((s) => SECOES[s].nome.trim().length > 0));
const tokenCasa = (bloco: string, n: string) => css.match(new RegExp(String.raw`\[data-${bloco}='casa'\]\s*\{[^}]*--${n}:\s*(#[0-9a-fA-F]{6})`))?.[1]?.toLowerCase();
ok('cores das pecas da Casa = tokens da secao', CASA.cobre === tokenCasa('secao', 'secao') && CASA.cafe === tokenCasa('secao', 'secao-2') && CASA.linho === tokenCasa('secao', 'secao-suave') && CASA.creme === tokenCasa('universo', 'secao-superficie'));
ok('mosaico da Casa so com pecas publicas da secao', VITRINE_CASA.every((slug) => porSecao('casa').some((p) => p.slug === slug)));
ok('a cor da marca nao muda dentro das secoes',!/\[data-secao[^\]]*\][^{]*\{[^}]*--marca-/.test(css));

ok('WhatsApp sem numero: sem link (botao em breve)', linkWhatsapp('oi', '') === null);
const l = linkWhatsapp(MENSAGENS.produto(publicos[0]!), '+55 (19) 99999-0000');
ok('WhatsApp com numero: so digitos e mensagem codificada', l === `https://wa.me/5519999990000?text=${encodeURIComponent(MENSAGENS.produto(publicos[0]!))}`, l ?? '');

const fonte = fs.readFileSync('lib/marketplace/produtos.ts', 'utf8');
ok('sem valores em reais no cadastro (custos ficam fora do repo)', !/R\$\s*\d/.test(fonte));
ok('sem nomes de arquivo da Downloads no cadastro (repo publico)', !/\.(3mf|stl|zip|ai|pdf|obj|step)\b/i.test(fonte) && PRODUTOS.every((p) => !p.ref || /^[TN]\d{2}$/.test(p.ref)));
ok('sem personagem com marca registrada', !/aranha|spider|marvel|disney|pokemon|mario/i.test(fonte));

// Carrinho de orcamento e textos comerciais
const msg = MENSAGENS.orcamento([{ nome: 'Chaveiro com nome', quantidade: 3, cor: 'azul', observacao: 'nome Ana' }, { nome: 'Topo de bolo', quantidade: 1 }]);
ok('mensagem do orçamento lista peça, quantidade, cor e observação', msg.includes('1. Chaveiro com nome (3 un.) - cor: azul; obs.: nome Ana') && msg.includes('2. Topo de bolo (1 un.)') && !msg.includes('2. Topo de bolo (1 un.) -'), msg);
// As promessas da loja ficam nas vantagens (os banners citam produtos, como a placa de Pix).
const lojaTxt = JSON.stringify(VANTAGENS);
ok('vantagens sem frete, pagamento, prazo ou avaliação inventados', !/frete|gr[aá]tis|\bpix\b|cart[aã]o de cr[eé]dito|entrega em|avalia[cç][aã]o|estrelas|★|mais vendid|garantia/i.test(lojaTxt));
ok('como funciona: 3 passos, cada um com título e texto', COMO_FUNCIONA.length === 3 && COMO_FUNCIONA.every((p) => p.titulo.trim() && p.texto.trim()));
ok('perguntas frequentes sem frete, pagamento, prazo ou avaliação inventados', PERGUNTAS.length > 0 && !/frete|gr[aá]tis|\bpix\b|cart[aã]o de cr[eé]dito|entrega em|\d+\s*dias|avalia[cç][aã]o|estrelas|★|mais vendid|garantia/i.test(JSON.stringify(PERGUNTAS)));
ok('peça de cada categoria da home é pública', ORDEM_SECOES.every((s) => { const p = pecaDaSecao(s); return !p || !!porSlug(p.slug); }));
// Personalizar no produto: toda peca com gerador mostra campos; resumo legivel; vai na mensagem.
const comGerador = publicos.filter((p) => p.personalizar?.href.startsWith('/moldes/'));
const semCampos = comGerador.filter((p) => { const g = p.personalizar!.href.split('/').pop()!; return camposPrincipais(g, valoresIniciais(g)).length === 0; });
ok('toda peça com gerador tem campos para personalizar no produto', comGerador.length > 0 && !semCampos.length, semCampos.map((p) => p.slug).join(', '));
const camposChaveiro = camposPrincipais('chaveiro-nome', valoresIniciais('chaveiro-nome'));
const resumo = resumoPersonalizacao(camposChaveiro, { ...valoresIniciais('chaveiro-nome'), nomes: 'Maria', prefixo: '' });
ok('resumo da personalização: rótulo, fonte pelo nome, cor em HEX e sem campo vazio', resumo.includes('Nomes: Maria') && /Fonte: Lobster/.test(resumo) && /#[0-9A-F]{6}/.test(resumo) && !/Antes do nome:/.test(resumo), resumo);
ok('campos principais sem ajuste técnico (só texto, fonte, cor e medida)', camposChaveiro.every((p) => ['texto', 'fonte', 'cor', 'numero'].includes(p.tipo)) && camposChaveiro.filter((p) => p.tipo === 'numero').length <= 1);
ok('personalização vai na mensagem do orçamento', MENSAGENS.orcamento([{ nome: 'Chaveiro', quantidade: 2, personalizacao: 'Nomes: Maria' }]).includes('1. Chaveiro (2 un.) - personalização: Nomes: Maria'));
// Organizacao no padrao das grandes: home com vitrines, catalogo completo em /pecas.
const home = fs.readFileSync('features/marketplace/MarketplaceHome.tsx', 'utf8');
ok('home sem o catálogo inteiro (vitrines + "Ver todas" para /pecas)', !/<Listagem[\s/>]/.test(home) && /href: '\/pecas'/.test(home) && fs.existsSync('app/pecas/page.tsx'));
ok('card sem botão de adicionar (o card inteiro leva à peça)', !/BotaoAdicionar slug=\{p\.slug\} \/>/.test(fs.readFileSync('components/loja/CardProduto.tsx', 'utf8')));
ok('banners apontam para peças públicas', BANNERS.every((b) => !!porSlug(b.produto)));

console.log(`\n${total - falhas}/${total} passaram\n`);
if (falhas) process.exit(1);
