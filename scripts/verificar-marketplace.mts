/**
 * Regras da loja: o que e oculto nunca aparece, terceiro sem licenca e oculto, nada de
 * preco antes da validacao, links de personalizar existem e o WhatsApp so com numero.
 *   npx tsx scripts/verificar-marketplace.mts
 */
import fs from 'fs';
import { CATEGORIAS, MENSAGENS, PRODUTOS, buscar, categoriasComProdutos, linkWhatsapp, porSlug, produtosPublicos, textoDoPreco, type Produto } from '../lib/marketplace/index';
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
ok('categorias validas', PRODUTOS.every((p) => p.categoria in CATEGORIAS));
ok('todo produto tem nome, resumo e descricao', PRODUTOS.every((p) => p.nome.trim() && p.resumo.trim() && p.descricao.trim()));

const publicos = produtosPublicos();
ok('oculto nunca e publico', publicos.every((p) => p.visibilidade === 'publico'));
const terceirosSemLicenca = PRODUTOS.filter((p) => p.origem === 'terceiros' && p.licenca !== 'comercial-ok');
ok('terceiro sem licenca confirmada esta oculto e fora da vitrine', terceirosSemLicenca.every((p) => p.visibilidade === 'oculto' && !publicos.includes(p)), terceirosSemLicenca.filter((p) => publicos.includes(p)).map((p) => p.slug).join(', '));
ok('terceiro publico so com licenca comercial confirmada (mesmo se marcado publico)', produtosPublicos([{ ...terceirosSemLicenca[0]!, visibilidade: 'publico' }]).length === 0);
ok('porSlug nao acha produto oculto', terceirosSemLicenca.every((p) => !porSlug(p.slug)));
ok('busca nao devolve oculto', buscar('polvo').length === 0 && buscar('fidget').length === 0);
ok('ha produtos publicos em pelo menos 4 categorias', categoriasComProdutos().length >= 4, categoriasComProdutos().join(', '));

ok('nenhum preco publicado antes da validacao', PRODUTOS.every((p) => p.preco.status === 'validacao'));
ok('texto do preco em validacao', publicos.every((p) => textoDoPreco(p) === 'Preço em validação'));
ok('sem fotos de terceiros e sem midia faltando', PRODUTOS.every((p) => p.midias.every((m) => fs.existsSync(`public/${m.replace(/^\//, '')}`))) && terceirosSemLicenca.every((p) => !p.midias.length));

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
ok('busca por categoria', buscar('', 'cozinha').every((p) => p.categoria === 'cozinha') && buscar('', 'cozinha').length > 0);

ok('WhatsApp sem numero: sem link (botao em breve)', linkWhatsapp('oi', '') === null);
const l = linkWhatsapp(MENSAGENS.produto(publicos[0]!), '+55 (19) 99999-0000');
ok('WhatsApp com numero: so digitos e mensagem codificada', l === `https://wa.me/5519999990000?text=${encodeURIComponent(MENSAGENS.produto(publicos[0]!))}`, l ?? '');

const fonte = fs.readFileSync('lib/marketplace/produtos.ts', 'utf8');
ok('sem valores em reais no cadastro (custos ficam fora do repo)', !/R\$\s*\d/.test(fonte));
ok('sem nomes de arquivo da Downloads no cadastro (repo publico)', !/\.(3mf|stl|zip|ai|pdf|obj|step)/i.test(fonte) && PRODUTOS.every((p) => !p.ref || /^[TN]\d{2}$/.test(p.ref)));
ok('sem personagem com marca registrada', !/aranha|spider|marvel|disney|pokemon|mario/i.test(fonte));

console.log(`\n${total - falhas}/${total} passaram\n`);
if (falhas) process.exit(1);
