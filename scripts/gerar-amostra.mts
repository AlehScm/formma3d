/** Gera um PDF de amostra parecido com um letreiro real, para testar a importacao. */
import fs from 'fs';
import { pdfMinimo } from './mkpdf.mjs';
import { parseFont, textToLetters } from '../lib/text/glyphs';

const b = fs.readFileSync('C:/Windows/Fonts/arialbd.ttf');
const font = parseFont(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
const letras = textToLetters(font, 'BOA 3D', { altura: 60 });

const K = 72 / 25.4;
const ops: string[] = [];
for (const l of letras) {
  for (const poly of l.region) {
    for (const ring of [poly.outer, ...poly.holes]) {
      ops.push(`${(ring[0]!.x * K + 40).toFixed(3)} ${(ring[0]!.y * K + 40).toFixed(3)} m`);
      for (const p of ring.slice(1)) ops.push(`${(p.x * K + 40).toFixed(3)} ${(p.y * K + 40).toFixed(3)} l`);
      ops.push('h');
    }
  }
}
// f* para que os contra-formas do B, O e A virem buracos de verdade
const bytes = pdfMinimo(`${ops.join('\n')}\nf*`, { mediaBox: [0, 0, 700, 260] });
fs.writeFileSync('scripts/amostra-letreiro.pdf', bytes);
console.log('gerado: scripts/amostra-letreiro.pdf', bytes.length, 'bytes |', letras.length, 'letras');
