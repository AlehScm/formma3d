/**
 * Banco mockado da loja: `data/produtos.json`, um registro por peca, todos com as mesmas
 * colunas (vazio = `null`). E o lugar de preencher descricao, preco, secao e fotos. O site e
 * estatico, entao o banco e lido no build; trocar por um banco de verdade e trocar `lerBanco`.
 * Registro invalido para o build com o slug e o campo. Novos geradores entram por
 * `npm run banco:sincronizar` (scripts/banco-produtos.mts), que nunca mexe no que ja existe.
 * O repo e publico: nada de arquivo, foto, preco de custo ou cliente aqui (`ref` e opaca).
 */
import dados from '../../data/produtos.json';
import { FOTOS } from './fotos';
import { ORDEM_SECOES, TAGS, type Produto } from './tipos';

/** Linha do banco: o `Produto` com `null` no lugar do que esta vazio. */
export interface RegistroProduto {
  slug: string;
  nome: string;
  tags: string[];
  gerador: string | null;
  secao: string;
  tipo: string;
  resumo: string;
  descricao: string;
  personalizavel: string[];
  preco: { status: string; valor?: number };
  midias: string[];
  personalizar: { href: string; rotulo: string } | null;
  origem: string;
  licenca: string;
  visibilidade: string;
  destaque: boolean;
  jaImpresso: boolean;
  campanha: string | null;
  ref: string | null;
  revisar: boolean;
}

const umDe = <T extends string>(valor: unknown, opcoes: readonly T[]): valor is T => typeof valor === 'string' && (opcoes as readonly string[]).includes(valor);
const texto = (v: unknown) => typeof v === 'string' && v.trim() !== '';
const listaDeTexto = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === 'string');

/** Confere uma linha e devolve o `Produto`; erro com o slug e o campo. */
export function paraProduto(r: RegistroProduto, linha = 0): Produto {
  const erro = (campo: string) => new Error(`data/produtos.json, registro ${linha + 1} (${r?.slug ?? 'sem slug'}): campo "${campo}" invalido`);
  if (!r || typeof r !== 'object') throw erro('registro');
  if (typeof r.slug !== 'string' || !/^[a-z0-9-]+$/.test(r.slug)) throw erro('slug');
  for (const c of ['nome', 'tipo', 'resumo', 'descricao'] as const) if (!texto(r[c])) throw erro(c);
  if (!umDe(r.secao, ORDEM_SECOES)) throw erro('secao');
  if (!listaDeTexto(r.tags) || !r.tags.every((t) => umDe(t, TAGS))) throw erro('tags');
  const ehGerador = r.tags.includes('gerador');
  if (ehGerador !== (typeof r.gerador === 'string' && /^[a-z0-9-]+$/.test(r.gerador))) throw erro('gerador');
  if (r.tags.includes('editor') !== (!!r.personalizar && texto(r.personalizar.href) && texto(r.personalizar.rotulo))) throw erro('personalizar');
  if (!listaDeTexto(r.personalizavel) || !listaDeTexto(r.midias)) throw erro('personalizavel/midias');
  const preco = r.preco?.status === 'validacao' ? { status: 'validacao' as const }
    : r.preco?.status === 'definido' && typeof r.preco.valor === 'number' && r.preco.valor > 0 ? { status: 'definido' as const, valor: r.preco.valor } : null;
  if (!preco) throw erro('preco');
  if (!umDe(r.origem, ['nosso', 'terceiros'] as const)) throw erro('origem');
  if (!umDe(r.licenca, ['propria', 'a-verificar', 'comercial-ok'] as const)) throw erro('licenca');
  if (!umDe(r.visibilidade, ['publico', 'oculto'] as const)) throw erro('visibilidade');
  if (r.campanha !== null && !umDe(r.campanha, ['natal'] as const)) throw erro('campanha');
  if (typeof r.destaque !== 'boolean' || typeof r.jaImpresso !== 'boolean' || typeof r.revisar !== 'boolean') throw erro('destaque/jaImpresso/revisar');
  return {
    slug: r.slug, nome: r.nome, resumo: r.resumo, descricao: r.descricao, secao: r.secao, tipo: r.tipo,
    origem: r.origem, licenca: r.licenca, visibilidade: r.visibilidade, preco, personalizavel: r.personalizavel,
    midias: FOTOS[r.slug]?.length ? FOTOS[r.slug]! : r.midias,
    tags: r.tags as Produto['tags'],
    ...(ehGerador ? { gerador: r.gerador! } : {}),
    ...(r.personalizar ? { personalizar: r.personalizar } : {}),
    ...(r.destaque ? { destaque: true } : {}),
    ...(r.jaImpresso ? { jaImpresso: true } : {}),
    ...(r.campanha ? { campanha: r.campanha } : {}),
    ...(r.ref ? { ref: r.ref } : {}),
    ...(r.revisar ? { revisar: true } : {}),
  };
}

/** Todos os registros do banco, conferidos; slug repetido tambem para o build. */
export function lerBanco(registros: RegistroProduto[] = dados as unknown as RegistroProduto[]): Produto[] {
  const produtos = registros.map(paraProduto);
  const vistos = new Set<string>();
  for (const p of produtos) {
    if (vistos.has(p.slug)) throw new Error(`data/produtos.json: slug repetido "${p.slug}"`);
    vistos.add(p.slug);
  }
  return produtos;
}
