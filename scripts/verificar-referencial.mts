/**
 * Referencial da placa no 3D.
 *   npx tsx scripts/verificar-referencial.mts
 *
 * Existe por causa de um bug real: o arranjo calculava as posicoes certas (os
 * testes de arranjo medem em coordenadas da placa), mas o 3D desenhava as pecas
 * deslocadas, meio fora do quadrado. Aqui a transformacao e aplicada EXATAMENTE
 * como o Viewer3D faz -- grupo em -C, peca girando em torno do proprio centro c e
 * transladada por d -- e o resultado e medido contra a placa desenhada.
 */
import fs from 'fs';
import { parseFont, textToLetters, normalizeLetters } from '../lib/text/glyphs';
import { buildPart, PARAMS_PADRAO } from '../lib/geom/modes';
import { minThickness, regionBounds, type Pt, type Region } from '../lib/geom/region';
import { arrumar } from '../lib/print/arranjo';
import { acharImpressora, caberNaMesa } from '../lib/print/impressoras';
import { deslocamentosNaPlaca, paraCoordenadasDaPlaca, type Deslocamento } from '../features/viewport/referencial';

let falhas = 0;
let total = 0;
const ok = (nome: string, cond: boolean, detalhe = '') => {
  total++;
  if (!cond) falhas++;
  console.log(`${cond ? '  ok  ' : ' FALHA'}  ${nome}${detalhe ? '  -> ' + detalhe : ''}`);
};

/** O que o Viewer3D faz com um ponto: -C + c + d + R(p - c). */
function naCena(contorno: Region, d: Deslocamento, C: [number, number]): Pt[] {
  const b = regionBounds(contorno);
  const cx = b.minX + b.w / 2;
  const cy = b.minY + b.h / 2;
  const r = (d.giro * Math.PI) / 180;
  const cos = Math.cos(r);
  const sen = Math.sin(r);
  return contorno.flatMap((p) =>
    p.outer.map((q) => {
      const x = q.x - cx;
      const y = q.y - cy;
      return { x: -C[0] + cx + d.dx + x * cos - y * sen, y: -C[1] + cy + d.dy + x * sen + y * cos };
    })
  );
}

const caixa = (pts: Pt[]) => {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
};

const b = fs.readFileSync('C:/Windows/Fonts/arialbd.ttf');
const font = parseFont(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);

for (const [texto, alt, id] of [
  ['BARBEARIA', 150, 'x2d'],
  ['BARBEARIA', 150, 'a2l'],
  ['OLA', 90, 'x2d'],
] as const) {
  console.log(`\n== ${texto} ${alt}mm na ${id.toUpperCase()} ==`);
  const mesa = acharImpressora(id)!;
  const pecas = normalizeLetters(textToLetters(font, texto, { altura: alt, tracking: 0 })).map((l, i) => {
    const part = buildPart(l.region, PARAMS_PADRAO, minThickness(l.region));
    return { chave: `${l.nome}#${i}`, contorno: part.contorno, alturaZ: part.alturaZ };
  });

  // O centro que o Viewport passa: [largura/2, altura/2] do letreiro.
  const bl = regionBounds(pecas.flatMap((p) => p.contorno));
  const C: [number, number] = [bl.w / 2, bl.h / 2];

  const r = arrumar(
    pecas.map((p) => ({ nome: p.chave, region: p.contorno, giroQueCabe: caberNaMesa(p.contorno, p.alturaZ, mesa).giro })),
    mesa,
    3
  );
  const arranjo = new Map(r.colocadas.map((c) => [c.nome, c]));
  const d = deslocamentosNaPlaca(pecas, arranjo, r.sobraram, mesa, C);

  const tol = 0.05;
  const foraDaPlaca: string[] = [];
  for (const c of r.colocadas) {
    const p = pecas.find((x) => x.chave === c.nome)!;
    const k = caixa(naCena(p.contorno, d.get(c.nome)!, C));
    const dentro = k.minX >= -mesa.x / 2 - tol && k.maxX <= mesa.x / 2 + tol && k.minY >= -mesa.y / 2 - tol && k.maxY <= mesa.y / 2 + tol;
    if (!dentro) foraDaPlaca.push(`${c.nome} [${k.minX.toFixed(0)},${k.maxX.toFixed(0)}]x[${k.minY.toFixed(0)},${k.maxY.toFixed(0)}]`);
  }
  ok(`as ${r.colocadas.length} pecas colocadas aparecem DENTRO da placa desenhada`, foraDaPlaca.length === 0, foraDaPlaca.join(' ') || `placa ±${mesa.x / 2}×±${mesa.y / 2}`);

  if (r.sobraram.length) {
    const caixas = r.sobraram.map((k) => ({ k, c: caixa(naCena(pecas.find((x) => x.chave === k)!.contorno, d.get(k)!, C)) }));
    ok(`as ${r.sobraram.length} que sobraram ficam FORA da placa`, caixas.every(({ c }) => c.minX > mesa.x / 2), caixas.map(({ k, c }) => `${k}@${c.minX.toFixed(0)}`).join(' '));
    let colidem = 0;
    for (let i = 0; i < caixas.length; i++)
      for (let j = i + 1; j < caixas.length; j++) {
        const a = caixas[i]!.c;
        const e = caixas[j]!.c;
        if (a.minX < e.maxX && e.minX < a.maxX && a.minY < e.maxY && e.minY < a.maxY) colidem++;
      }
    ok('e nao se amontoam umas sobre as outras', colidem === 0, `${colidem} sobreposicoes`);
  }

  // Ida e volta: posicao efetiva sem delta volta exatamente ao que o arranjo disse.
  const erroMax = Math.max(
    0,
    ...r.colocadas.map((c) => {
      const v = paraCoordenadasDaPlaca(c.nome, d.get(c.nome)!, { dx: 0, dy: 0, giro: 0 }, mesa, C);
      return Math.max(Math.abs(v.dx - c.dx), Math.abs(v.dy - c.dy), Math.abs(v.giro - c.giro));
    })
  );
  ok('desfazer o referencial devolve as coordenadas do arranjo', erroMax < 1e-9, `erro max ${erroMax.toExponential(1)}`);

  // Peca que sobrou arrastada: vira colocada sem pular de lugar.
  const k = r.sobraram[0];
  if (k) {
    const antes = caixa(naCena(pecas.find((x) => x.chave === k)!.contorno, d.get(k)!, C));
    const col = paraCoordenadasDaPlaca(k, d.get(k)!, { dx: 0, dy: 0, giro: 0 }, mesa, C);
    const d2 = deslocamentosNaPlaca(pecas, new Map([...arranjo, [k, col]]), r.sobraram.filter((x) => x !== k), mesa, C);
    const depois = caixa(naCena(pecas.find((x) => x.chave === k)!.contorno, d2.get(k)!, C));
    const pulo = Math.max(Math.abs(depois.minX - antes.minX), Math.abs(depois.minY - antes.minY));
    ok('peca que sobrou, ao ser arrastada, nao pula de lugar', pulo < 1e-6, `${pulo.toExponential(1)} mm`);
  }
}

console.log(`\n${total - falhas}/${total} passaram\n`);
process.exit(falhas ? 1 : 0);
