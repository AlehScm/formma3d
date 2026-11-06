/**
 * Integra ao banco (data/produtos.json) os modelos MakerWorld do levantamento
 * (data/makerworld/catalogo.json): credito ao autor (com a licenca original) e
 * `visibilidade: publico`. As fotos ficam no projeto, em public/marketplace/<slug>/
 * (depois: `npx tsx scripts/fotos-marketplace.mts`). Os "fora" (marca registrada de terceiros
 * e brinquedos) nao entram. Rodar de novo nao muda nada.
 *   npx tsx scripts/makerworld-integrar.mts
 */
import fs from 'fs';
import type { RegistroProduto } from '../lib/marketplace/banco';

interface ItemLevantamento {
  ref: string | null;
  slug: string | null;
  situacao: 'cadastrado' | 'ja-cadastrado' | 'fora';
  fotos: string[];
  makerworld: { id: number; url: string; titulo: string; autor: string; autorUrl: string };
  licenca: { codigo: string };
}

const ARQ_BANCO = 'data/produtos.json';
const texto = fs.readFileSync(ARQ_BANCO, 'utf8');
const banco = JSON.parse(texto) as RegistroProduto[];
const levantamento = JSON.parse(fs.readFileSync('data/makerworld/catalogo.json', 'utf8')) as ItemLevantamento[];
const erros: string[] = [];

const entram = levantamento.filter((i) => i.situacao !== 'fora');
const ids = new Set<number>();
for (const i of entram) {
  const r = banco.find((x) => x.ref === i.ref);
  if (!r || r.slug !== i.slug) { erros.push(`${i.ref} ${i.slug}: nao achado no banco com esse slug`); continue; }
  if (ids.has(i.makerworld.id)) erros.push(`${i.ref}: modelo MakerWorld repetido (${i.makerworld.id})`);
  ids.add(i.makerworld.id);
  const faltando = i.fotos.filter((f) => !fs.existsSync(f));
  if (!i.fotos.length || faltando.length) erros.push(`${i.ref}: foto faltando no projeto (${faltando[0] ?? 'nenhuma foto'})`);
  const { autor, autorUrl, titulo, url } = i.makerworld;
  r.credito = { autor, autorUrl, titulo, url, plataforma: 'MakerWorld', licencaOriginal: i.licenca.codigo };
  r.visibilidade = 'publico';
}
const idsFora = new Set(levantamento.filter((i) => i.situacao === 'fora').map((i) => i.makerworld.id));
const vazou = banco.filter((r) => r.credito && idsFora.has(Number(r.credito.url.match(/models\/(\d+)/)?.[1])));
if (vazou.length) erros.push(`modelo "fora" no banco: ${vazou.map((r) => r.slug).join(', ')}`);
if (erros.length) { console.log(erros.join('\n')); process.exit(1); }

const novo = `${JSON.stringify(banco, null, 2)}\n`;
if (novo !== texto) fs.writeFileSync(ARQ_BANCO, novo);
console.log(`${entram.length} modelos MakerWorld no banco, publicos e com credito (${novo === texto ? 'nada mudou' : 'banco atualizado'}).`);
