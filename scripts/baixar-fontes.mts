/**
 * Copia as fontes da lista (lib/text/fontes.ts) para public/fontes, com a licenca de
 * cada familia: o site funciona sem o CDN. Rodar de novo quando a lista mudar.
 *   npx tsx scripts/baixar-fontes.mts
 */
import fs from 'fs';
import path from 'path';
import { FONTE_EMOJI, FONTES_WEB } from '../lib/text/fontes';

const DESTINO = path.join(process.cwd(), 'public', 'fontes');
fs.mkdirSync(path.join(DESTINO, 'licencas'), { recursive: true });

const familias = new Set<string>();
for (const f of [...FONTES_WEB, FONTE_EMOJI]) {
  const res = await fetch(f.url);
  if (!res.ok) throw new Error(`${f.nome}: ${res.status}`);
  fs.writeFileSync(path.join(DESTINO, `${f.id}.ttf`), Buffer.from(await res.arrayBuffer()));
  familias.add(f.url.split('/fonts/')[1]!.split('@')[0]!);
  console.log('ok', f.id);
}
for (const familia of familias) {
  const res = await fetch(`https://cdn.jsdelivr.net/npm/@fontsource/${familia}/LICENSE`);
  if (!res.ok) throw new Error(`licenca ${familia}: ${res.status}`);
  fs.writeFileSync(path.join(DESTINO, 'licencas', `${familia}.txt`), await res.text());
}
console.log(`${FONTES_WEB.length + 1} fontes e ${familias.size} licencas em public/fontes`);
