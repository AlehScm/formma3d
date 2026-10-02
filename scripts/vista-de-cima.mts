/**
 * Vista de cima dos exemplos do catalogo, em PNG, sem navegador (para conferir geometria
 * quando nao ha WebGL): cada camada pintada na cor da peca, da mais baixa para a mais
 * alta, escurecida pela altura.
 *   npx tsx scripts/vista-de-cima.mts <pasta> [id | id={json com valores} ...]
 *   CORTE=0 npx tsx scripts/vista-de-cima.mts <pasta> id   (corte no plano y = 0)
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import type { Font } from 'opentype.js';
import { parseFont } from '../lib/text/glyphs';
import { RECEITAS } from '../lib/gerador/receitas';
import { FICHAS } from '../lib/gerador/receitas/fichas';
import { valoresPadrao, valoresValidos } from '../lib/gerador/tipos';
import { CORES_PREVIA } from '../lib/gerador/malha';
import type { Region } from '../lib/geom/region';

const [pasta, ...ids] = process.argv.slice(2);
/** CORTE=<y> no ambiente: em vez da vista de cima, o corte da peca no plano y. */
const CORTE = process.env.CORTE !== undefined ? Number(process.env.CORTE) : null;
if (!pasta) throw new Error('uso: vista-de-cima.mts <pasta> [id ...]');
fs.mkdirSync(pasta, { recursive: true });

const arquivo = (id: string) =>
  id === 'noto-emoji' ? 'seguiemj.ttf' : ['lobster', 'pacifico'].includes(id) ? 'segoescb.ttf' : id === 'archivo-black' ? 'ariblk.ttf' : 'arialbd.ttf';
const fontes = new Map<string, Font>();
const ctx = {
  fonte: (id: string) => {
    const f = arquivo(id);
    if (!fontes.has(f)) fontes.set(f, parseFont(fs.readFileSync(`C:/Windows/Fonts/${f}`).buffer as ArrayBuffer));
    return fontes.get(f)!;
  },
};

function png(w: number, h: number, rgb: Uint8Array): Buffer {
  const linhas = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    linhas[y * (w * 3 + 1)] = 0;
    Buffer.from(rgb.buffer, y * w * 3, w * 3).copy(linhas, y * (w * 3 + 1) + 1);
  }
  const crcTab = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b: Buffer) => { let c = 0xffffffff; for (const x of b) c = crcTab[(c ^ x) & 0xff]! ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const bloco = (tipo: string, dados: Buffer) => {
    const t = Buffer.concat([Buffer.from(tipo), dados]);
    const len = Buffer.alloc(4); len.writeUInt32BE(dados.length);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(t));
    return Buffer.concat([len, t, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloco('IHDR', ihdr), bloco('IDAT', zlib.deflateSync(linhas)), bloco('IEND', Buffer.alloc(0))]);
}

/** Preenche a regiao (par-impar) na imagem. */
function pintar(rgb: Uint8Array, W: number, H: number, r: Region, map: (x: number, y: number) => [number, number], cor: [number, number, number]) {
  const arestas: [number, number, number, number][] = [];
  for (const p of r) for (const anel of [p.outer, ...p.holes]) {
    for (let i = 0; i < anel.length; i++) {
      const a = map(anel[i]!.x, anel[i]!.y), b = map(anel[(i + 1) % anel.length]!.x, anel[(i + 1) % anel.length]!.y);
      arestas.push([a[0], a[1], b[0], b[1]]);
    }
  }
  for (let y = 0; y < H; y++) {
    const yc = y + 0.5, xs: number[] = [];
    for (const [x0, y0, x1, y1] of arestas) if ((y0 <= yc) !== (y1 <= yc)) xs.push(x0 + ((yc - y0) / (y1 - y0)) * (x1 - x0));
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.max(0, Math.ceil(xs[k]! - 0.5)); x < Math.min(W, Math.ceil(xs[k + 1]! - 0.5)); x++) rgb.set(cor, (y * W + x) * 3);
    }
  }
}

const hexRgb = (h: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];

// Cada id pode vir com valores proprios: "id" ou "id={json}" (o PNG sai como id-N.png).
const pedidos = ids.length ? ids.map((x, n) => { const i = x.indexOf('='); return i < 0 ? { id: x, extra: {}, arq: x } : { id: x.slice(0, i), extra: JSON.parse(x.slice(i + 1)), arq: `${x.slice(0, i)}-${n}` }; }) : FICHAS.map((f) => ({ id: f.id, extra: {}, arq: f.id }));
for (const { id, extra, arq } of pedidos) {
  const f = FICHAS.find((x) => x.id === id)!;
  const rec = RECEITAS.find((r) => r.id === f.id)!;
  const res = rec.gerar(valoresValidos(rec, { ...valoresPadrao(rec), ...(f.exemplo ?? {}), ...extra }), ctx);
  const camadas = res.itens.flatMap((it) => it.pecas.flatMap((p) => p.camadas.map((c) => ({ ...c, cor: p.cor }))));
  if (!camadas.length) { console.log(f.id, 'vazio', res.avisos); continue; }
  const pts = camadas.flatMap((c) => c.region.flatMap((p) => p.outer));
  const minX = Math.min(...pts.map((p) => p.x)), maxX = Math.max(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y)), maxY = Math.max(...pts.map((p) => p.y));
  const zMax = Math.max(...camadas.map((c) => c.z1));
  const W = 640, k = (W - 20) / Math.max(maxX - minX, (maxY - minY) * 1.0), H = Math.ceil((maxY - minY) * k) + 20;
  const rgb = new Uint8Array(W * H * 3).fill(238);
  const map = (x: number, y: number): [number, number] => [10 + (x - minX) * k, H - 10 - (y - minY) * k];
  if (CORTE !== null) {
    // Corte no plano y = CORTE: cada camada vira os trechos em x da linha y, entre z0 e z1.
    const Wc = 640, kc = (Wc - 20) / Math.max(maxX - minX, zMax), Hc = Math.ceil(zMax * kc) + 20;
    const img = new Uint8Array(Wc * Hc * 3).fill(238);
    for (const c of camadas) {
      const xs: number[] = [];
      for (const p of c.region) for (const anel of [p.outer, ...p.holes]) for (let i = 0; i < anel.length; i++) {
        const a = anel[i]!, b = anel[(i + 1) % anel.length]!;
        if ((a.y <= CORTE) !== (b.y <= CORTE)) xs.push(a.x + ((CORTE - a.y) / (b.y - a.y)) * (b.x - a.x));
      }
      xs.sort((a, b) => a - b);
      const cor = hexRgb(res.hex?.[c.cor] ?? CORES_PREVIA[c.cor % CORES_PREVIA.length]!);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const x0 = Math.round(10 + (xs[i]! - minX) * kc), x1 = Math.round(10 + (xs[i + 1]! - minX) * kc);
        const y0 = Math.round(Hc - 10 - c.z1 * kc), y1 = Math.round(Hc - 10 - c.z0 * kc);
        for (let y = Math.max(0, y0); y < Math.min(Hc, Math.max(y1, y0 + 1)); y++) for (let x = Math.max(0, x0); x < Math.min(Wc, Math.max(x1, x0 + 1)); x++) img.set(cor, (y * Wc + x) * 3);
      }
    }
    fs.writeFileSync(path.join(pasta, `${arq}-corte.png`), png(Wc, Hc, img));
    console.log(arq, 'corte em y =', CORTE, res.avisos.join(' | '));
    continue;
  }
  for (const c of [...camadas].sort((a, b) => a.z1 - b.z1)) {
    const base = hexRgb(res.hex?.[c.cor] ?? CORES_PREVIA[c.cor % CORES_PREVIA.length]!);
    const luz = 0.55 + 0.45 * (c.z1 / zMax);
    pintar(rgb, W, H, c.region, map, base.map((x) => Math.round(x * luz)) as [number, number, number]);
  }
  fs.writeFileSync(path.join(pasta, `${arq}.png`), png(W, H, rgb));
  console.log(arq, `${(maxX - minX).toFixed(0)} x ${(maxY - minY).toFixed(0)} x ${zMax.toFixed(1)} mm`, res.avisos.join(' | '));
}
