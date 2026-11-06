/**
 * Regras da loja: o que e oculto nunca aparece (a licenca e informativa), terceiro tem credito, nada de
 * preco antes da validacao, links de personalizar existem e o WhatsApp so com numero.
 *   npx tsx scripts/verificar-marketplace.mts
 */
import fs from 'fs';
import { destinoDoMoldeAntigo, editoresLivres, moldes } from '../features/catalogo/catalogo';
import { MENSAGENS, ORDEM_SECOES, PRODUTOS, SECOES, buscar, geradorDe, podeAparecer, linkWhatsapp, porSecao, porSlug, produtosPublicos, secoesComContagem, textoDoPreco, urlDaMidia, type Produto } from '../lib/marketplace/index';
import { CAPAS, FOTOS } from '../lib/marketplace/fotos';
import { textoResposta } from '../lib/marketplace/contato';
import { comImagemPrimeiro, geradores, secoesComPecas, semRepetir, temImagem } from '../lib/marketplace/consultas';
import { maisRecentes, ordenarLoja } from '../lib/marketplace/ordem';
import { paraCliente } from '../lib/marketplace/api/contrato';
import { NOSSOS_GERADORES, SECOES_ANTIGAS, hrefDaSecao } from '../lib/marketplace/tipos';
import { ENDPOINTS, POR_PAGINA, paginaInicial, paraResumo, respostaDaLista } from '../lib/marketplace/api/contrato';
import { ehInterno } from '../lib/ambiente';
import { BANNERS, COMO_FUNCIONA, PERGUNTAS, VANTAGENS } from '../lib/marketplace/loja';
import { CASA, VITRINE_CASA } from '../lib/marketplace/universos';
import { camposPrincipais, resumoDoModelo, resumoPersonalizacao, valoresIniciais, valoresParaOrcamento } from '../lib/marketplace/personalizar';
import { lerBanco, type RegistroProduto } from '../lib/marketplace/banco';
import { sincronizarBanco } from '../lib/marketplace/banco-sincronizar';
import { hrefDoGerador } from '../lib/marketplace/formato';
import { FLAGS } from '../lib/flags';
import { FERRAMENTAS } from '../lib/marketplace/indexacao';
import { FOTOS_TOPO_NATAL, PRESETS_NATAL, SLUGS_NATAL, TEXTOS_NATAL, VITRINES_NATAL, campanhaAtiva, diasAteONatal, pecaDeNatal } from '../lib/marketplace/campanhas';
import { receitaPorId } from '../lib/gerador/receitas';
import { FICHAS } from '../lib/gerador/receitas/fichas';

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
const ocultos = PRODUTOS.filter((p) => p.visibilidade === 'oculto');
const terceiroOculto = ocultos.find((p) => p.origem === 'terceiros' && !p.campanha)!;
ok('oculto fica fora da vitrine e do porSlug, de qualquer origem', !!terceiroOculto && ocultos.every((p) => !publicos.includes(p) && !porSlug(p.slug)), ocultos.filter((p) => publicos.includes(p)).map((p) => p.slug).join(', '));
ok('o que aparece e o publico, qualquer origem ou licenca (licenca so informa)', produtosPublicos([terceiroOculto]).length === 0 && produtosPublicos([{ ...terceiroOculto, visibilidade: 'publico', licenca: 'nao-comercial' }]).length === 1);
const comCredito = PRODUTOS.filter((p) => p.credito);
const creditoRuim = comCredito.filter((p) => p.origem !== 'terceiros' || !p.credito!.autor.trim() || !/^https:\/\/makerworld\.com\//.test(p.credito!.url) || !/^https:\/\/makerworld\.com\//.test(p.credito!.autorUrl) || (publicos.includes(p) && !p.midias.length));
ok('credito MakerWorld: so em terceiro, com autor, links e foto quando publico', comCredito.length > 0 && !creditoRuim.length, creditoRuim.map((p) => p.slug).join(', '));
ok('credito MakerWorld: um produto por modelo', new Set(comCredito.map((p) => p.credito!.url)).size === comCredito.length);
ok('busca nao devolve oculto', buscar('polvo').length === 0 && buscar('fidget').length === 0);
ok('as categorias do menu existem, na ordem da loja (sem Casa e Colecionaveis)', ORDEM_SECOES.join() === 'natal,decoracao,cozinha,organizacao,escritorio,infantil,presentes,empresa,sensoriais');
ok('toda categoria, menos Sensoriais, tem pecas publicas', secoesComContagem().filter((c) => c.secao !== 'sensoriais').every((c) => c.total > 0), secoesComContagem().map((c) => `${c.secao}=${c.total}`).join(' '));
ok('categoria definida em docs/categorias.md (nome de cada uma)', ORDEM_SECOES.every((s) => fs.readFileSync('docs/categorias.md', 'utf8').includes(`(\`${s}\`)`) || s === 'sensoriais'));
ok('Natal e so com campanha natal, e vice-versa', PRODUTOS.every((p) => (p.secao === 'natal') === (p.campanha === 'natal')));
ok('enderecos de categoria: Natal em /natal, o resto em /secao; antigos encaminham', hrefDaSecao('natal') === '/natal' && hrefDaSecao('decoracao') === '/secao/decoracao' && SECOES_ANTIGAS.casa === '/secao/decoracao' && SECOES_ANTIGAS.colecionaveis === '/pecas');
ok('Nossos geradores: todas as publicas com gerador, e cada uma tambem na sua categoria', geradores().length === publicos.filter((p) => geradorDe(p)).length && geradores().every((p) => ORDEM_SECOES.includes(p.secao)) && NOSSOS_GERADORES.href === '/geradores');
const banco = (p: Produto) => PRODUTOS.indexOf(p);
const ordemOk = publicos.every((p, i) => i === 0 || (() => { const a = publicos[i - 1]!; return Number(!!a.destaque) > Number(!!p.destaque) || (!!a.destaque === !!p.destaque && (a.adicionadoEm > p.adicionadoEm || (a.adicionadoEm === p.adicionadoEm && banco(a) > banco(p)))); })());
ok('ordem da loja: destaques, depois as mais novas, no mesmo dia a ultima cadastrada', ordemOk);
ok('"Mais recentes": so pela data, mantendo a ordem da loja no empate', (() => { const r = maisRecentes(publicos); return r.every((p, i) => i === 0 || r[i - 1]!.adicionadoEm >= p.adicionadoEm); })() && JSON.stringify(ordenarLoja([{ slug: 'a', destaque: false, adicionadoEm: '2026-01-01' }, { slug: 'b', destaque: true, adicionadoEm: '2025-01-01' }, { slug: 'c', destaque: false, adicionadoEm: '2026-01-01' }]).map((p) => p.slug)) === '["b","c","a"]');
ok('todo produto tem a data de entrada na loja', PRODUTOS.every((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.adicionadoEm)));
ok('pagina do produto nao leva credito, ref nem licenca ao navegador', PRODUTOS.filter((p) => p.credito).every((p) => { const c = paraCliente(p) as Record<string, unknown>; return !('credito' in c) && !('ref' in c) && !('licenca' in c) && !('jaImpresso' in c); }) && !/credito/.test(fs.readFileSync('app/produto/[slug]/page.tsx', 'utf8')) && /produto=\{paraCliente\(p\)\}/.test(fs.readFileSync('app/produto/[slug]/page.tsx', 'utf8')));
ok('Sensoriais: todos de terceiros, ocultos (0 publicos)', porSecao('sensoriais').length === 0 && PRODUTOS.filter((p) => p.secao === 'sensoriais').every((p) => p.origem === 'terceiros' && p.visibilidade === 'oculto'));
ok('porSecao so devolve publicos, destaques primeiro', ORDEM_SECOES.every((s) => { const ps = porSecao(s); const i = ps.findIndex((p) => !p.destaque); return ps.every((p) => publicos.includes(p)) && (i < 0 || ps.slice(i).every((p) => !p.destaque)); }));

ok('nenhum preco publicado antes da validacao', PRODUTOS.every((p) => p.preco.status === 'validacao'));
ok('texto do preco em validacao', publicos.every((p) => textoDoPreco(p) === 'Preço em validação'));
const midiaFaltando = PRODUTOS.flatMap((p) => [...p.midias, ...(p.capa ? [p.capa] : [])].filter((m) => !fs.existsSync(`public/${m.replace(/^\//, '')}`)).map((m) => `${p.slug}: ${m}`));
ok('toda foto e capa do card existe no projeto (public/)', !midiaFaltando.length, midiaFaltando.slice(0, 5).join(', '));
ok('oculto sem foto', ocultos.every((p) => !p.midias.length), ocultos.filter((p) => p.midias.length).map((p) => p.slug).join(', '));
ok('fotos so de produto publico (pasta public/marketplace/<slug>)', Object.keys(FOTOS).every((slug) => publicos.some((p) => p.slug === slug)), Object.keys(FOTOS).filter((slug) => !publicos.some((p) => p.slug === slug)).join(', '));
ok('url da foto com o prefixo do site', urlDaMidia('marketplace/x/a.jpg') === `${process.env.NEXT_PUBLIC_BASE ?? ''}/marketplace/x/a.jpg`);
ok('url da foto codifica nome com espacos', urlDaMidia('marketplace/x/foto 1.jpg') === `${process.env.NEXT_PUBLIC_BASE ?? ''}/marketplace/x/foto%201.jpg`);
const pastaFotos = 'public/marketplace';
const entradasFotos = fs.existsSync(pastaFotos) ? fs.readdirSync(pastaFotos, { withFileTypes: true }) : [];
const soImagens = (dir: string) => fs.readdirSync(dir, { withFileTypes: true }).every((foto) => foto.isFile() && /\.(jpe?g|png|webp|avif)$/i.test(foto.name));
ok('pasta publica de fotos nao inclui itens ocultos ou desconhecidos (so imagens e a pasta card/ da capa)', entradasFotos.every((entrada) =>
  (entrada.name === '.gitkeep' && entrada.isFile()) ||
  (entrada.isDirectory() && publicos.some((p) => p.slug === entrada.name) &&
    fs.readdirSync(`${pastaFotos}/${entrada.name}`, { withFileTypes: true }).every((foto) => (foto.isFile() && /\.(jpe?g|png|webp|avif)$/i.test(foto.name)) || (foto.isDirectory() && foto.name === 'card' && soImagens(`${pastaFotos}/${entrada.name}/card`))))
));
ok('capa de card so de produto com foto, dentro da pasta dele', Object.entries(CAPAS).every(([slug, c]) => FOTOS[slug]?.length && c.startsWith(`marketplace/${slug}/card/`)) && PRODUTOS.every((p) => !p.capa || p.capa === CAPAS[p.slug]));

const rotas = new Set(['/editor', '/criar']);
const linkValido = (p: Produto) => {
  if (p.tags.includes('gerador')) return !!p.gerador && !!receitaPorId(p.gerador) && !p.personalizar;
  if (p.tags.includes('editor')) return !!p.personalizar && rotas.has(p.personalizar.href);
  return !p.personalizar && !p.gerador;
};
ok('tag gerador aponta para receita existente e tag editor para rota existente', PRODUTOS.every(linkValido), PRODUTOS.filter((p) => !linkValido(p)).map((p) => `${p.slug} -> ${p.gerador ?? p.personalizar?.href}`).join(', '));
ok('rota do editor existe e a de placas nao', fs.existsSync('app/editor/page.tsx') && !fs.existsSync('app/placas'));
const linkEditorValido = (href: string) => {
  const [rota, query = ''] = href.split('?');
  if (!fs.existsSync(`app${rota}/page.tsx`)) return false;
  if (rota === '/design' && query) {
    const modelo = new URLSearchParams(query).get('modelo');
    return !!modelo && !!receitaPorId(modelo);
  }
  return !query;
};
ok('todos os editores livres apontam para uma rota ou receita existente', editoresLivres.every((e) => linkEditorValido(e.href)), editoresLivres.filter((e) => !linkEditorValido(e.href)).map((e) => `${e.id} -> ${e.href}`).join(', '));
ok('modelos abrem no editor por query e /moldes/<id> mantém os destinos especializados', fs.existsSync('app/design/page.tsx') && /Redirecionar/.test(fs.readFileSync('app/moldes/[id]/page.tsx', 'utf8')) && /destinoDoMoldeAntigo/.test(fs.readFileSync('app/moldes/[id]/page.tsx', 'utf8')));
const idsLegados = [...new Set([...FICHAS, ...moldes].map(({ id }) => id))];
const destinoLegadoValido = (id: string) => {
  const destino = destinoDoMoldeAntigo(id, (receita) => !!receitaPorId(receita));
  return linkEditorValido(destino);
};
ok('todo ID gerado em /moldes tem destino existente', idsLegados.every(destinoLegadoValido), idsLegados.filter((id) => !destinoLegadoValido(id)).join(', '));
ok('moldes especializados e alias de chaveiro mantêm o destino correto', destinoDoMoldeAntigo('texto-livre', () => false) === '/editor' && destinoDoMoldeAntigo('letreiro-nome', () => false) === '/editor' && destinoDoMoldeAntigo('placa-personalizada', () => false) === '/criar' && destinoDoMoldeAntigo('placa-profissional', () => false) === '/criar' && destinoDoMoldeAntigo('chaveiro-logo', (id) => id === 'chaveiro-desenho') === '/design?modelo=chaveiro-desenho' && destinoDoMoldeAntigo('id-desconhecido', () => false) === '/criar');
ok('nenhum link do site ainda aponta para rotas antigas de modelo', !PRODUTOS.some((p) => /^(?:\/moldes\/|\/design\/)/.test(p.personalizar?.href ?? '')) && !/(?:\/moldes\/|\/design\/)/.test(fs.readFileSync('components/catalogo/CatalogoScarprint.tsx', 'utf8') + fs.readFileSync('features/catalogo/catalogo.ts', 'utf8')));
const varrer = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? varrer(`${dir}/${e.name}`) : /\.(tsx?|mts|json|css)$/.test(e.name) ? [`${dir}/${e.name}`] : []);
const citaPlacas = ['app', 'components', 'features', 'lib'].flatMap(varrer).filter((arq) => /\/placas\b/.test(fs.readFileSync(arq, 'utf8')));
// Componente de navegador nao importa o cadastro (nem a moldura da loja, que consulta o banco): senao o banco inteiro vai no JS.
const clientes = ['app', 'components', 'features'].flatMap(varrer).filter((arq) => /\.tsx?$/.test(arq) && /^['"]use client['"]/.test(fs.readFileSync(arq, 'utf8').trimStart()));
const levaCadastro = clientes.filter((arq) => /from '(?:@\/lib\/marketplace(?:\/(?:index|produtos|consultas|banco|indexacao|letras))?|@\/components\/loja\/Estrutura|@\/components\/marketplace\/Loja)'/.test(fs.readFileSync(arq, 'utf8')));
ok('nenhum componente de navegador importa o cadastro', clientes.length > 0 && !levaCadastro.length, levaCadastro.join(', '));
ok('o site nao fala do MakerWorld (paginas e componentes)', !['app', 'components', 'features'].flatMap(varrer).some((arq) => /makerworld/i.test(fs.readFileSync(arq, 'utf8'))), ['app', 'components', 'features'].flatMap(varrer).filter((arq) => /makerworld/i.test(fs.readFileSync(arq, 'utf8'))).join(', '));
const registroPlacas = PRODUTOS.find((p) => p.slug === 'placa-personalizada');
ok('rota /placas nao existe e nada do site aponta para ela', !fs.existsSync('app/placas') && !fs.existsSync('features/placas') && citaPlacas.length === 0 && !PRODUTOS.some((p) => p.slug !== 'placa-personalizada' && (p.personalizar?.href ?? '').startsWith('/placas')) && registroPlacas?.visibilidade === 'oculto' && !FERRAMENTAS.includes('/placas'), citaPlacas.join(', '));
const produtoTeste = PRODUTOS[0]!;
ok('gerador vem da tag, nao do link', geradorDe({ ...produtoTeste, tags: ['gerador'], gerador: 'chaveiro-nome' }) === 'chaveiro-nome' && geradorDe({ ...produtoTeste, tags: [], gerador: 'chaveiro-nome' }) === undefined && geradorDe({ ...produtoTeste, tags: ['editor'], gerador: undefined, personalizar: { href: '/design?modelo=chaveiro-nome', rotulo: 'x' } }) === undefined);
ok('"Ver no gerador" leva o modelo e a peca de origem', hrefDoGerador('chaveiro-nome', 'chaveiro-nome') === '/design?modelo=chaveiro-nome&produto=chaveiro-nome');

// ---- banco mockado (data/produtos.json) ----
const linhasBanco = JSON.parse(fs.readFileSync('data/produtos.json', 'utf8')) as RegistroProduto[];
const colunas = Object.keys(linhasBanco[0]!).sort().join();
ok('banco: todo registro tem as mesmas colunas', linhasBanco.every((r) => Object.keys(r).sort().join() === colunas));
ok('banco: PRODUTOS sai do banco, um por registro', PRODUTOS.length === linhasBanco.length && PRODUTOS.every((p, i) => p.slug === linhasBanco[i]!.slug));
const recusa = (mudanca: Partial<RegistroProduto>, campo: string) => { try { lerBanco([{ ...linhasBanco[0]!, ...mudanca }]); return false; } catch (e) { return (e as Error).message.includes(campo); } };
ok('banco: registro invalido para o build com o campo', recusa({ secao: 'brinquedos' }, 'secao') && recusa({ tags: ['gerador'], gerador: null }, 'gerador') && recusa({ preco: { status: 'definido', valor: -1 } }, 'preco') && recusa({ tags: ['editor'], gerador: null, personalizar: null }, 'personalizar') && recusa({ credito: { autor: 'x', autorUrl: 'https://makerworld.com/@x', titulo: 'x', url: 'https://exemplo.com/x', plataforma: 'MakerWorld', licencaOriginal: 'x' } }, 'credito'));
ok('banco: slug repetido para o build', (() => { try { lerBanco([linhasBanco[0]!, linhasBanco[0]!]); return false; } catch (e) { return /repetido/.test((e as Error).message); } })());
ok('banco: sincronizar de novo nao muda nada', JSON.stringify(sincronizarBanco(linhasBanco, FICHAS)) === JSON.stringify(linhasBanco));
const semFicha = sincronizarBanco(linhasBanco.filter((r) => r.gerador !== 'chaveiro-retangular'), FICHAS);
const recriado = semFicha.find((r) => r.gerador === 'chaveiro-retangular');
ok('banco: gerador sem peca ganha registro com os textos da ficha e revisar', !!recriado && recriado.revisar && recriado.tags.join() === 'gerador' && recriado.nome === FICHAS.find((f) => f.id === 'chaveiro-retangular')!.nome && semFicha.every((r, i) => i >= linhasBanco.length - 1 || r === linhasBanco.filter((x) => x.gerador !== 'chaveiro-retangular')[i]));
const pecaDoGerador = (id: string) => produtosPublicos().find((p) => geradorDe(p) === id);
const brinquedo = (id: string) => /brinquedo/i.test(FICHAS.find((f) => f.id === id)?.tipo ?? '');
const vendaveis = FICHAS.filter((f) => !brinquedo(f.id));
const semPeca = vendaveis.filter((f) => !pecaDoGerador(f.id));
ok(`todo gerador tem peca publica na loja (${vendaveis.length - semPeca.length}/${vendaveis.length})`, !semPeca.length, semPeca.map((f) => f.id).join(', '));
ok('gerador de brinquedo fica no banco, mas oculto (restricao legal)', FICHAS.filter((f) => brinquedo(f.id)).every((f) => PRODUTOS.some((p) => geradorDe(p) === f.id && p.visibilidade === 'oculto')));

// ---- fluxo: /criar -> produto -> gerador -> orcamento ----
const catalogo = fs.readFileSync('components/catalogo/CatalogoScarprint.tsx', 'utf8');
ok('/criar: card de gerador abre a pagina da peca, sem "Pedir impressa"', /`\/produto\/\$\{naLoja\[id\]\}`/.test(catalogo) && /href=\{pecaDo\(f\.id\)\}/.test(catalogo) && !/Pedir impressa/.test(catalogo));
ok('/criar: todo card tem o mesmo botao, um so', (catalogo.match(/<CardModelo /g) ?? []).length === 2 && /acao="Personalizar"/.test(catalogo) && /acao="Abrir editor"/.test(catalogo));
ok('pecas de ACM fora da loja: o orcamento delas sai do editor', ['letreiro-letra-caixa-acm', 'letra-moldura-acm'].every((s) => PRODUTOS.some((p) => p.slug === s) && !porSlug(s)));
const cabecalhoLoja = fs.readFileSync('components/loja/Cabecalho.tsx', 'utf8');
const menuCriar = fs.readFileSync('components/loja/MenuCriar.tsx', 'utf8');
ok('menu "Criar": Personalize em 3D (/criar) e Letreiro para parede (/editor), um item só', /href: '\/criar', titulo: 'Personalize em 3D'/.test(menuCriar) && /href: '\/editor', titulo: 'Letreiro para parede'/.test(menuCriar) && !/Monte seu letreiro|Monte a sua peça/.test(cabecalhoLoja));
ok('menu "Criar" vem primeiro no celular e por último no computador', cabecalhoLoja.indexOf('<MenuCriar modo="folha"') < cabecalhoLoja.indexOf('campanhaAtiva(\'natal\') && (') && cabecalhoLoja.indexOf('<MenuCriar modo="menu"') > cabecalhoLoja.indexOf('NOSSOS_GERADORES.href'));
// Barra do topo enxuta: Categorias (menu), Natal, Nossos geradores, Todas as pecas e Criar; as categorias ficam dentro do menu.
const menuCategorias = fs.readFileSync('components/loja/MenuCategorias.tsx', 'utf8');
ok('barra do topo: so Categorias, Natal, Todas as peças, Nossos geradores e Criar (nessa ordem)', /<MenuCategorias modo="menu"/.test(cabecalhoLoja) && /<MenuCategorias modo="folha"/.test(cabecalhoLoja) && !/SECOES\[/.test(cabecalhoLoja) && cabecalhoLoja.indexOf('<MenuCategorias modo="menu"') < cabecalhoLoja.indexOf('href="/pecas"') && cabecalhoLoja.indexOf('href="/pecas"') < cabecalhoLoja.indexOf('NOSSOS_GERADORES.href') && cabecalhoLoja.indexOf('NOSSOS_GERADORES.href') < cabecalhoLoja.indexOf('<MenuCriar modo="menu"'));
ok('menu Categorias: toda categoria com peça pública, com a quantidade, e "Ver todas as peças"', /secoesComContagem\(\)\.filter\(\(c\) => c\.total > 0\)/.test(fs.readFileSync('components/loja/Estrutura.tsx', 'utf8')) && /hrefDaSecao\(secao\)/.test(menuCategorias) && /Ver todas as peças/.test(menuCategorias));
// Filtros curtos: no maximo 6 chips a vista, o resto em "Mais filtros"; Todas as pecas filtra por categoria.
const listagemFonte = fs.readFileSync('components/loja/Listagem.tsx', 'utf8');
ok('filtros: no máximo 6 chips à vista e "Mais filtros" com o resto', /const CHIPS_A_VISTA = 6;/.test(listagemFonte) && /aVista\.map\(/.test(listagemFonte) && /Mais filtros/.test(listagemFonte));
ok('Todas as peças filtra por categoria', /paginaInicial\(produtosPublicos\(\), 'secao'\)/.test(fs.readFileSync('app/pecas/page.tsx', 'utf8')));
ok('sem "Já feito para clientes" no site', !['app', 'components', 'features'].flatMap(varrer).some((arq) => /Já feitos? para clientes/.test(fs.readFileSync(arq, 'utf8'))));
const barraTopo = fs.readFileSync('components/casca/BarraTopo.tsx', 'utf8');
ok('flag desligada: /editor sem aba, atalho 3 e valor de orçamento', FLAGS.orcamentoNoEditor === false && /\.\.\.\(FLAGS\.orcamentoNoEditor \? \[\{ valor: 'orcamento'/.test(barraTopo) && /\{FLAGS\.orcamentoNoEditor && o && interno && \(/.test(barraTopo) && /FLAGS\.orcamentoNoEditor \? \{ '3': 'orcamento'/.test(fs.readFileSync('components/casca/Atalhos.tsx', 'utf8')));
ok('com o orçamento do editor desligado, o menu Criar não promete orçamento lá', FLAGS.orcamentoNoEditor || !/orçamento sai do editor/i.test(menuCriar));
ok('mesmos nomes no site: sem "Monte a sua peça" nem "Monte seu letreiro"', !['components/loja/Estrutura.tsx', 'app/not-found.tsx', 'features/design/Casca.tsx'].some((f) => /Monte a sua peça|Monte seu letreiro|>Monte a sua</.test(fs.readFileSync(f, 'utf8'))));
ok('menu e rodape sem "Arquivos para imprimir"', !/Arquivos para imprimir|Baixe o arquivo|Para quem imprime/.test(['components/loja/Cabecalho.tsx', 'components/loja/Estrutura.tsx', 'app/not-found.tsx'].map((f) => fs.readFileSync(f, 'utf8')).join()));
ok('produto com gerador tem "Ver no gerador (mais configurações)"', /hrefDoGerador\(gerador, p\.slug\)/.test(fs.readFileSync('components/loja/Produto.tsx', 'utf8')) && /Ver no gerador \(mais configurações\)/.test(fs.readFileSync('components/loja/Produto.tsx', 'utf8')));
ok('/design tem "Adicionar ao orçamento" e recebe as pecas do servidor', /<AdicionarOrcamento /.test(fs.readFileSync('features/design/ModoLivre.tsx', 'utf8')) && /pecas=\{pecas\}/.test(fs.readFileSync('app/design/page.tsx', 'utf8')));
const resumoChaveiro = resumoDoModelo('chaveiro-retangular', { ...valoresIniciais('chaveiro-retangular'), nomes: 'Ana', argola: false });
ok('resumo do gerador: texto, escolha e liga legiveis', /Nomes?: Ana/.test(resumoChaveiro) && /: Não/.test(resumoChaveiro) && !/false|true/.test(resumoChaveiro), resumoChaveiro);
const comImagem = FICHAS.map((f) => receitaPorId(f.id)!).find((r) => r.parametros.some((p) => p.tipo === 'svg' && !p.visivel))!;
const idImagem = comImagem.parametros.find((p) => p.tipo === 'svg' && !p.visivel)!.id;
ok('resumo do gerador: imagem vira aviso e nao vai nos valores do orcamento', /imagem enviada/.test(resumoDoModelo(comImagem.id, { [idImagem]: '<svg/>' })) && !(idImagem in valoresParaOrcamento(comImagem.id, { [idImagem]: '<svg/>', outro: 1 })));
ok('resumo do gerador sem mudanca diz que e o padrao', resumoDoModelo('floco-neve', {}) === 'Configuração padrão do modelo');

ok('busca ignora acento e maiuscula', buscar('PLACA DE AVALIACAO').some((p) => p.slug === 'placa-avaliacao-google'));
ok('busca por secao', buscar('', 'decoracao').every((p) => p.secao === 'decoracao') && buscar('', 'decoracao').length > 0);

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
// Decoracao herda a da antiga Casa; natal, cozinha, organizacao, escritorio e infantil: propostas de 2026-11-06, aguardando aprovacao.
const principaisAprovadas: Record<string, string> = { decoracao: '#c8b79e', empresa: '#375a6d', presentes: '#c68f89', sensoriais: '#91a58a', natal: '#1f6b45', cozinha: '#c98b5e', organizacao: '#8c86b5', escritorio: '#b08d3c', infantil: '#8fb3cf' };
const principais = ORDEM_SECOES.map((s) => ({ s, hex: css.match(new RegExp(String.raw`\[data-secao='${s}'\]\s*\{[^}]*--secao:\s*(#[0-9a-fA-F]{6})`))?.[1]?.toLowerCase() }));
ok('cores principais respeitam a paleta aprovada', principais.every(({ s, hex }) => hex === principaisAprovadas[s]));
ok('secoes identificadas por nomes distintos, nao somente cor', new Set(ORDEM_SECOES.map((s) => SECOES[s].nome.trim())).size === ORDEM_SECOES.length && ORDEM_SECOES.every((s) => SECOES[s].nome.trim().length > 0));
const tokenCasa = (bloco: string, n: string) => css.match(new RegExp(String.raw`\[data-${bloco}='decoracao'\]\s*\{[^}]*--${n}:\s*(#[0-9a-fA-F]{6})`))?.[1]?.toLowerCase();
ok('cores das pecas de Decoracao (a antiga Casa) = tokens da secao', CASA.cobre === tokenCasa('secao', 'secao') && CASA.cafe === tokenCasa('secao', 'secao-2') && CASA.linho === tokenCasa('secao', 'secao-suave') && CASA.creme === tokenCasa('universo', 'secao-superficie'));
ok('mosaico de Decoracao so com pecas publicas da secao', VITRINE_CASA.every((slug) => porSecao('decoracao').some((p) => p.slug === slug)));
ok('a cor da marca nao muda dentro das secoes',!/\[data-secao[^\]]*\][^{]*\{[^}]*--marca-/.test(css));

ok('WhatsApp sem numero: sem link (botao em breve)', linkWhatsapp('oi', '') === null);
const l = linkWhatsapp(MENSAGENS.produto(publicos[0]!), '+55 (19) 99999-0000');
ok('WhatsApp com numero: so digitos e mensagem codificada', l === `https://wa.me/5519999990000?text=${encodeURIComponent(MENSAGENS.produto(publicos[0]!))}`, l ?? '');
ok('prazo de resposta vazio nao promete nada', textoResposta('') === 'Respondemos pelo WhatsApp.' && textoResposta(' em até 1 dia útil ') === 'Respondemos pelo WhatsApp em até 1 dia útil.');
ok('pedido do letreiro leva a descricao e nenhum valor', MENSAGENS.letreiro('*SCAR*').endsWith('*SCAR*') && !/R\$/.test(MENSAGENS.letreiro('*SCAR*')));

// Custo, lucro e socios do /editor so no computador da loja.
ok('interno so no localhost', ehInterno('localhost') && ehInterno('127.0.0.1') && ehInterno('[::1]') && !ehInterno('scarprint.com.br') && !ehInterno('alehscm.github.io'));
ok('?cliente=1 mostra a versao do cliente no localhost', !ehInterno('localhost', '?cliente=1') && ehInterno('localhost', '?x=1'));
const folha = fs.readFileSync('features/orcamento/Orcamento.tsx', 'utf8');
const cliente = folha.slice(folha.indexOf('function FolhaCliente'), folha.indexOf('function FolhaInterna'));
ok('folha do cliente sem custo, lucro, margem nem socio', cliente.length > 200 && !/custo|lucro|margem|s[oó]cio|brl\(/i.test(cliente));
ok('painel e folha trocam pela regra de interno', /useInterno\(\) \? <PainelCustos \/> : <PainelCliente \/>/.test(folha) && /useInterno\(\) \? <FolhaInterna \/> : <FolhaCliente \/>/.test(folha));

const fonte = fs.readFileSync('lib/marketplace/produtos.ts', 'utf8');
ok('sem valores em reais no cadastro (custos ficam fora do repo)', !/R\$\s*\d/.test(fonte));
ok('sem nomes de arquivo da Downloads no cadastro (repo publico)', !/\.(3mf|stl|zip|ai|pdf|obj|step)\b/i.test(fonte) && PRODUTOS.every((p) => !p.ref || /^(?:[TN]\d{2}|M\d{3})$/.test(p.ref)));
ok('sem personagem com marca registrada', !/aranha|spider|marvel|disney|pok[eé]mon|\bmario\b|harry potter|hogwarts|batman|deadpool|jujutsu|esponja bob|bob esponja/i.test(fonte + fs.readFileSync('data/produtos.json', 'utf8')));

// Carrinho de orcamento e textos comerciais
const msg = MENSAGENS.orcamento([{ nome: 'Chaveiro com nome', quantidade: 3, cor: 'azul', observacao: 'nome Ana' }, { nome: 'Topo de bolo', quantidade: 1 }]);
ok('mensagem do orçamento lista peça, quantidade, cor e observação', msg.includes('1. Chaveiro com nome (3 un.) - cor: azul; obs.: nome Ana') && msg.includes('2. Topo de bolo (1 un.)') && !msg.includes('2. Topo de bolo (1 un.) -'), msg);
// As promessas da loja ficam nas vantagens (os banners citam produtos, como a placa de Pix).
const lojaTxt = JSON.stringify(VANTAGENS);
ok('vantagens sem frete, pagamento, prazo ou avaliação inventados', !/frete|gr[aá]tis|\bpix\b|cart[aã]o de cr[eé]dito|entrega em|avalia[cç][aã]o|estrelas|★|mais vendid|garantia/i.test(lojaTxt));
ok('como funciona: 3 passos, cada um com título e texto', COMO_FUNCIONA.length === 3 && COMO_FUNCIONA.every((p) => p.titulo.trim() && p.texto.trim()));
ok('perguntas frequentes sem frete, pagamento, prazo ou avaliação inventados', PERGUNTAS.length > 0 && !/frete|gr[aá]tis|\bpix\b|cart[aã]o de cr[eé]dito|entrega em|\d+\s*dias|avalia[cç][aã]o|estrelas|★|mais vendid|garantia/i.test(JSON.stringify(PERGUNTAS)));
// Personalizar no produto: toda peca com gerador mostra campos; resumo legivel; vai na mensagem.
const comGerador = publicos.filter((p) => !!geradorDe(p));
const semCampos = comGerador.filter((p) => { const g = geradorDe(p)!; return camposPrincipais(g, valoresIniciais(g)).length === 0; });
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
// Especial de Natal: chave manual em lib/marketplace/campanhas.ts.
const enfeite = PRODUTOS.find((p) => p.slug === 'enfeite-floco-neve');
ok('Natal: o enfeite é peça da campanha e some com a chave desligada', !!enfeite && enfeite.campanha === 'natal' && !podeAparecer(enfeite, () => false) && podeAparecer(enfeite, () => true));
ok('Natal: a chave decide se o enfeite está na loja agora', publicos.some((p) => p.slug === 'enfeite-floco-neve') === campanhaAtiva('natal'));
const presetsRuins = Object.entries(PRESETS_NATAL).flatMap(([g, v]) => { const r = receitaPorId(g); return !r ? [g] : Object.keys(v).filter((k) => !r.parametros.some((p) => p.id === k)).map((k) => `${g}.${k}`); });
ok('Natal: todo preset usa gerador e parâmetro que existem', !presetsRuins.length, presetsRuins.join(', '));
ok('Natal: vitrines só com peças cadastradas', VITRINES_NATAL.every((v) => v.slugs.every((s) => PRODUTOS.some((p) => p.slug === s))));
ok('Natal: textos sem prazo, frete ou promessa de entrega', !/frete|gr[aá]tis|\bpix\b|chega antes|entrega|\d+\s*dias|garantia|prazo de/i.test(JSON.stringify(TEXTOS_NATAL)));
ok('Natal: contagem certa (5/out → 81, 25/dez → 0, 26/dez → 364)', diasAteONatal(new Date(2026, 9, 5)) === 81 && diasAteONatal(new Date(2026, 11, 25)) === 0 && diasAteONatal(new Date(2026, 11, 26)) === 364);
ok('Natal no site: peças de Natal cadastradas e sem fitinha com a chave desligada', SLUGS_NATAL.length > 0 && SLUGS_NATAL.every((s) => PRODUTOS.some((p) => p.slug === s)) && !pecaDeNatal('chaveiro-nome', () => false) && pecaDeNatal('chaveiro-nome', () => true) && !pecaDeNatal('placa-pix', () => true));
const homeNatal = fs.readFileSync('features/marketplace/MarketplaceHome.tsx', 'utf8');
const topoLoja = fs.readFileSync('features/marketplace/TopoLoja.tsx', 'utf8');
ok('Natal no site: com a chave ligada a home abre no banner de Natal com fotos e na Coleção de Natal; o enfeite ao vivo vira bloco', /const natal = campanhaAtiva\('natal'\)/.test(homeNatal) && /<TopoLoja natal=\{natal\} \/>/.test(homeNatal) && /natal && doNatal\.length > 0/.test(homeNatal) && /<TopoNatal nivel="h2" \/>/.test(homeNatal) && /FOTOS_TOPO_NATAL/.test(topoLoja) && FOTOS_TOPO_NATAL.every((s) => porSecao('natal').some((p) => p.slug === s && p.midias.length > 0)));
const cabecalho = fs.readFileSync('components/loja/Cabecalho.tsx', 'utf8');
ok('Natal no site: luzes, gorro e faixa do cabeçalho só com a chave ligada', /const natal = campanhaAtiva\('natal'\)/.test(cabecalho) && /const varal = natal && /.test(cabecalho) && /\{varal && <FioDeLuzes \/>\}/.test(cabecalho) && /\{natal && <GorroNoel/.test(cabecalho));
const paginaNatal = fs.readFileSync('app/natal/page.tsx', 'utf8');
ok('Natal: com a chave desligada a página continua no ar com o aviso', !/notFound\(/.test(paginaNatal) && /volta em novembro/.test(paginaNatal));
ok('banners apontam para peças públicas', BANNERS.every((b) => !!porSlug(b.produto)));

// Home: nenhuma peca em duas vitrines, as com imagem antes, secao vazia fora dos atalhos.
const [a1, a2, a3] = [publicos.slice(0, 4), publicos.slice(2, 8), publicos.slice(0, 5)];
const unicas = semRepetir([a1, a2, a3]);
const todasUnicas = unicas.flat().map((p) => p.slug);
ok('vitrines da home sem peça repetida', new Set(todasUnicas).size === todasUnicas.length && unicas[0]!.length === 4 && unicas[1]!.every((p) => !a1.includes(p)));
ok('vitrine que ficaria com menos de 3 peças some', unicas[2]!.length === 0);
const ordenadas = comImagemPrimeiro(publicos.map(paraResumo));
const primeiraSem = ordenadas.findIndex((p) => !temImagem(p));
ok('peças com imagem antes de "Imagem em preparação"', ordenadas.length === publicos.length && (primeiraSem < 0 || ordenadas.slice(primeiraSem).every((p) => !temImagem(p))));
ok('menu, rodapé e atalhos só com seções que têm peça', secoesComPecas().every((s) => porSecao(s).length > 0) && secoesComContagem().filter((c) => c.total > 0).length === secoesComPecas().length);
// ---- API da loja (GET): a pagina leva so o que mostra ----
const listaApi = respostaDaLista(produtosPublicos());
const camposResumo = 'adicionadoEm,capa,destaque,gerador,nome,personalizavel,preco,secao,slug,termos,tipo';
ok('API /produtos: so publicos, destaques primeiro, total certo', listaApi.total === publicos.length && listaApi.itens.length === publicos.length && listaApi.itens.every((r) => publicos.some((p) => p.slug === r.slug)) && (() => { const i = listaApi.itens.findIndex((r) => !r.destaque); return i < 0 || listaApi.itens.slice(i).every((r) => !r.destaque); })());
ok('API: resumo so com os campos do card (sem descricao, credito, licenca)', listaApi.itens.every((r) => Object.keys(r).sort().join() === camposResumo));
ok('API por secao: so as publicas da secao', ORDEM_SECOES.every((s) => JSON.stringify(respostaDaLista(porSecao(s)).itens.map((r) => r.slug)) === JSON.stringify(porSecao(s).map((p) => p.slug))) && ENDPOINTS.secao('decoracao') === 'secoes/decoracao/produtos.json' && ENDPOINTS.produtos === 'produtos.json');
const primeira = paginaInicial(porSecao('decoracao'));
ok('listagem: no HTML so a primeira pagina, com total e filtros da lista inteira', primeira.inicial.length === Math.min(POR_PAGINA, porSecao('decoracao').length) && primeira.total === porSecao('decoracao').length && primeira.filtros.reduce((t, x) => t + x.total, 0) === primeira.total);
ok('rotas GET estaticas da API existem', fs.existsSync('app/api/produtos.json/route.ts') && fs.existsSync('app/api/secoes/[secao]/produtos.json/route.ts') && ['app/api/produtos.json/route.ts', 'app/api/secoes/[secao]/produtos.json/route.ts'].every((f) => /export const dynamic = 'force-static'/.test(fs.readFileSync(f, 'utf8'))));
ok('busca e orcamento sem a lista no HTML (GET na API)', !/produtosPublicos\(\)/.test(fs.readFileSync('app/busca/page.tsx', 'utf8')) && /useLista\(ENDPOINTS\.produtos/.test(fs.readFileSync('components/loja/Busca.tsx', 'utf8')) && /useLista\(/.test(fs.readFileSync('components/loja/Orcamento.tsx', 'utf8')));
ok('produto: relacionados por GET, sem a secao no HTML', /<PrateleiraRemota[^>]*fonte=\{ENDPOINTS\.secao\(p\.secao\)\}/.test(fs.readFileSync('app/produto/[slug]/page.tsx', 'utf8')) && !/porSecao\(/.test(fs.readFileSync('app/produto/[slug]/page.tsx', 'utf8')));

const card = fs.readFileSync('components/loja/CardProduto.tsx', 'utf8');
ok('card mostra "Sob consulta" ou "a partir de"', /'Sob consulta'/.test(card) && /a partir de \$\{textoDoPreco\(p\)\}/.test(card));

console.log(`\n${total - falhas}/${total} passaram\n`);
if (falhas) process.exit(1);
