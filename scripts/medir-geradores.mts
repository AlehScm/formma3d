/**
 * Tempo de cada gerador (gerar + malha) com o exemplo da ficha, os mais lentos primeiro.
 *   npx tsx scripts/medir-geradores.mts
 */
import fs from 'fs';
import type { Font } from 'opentype.js';
import { parseFont } from '../lib/text/glyphs';
import { RECEITAS } from '../lib/gerador/receitas';
import { FICHAS } from '../lib/gerador/receitas/fichas';
import { valoresPadrao, valoresValidos } from '../lib/gerador/tipos';
import { posicoesDaPeca } from '../lib/gerador/malha';
const fontes = new Map<string, Font>();
const arq = (id: string) => (id === 'noto-emoji' ? 'seguiemj.ttf' : ['lobster', 'pacifico'].includes(id) ? 'segoescb.ttf' : 'arialbd.ttf');
const ctx = { fonte: (id: string) => { const f = arq(id); if (!fontes.has(f)) fontes.set(f, parseFont(fs.readFileSync(`C:/Windows/Fonts/${f}`).buffer as ArrayBuffer)); return fontes.get(f)!; } };
const linhas: [string, number, number, number][] = [];
for (const r of RECEITAS) {
  const f = FICHAS.find((x) => x.id === r.id);
  const v = valoresValidos(r, { ...valoresPadrao(r), ...(f?.exemplo ?? {}) });
  r.gerar(v, ctx); // aquece
  let t = performance.now();
  const res = r.gerar(v, ctx);
  const tg = performance.now() - t;
  t = performance.now();
  let tri = 0;
  for (const it of res.itens) for (const p of it.pecas) tri += posicoesDaPeca(p).length / 9;
  const tm = performance.now() - t;
  linhas.push([r.id, tg, tm, tri]);
}
linhas.sort((a, b) => b[1] + b[2] - a[1] - a[2]);
for (const [id, tg, tm, tri] of linhas.slice(0, 20)) console.log(id.padEnd(24), `gerar ${tg.toFixed(0).padStart(6)} ms`, `malha ${tm.toFixed(0).padStart(6)} ms`, `${Math.round(tri)} tri`);
