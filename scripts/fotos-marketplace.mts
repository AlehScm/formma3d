/**
 * Junta as fotos da loja: cada pasta `public/marketplace/<slug>/` vira a lista de fotos do
 * produto (ordem alfabetica: a primeira e a capa). Recusa pasta de produto oculto ou que
 * nao existe, para nao publicar foto de modelo sem licenca.
 *   npx tsx scripts/fotos-marketplace.mts
 */
import fs from 'fs';
import path from 'path';
import { PRODUTOS } from '../lib/marketplace/produtos';
import { podeAparecer } from '../lib/marketplace/consultas';

const raiz = 'public/marketplace';
const fotos: Record<string, string[]> = {};
const erros: string[] = [], avisos: string[] = [];
for (const slug of fs.existsSync(raiz) ? fs.readdirSync(raiz).sort() : []) {
  const dir = path.join(raiz, slug);
  if (!fs.statSync(dir).isDirectory()) continue;
  const p = PRODUTOS.find((x) => x.slug === slug);
  if (!p) { erros.push(`${slug}: não há produto com esse slug`); continue; }
  if (!podeAparecer(p)) { erros.push(`${slug}: produto oculto (licença a verificar) — foto não publicada`); continue; }
  const arqs = fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f)).sort();
  for (const f of arqs) {
    const kb = fs.statSync(path.join(dir, f)).size / 1024;
    if (kb > 800) avisos.push(`${slug}/${f}: ${Math.round(kb)} KB (melhor abaixo de 800 KB para o site carregar rápido)`);
  }
  if (arqs.length) fotos[slug] = arqs.map((f) => `marketplace/${slug}/${f}`);
}
const corpo = Object.entries(fotos).map(([s, l]) => `  '${s}': [${l.map((x) => `'${x}'`).join(', ')}],`).join('\n');
fs.writeFileSync('lib/marketplace/fotos.ts', `/**\n * Fotos da loja por produto. GERADO por \`npx tsx scripts/fotos-marketplace.mts\` a partir\n * de \`public/marketplace/<slug>/\` (nao editar a mao).\n */\nexport const FOTOS: Record<string, string[]> = {${corpo ? `\n${corpo}\n` : ''}};\n`);
console.log(`${Object.keys(fotos).length} produto(s) com foto, ${Object.values(fotos).flat().length} foto(s).`);
for (const a of avisos) console.log('aviso:', a);
for (const e of erros) console.log('ERRO:', e);
if (erros.length) process.exit(1);
