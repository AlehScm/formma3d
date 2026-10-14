import { readFile } from 'node:fs/promises';
import {
  codificarSnapshotModelo,
  configDoFragmento,
  decodificarSnapshotModelo,
  fragmentoAposHandoff,
  hrefComSnapshotModelo,
  modeloDaRotaEditor,
  type SnapshotModelo,
} from '../lib/gerador/handoff';
import { receitaPorId } from '../lib/gerador/receitas';
import { hrefParaEditor, valoresIniciais } from '../lib/marketplace/personalizar';
import { PRESETS_NATAL } from '../lib/marketplace/campanhas';

let falhas = 0;
let total = 0;
const ok = (nome: string, condicao: boolean) => {
  total++;
  if (!condicao) falhas++;
  console.log(`${condicao ? '  ok   ' : ' FALHA '} ${nome}`);
};
const rejeita = (f: () => unknown) => {
  try { f(); return false; } catch { return true; }
};

const nomes = { versao: 1 as const, receita: 'chaveiro-nome', valores: { nomes: 'Mãe 🦋', corBase: '#123456', corMeio: '#abcdef', corTopo: '#F0A020', posicoesArgola: '{"Ana":{"x":1,"y":2}}' } };
const schemaChaveiro = receitaPorId(nomes.receita)!;
const nomesCodificados = codificarSnapshotModelo(nomes, schemaChaveiro);
ok('codec preserva Unicode, cores e extensão primitiva', JSON.stringify(decodificarSnapshotModelo(nomesCodificados, nomes.receita, schemaChaveiro)?.valores) === JSON.stringify(nomes.valores));
const medidas = { versao: 1 as const, receita: 'porta-canetas-grade', valores: { colunas: 5, linhas: 3, altura: 42 } };
ok('codec preserva medidas numéricas', JSON.stringify(decodificarSnapshotModelo(codificarSnapshotModelo(medidas), medidas.receita)?.valores) === JSON.stringify(medidas.valores));
ok('ausência de configuração mantém o caminho antigo', decodificarSnapshotModelo(null, nomes.receita) === null);

const v2 = encodeURIComponent(JSON.stringify({ ...nomes, versao: 2 }));
ok('codec rejeita versão incompatível', rejeita(() => decodificarSnapshotModelo(v2, nomes.receita)));
ok('codec rejeita divergência entre receita e modelo', rejeita(() => decodificarSnapshotModelo(nomesCodificados, 'porta-canetas-grade')));
ok('codec rejeita valor não primitivo', rejeita(() => codificarSnapshotModelo({ ...nomes, valores: { nomes: { texto: 'Mãe' } } } as unknown as SnapshotModelo)));
ok('codec rejeita número não finito', rejeita(() => codificarSnapshotModelo({ versao: 1, receita: 'porta-canetas-grade', valores: { altura: Number.POSITIVE_INFINITY } })));
const schemaLogo = receitaPorId('logo-camadas')!;
ok('codec rejeita SVG preenchido', rejeita(() => codificarSnapshotModelo({ versao: 1, receita: 'logo-camadas', valores: { desenho: '<svg/>' } }, schemaLogo)));
ok('codec rejeita schema divergente', rejeita(() => codificarSnapshotModelo(nomes, schemaLogo)));
ok('codec rejeita configuração acima de 16 KB', rejeita(() => codificarSnapshotModelo({ ...nomes, valores: { ...nomes.valores, nomes: '🦋'.repeat(2000) } })));
ok(
  'codec rejeita chaves especiais de objeto',
  ['__proto__', 'constructor', 'prototype'].every((chave) => rejeita(() => codificarSnapshotModelo({ ...nomes, valores: { [chave]: 'x' } } as SnapshotModelo)))
);

const href = hrefComSnapshotModelo('/pages/moldes/chaveiro-nome?tema=natal&origem=produto#cores', nomes, '/pages', schemaChaveiro);
const url = new URL(href, 'https://formma3d.invalid');
ok('href legado preserva query e prepara o fragmento da configuração', url.pathname === '/design' && url.searchParams.get('tema') === 'natal' && url.searchParams.get('origem') === 'produto' && url.hash.includes('__from=cores'));
const hrefFinal = hrefComSnapshotModelo('/pages/moldes/chaveiro-nome?tema=natal&origem=produto#cores', nomes, '/pages', schemaChaveiro);
const urlFinal = new URL(hrefFinal, 'https://formma3d.invalid');
const configFinal = configDoFragmento(urlFinal.hash);
ok('href envia snapshot no fragmento, sem dupla codificação', urlFinal.hash.startsWith('#config=%7B') && configFinal.codificado !== null && decodificarSnapshotModelo(configFinal.codificado, nomes.receita, schemaChaveiro)?.valores.nomes === 'Mãe 🦋');
ok('snapshot não aparece na query que será enviada ao servidor', !urlFinal.searchParams.has('config'));
ok('href restaura o fragmento original após consumir config', fragmentoAposHandoff(urlFinal.hash) === '#cores');
ok('configDoFragmento rejeita valores duplicados', rejeita(() => configDoFragmento('#config=abc&config=def')));
ok('href aceita /design/id legado com basePath', hrefComSnapshotModelo('/pages/design/chaveiro-nome?x=1', nomes, '/pages').startsWith('/design?x=1&modelo=chaveiro-nome#config=%7B'));
ok('parser reconhece rotas antigas sob basePath', modeloDaRotaEditor('/pages/moldes/chaveiro-nome', '/pages') === nomes.receita && modeloDaRotaEditor('/pages/design/chaveiro-nome', '/pages') === nomes.receita);
ok('href rejeita destino externo ou editor especializado', rejeita(() => hrefComSnapshotModelo('https://example.com/design', nomes)) && rejeita(() => hrefComSnapshotModelo('/editor', nomes)));
ok('href rejeita ID de rota divergente', rejeita(() => hrefComSnapshotModelo('/design/porta-canetas-grade', nomes)));

const rascunho = { nome: 'rascunho do usuário', marcador: 7 };
let atual = rascunho;
let carregamentos = 0;
try {
  const valores = decodificarSnapshotModelo(v2, nomes.receita, receitaPorId(nomes.receita));
  if (valores) { atual = { nome: 'substituído', marcador: 0 }; carregamentos++; }
} catch { /* erro visível no editor, sem confirmar o carregamento */ }
ok('configuração inválida não substitui nem carrega sobre o rascunho', atual === rascunho && carregamentos === 0);

const valoresProduto = valoresIniciais('letra-grande', { ...PRESETS_NATAL['letra-grande'], nome: 'Lia QA' });
const urlProduto = new URL(hrefParaEditor('letra-grande', '/design?modelo=letra-grande', valoresProduto), 'https://formma3d.invalid');
const snapshotProduto = decodificarSnapshotModelo(configDoFragmento(urlProduto.hash).codificado, 'letra-grande', receitaPorId('letra-grande'));
ok('integração da loja preserva configuração completa, campanha e última edição', JSON.stringify(snapshotProduto?.valores) === JSON.stringify(valoresProduto));
const componente = await readFile(new URL('../components/loja/Personalizar.tsx', import.meta.url), 'utf8');
ok('loja mantém receitas e resolução do handoff sob demanda', !/from ['"]@\/lib\/gerador\/(?:receitas|exemplo|handoff)['"]/.test(componente));

console.log(`\n${total - falhas}/${total} passaram\n`);
if (falhas) process.exit(1);
