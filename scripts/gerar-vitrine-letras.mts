/**
 * Pecas 3D do topo da landing de letras (/letra-caixa), prontas no build: a pagina so busca o
 * binario, sem gerar nada no navegador (gerar na hora travava a troca de slide).
 * - Pecas de gerador saem montadas (`montado`), como a peca pronta, nao o arranjo da mesa.
 * - Letra caixa: o contorno das letras da fonte (o mesmo do editor) extrudado maciço e com
 *   bisel arredondado do three. O chanfro do buildPart e em degraus (feito para imprimir) e
 *   nao pega luz; aqui e so vitrine.
 * - Normais vincadas: curva lisa, quina viva. Posicoes em Int16, normais em Int8, indices.
 * Escreve public/vitrine-letras/<id>.json e .bin so quando o conteudo muda.
 *   npx tsx scripts/gerar-vitrine-letras.mts   (roda no prebuild e no publicar)
 */
import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { mergeGeometries, mergeVertices, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { parseFont, normalizeLetters, textToLetters } from '../lib/text/glyphs';
import { layerToGeometry, regionToShapes } from '../lib/geom/extrude';
import { regionBounds, type Region } from '../lib/geom/region';
import { simplificar } from '../lib/import/imagem';
import { prepararModelo } from '../lib/gerador/exemplo';
import { corDe } from '../lib/gerador/malha';
import { PASTA_VITRINE, SLIDES_LETRAS, idDoProduto, type MalhaVitrine, type PecaVitrine } from '../lib/marketplace/vitrineLetras';
import { produtosLetras } from '../lib/marketplace/letras';

const PASTA = path.join('public', PASTA_VITRINE);
/** Angulo acima do qual a quina fica viva (abaixo, a normal e suavizada). */
const VINCO = (40 * Math.PI) / 180;

const fontes = new Map<string, ReturnType<typeof parseFont>>();
const fonte = (id: string) => {
  if (!fontes.has(id)) {
    const arq = path.join('public', 'fontes', `${id}.ttf`);
    if (!fs.existsSync(arq)) throw new Error(`Fonte ${id} nao esta em public/fontes (a vitrine nao baixa nada no build).`);
    const b = fs.readFileSync(arq);
    fontes.set(id, parseFont(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer));
  }
  return fontes.get(id)!;
};

type Parte = { nome: string; papel: MalhaVitrine['partes'][number]['papel']; cor: string; geo: THREE.BufferGeometry };

/**
 * Contorno com menos pontos para a vitrine (Douglas-Peucker): a curva da fonte e os offsets
 * vem densos demais para uma peca vista inteira. Tolerancia: 0,07% da maior medida da peca
 * (0,18 mm numa peca de 250 mm, menos de um pixel na tela).
 */
const TOLERANCIA = 0.0007;
const simplificarRegiao = (r: Region, tol: number): Region => r.map((p) => ({ outer: simplificar(p.outer, tol), holes: p.holes.map((h) => simplificar(h, tol)).filter((h) => h.length >= 3) }));
const toleranciaDe = (regioes: Region[]) => { const b = regionBounds(regioes.flat()); return Math.max(b.w, b.h) * TOLERANCIA; };

/** Malha so de posicoes (sem normal nem uv), para as normais serem refeitas com vinco. */
function crua(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const n = g.index ? g.toNonIndexed() : g;
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', n.getAttribute('position').clone());
  return out;
}

function letraCaixa(p: Extract<PecaVitrine, { tipo: 'letra-caixa' }>): Parte[] {
  const letras = normalizeLetters(textToLetters(fonte(p.fonte), p.texto, { altura: p.altura, tracking: p.altura * 0.07 }));
  if (!letras.length) throw new Error('Letra caixa sem letras: ' + p.texto);
  const b = p.altura * 0.022; // bisel: ~2 mm numa letra de 100 mm
  const tol = toleranciaDe(letras.map((l) => l.region));
  const geos = letras.flatMap((l) => {
    const shapes = regionToShapes(simplificarRegiao(l.region, tol));
    if (!shapes.length) return [];
    const g = new THREE.ExtrudeGeometry(shapes, { depth: p.profundidade - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelOffset: -b, bevelSegments: 4, curveSegments: 1, steps: 1 });
    g.translate(0, 0, b);
    return [crua(g)];
  });
  const tudo = mergeGeometries(geos, false)!;
  // Face: os triangulos chapados virados para quem olha, no plano da frente. O resto (bisel,
  // laterais, fundo) e a lateral da letra caixa.
  const pos = tudo.getAttribute('position');
  const face: number[] = [], lateral: number[] = [];
  const a = new THREE.Vector3(), bb = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); bb.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    n.subVectors(c, bb).cross(bb.clone().sub(a)).normalize();
    const tri = [a.x, a.y, a.z, bb.x, bb.y, bb.z, c.x, c.y, c.z];
    (Math.abs(n.z) > 0.999 && Math.min(a.z, bb.z, c.z) > p.profundidade - 0.01 ? face : lateral).push(...tri);
  }
  const deLista = (l: number[]) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(l, 3)); return g; };
  return [
    { nome: 'Face', papel: 'face', cor: p.face, geo: deLista(face) },
    { nome: 'Lateral', papel: 'lateral', cor: p.lateral, geo: deLista(lateral) },
  ];
}

function deGerador(p: Extract<PecaVitrine, { tipo: 'gerador' }>): Parte[] {
  const { receita, valores } = prepararModelo(p.gerador, { base: 'exemplo', extras: { ...p.valores, montado: true } });
  const r = receita.gerar(valores, { fonte });
  if (!r.itens.length) throw new Error(`${p.gerador} nao gerou peca: ${r.avisos.join(' ')}`);
  const tol = toleranciaDe(r.itens.flatMap((it) => it.pecas.flatMap((pc) => pc.camadas.map((c) => c.region))));
  return r.itens.flatMap((it) => it.pecas.map((pc) => {
    const geos = pc.camadas.map((c) => layerToGeometry({ ...c, region: simplificarRegiao(c.region, tol) })).filter((g): g is THREE.BufferGeometry => !!g).map(crua);
    return { nome: pc.nome, papel: p.difusor?.includes(pc.nome) ? 'difusor' as const : 'peca' as const, cor: corDe(r, pc.cor), geo: mergeGeometries(geos, false)! };
  })).filter((x) => x.geo);
}

/** Normais vincadas e vertices iguais unidos (indices). */
function preparar(g: THREE.BufferGeometry): THREE.BufferGeometry {
  return mergeVertices(toCreasedNormals(g, VINCO), 1e-4);
}

function empacotar(partes: Parte[]): { json: MalhaVitrine; bin: Buffer } {
  const geos = partes.map((p) => ({ ...p, geo: preparar(p.geo) }));
  const caixa = new THREE.Box3();
  for (const { geo } of geos) { geo.computeBoundingBox(); caixa.union(geo.boundingBox!); }
  const centro = caixa.getCenter(new THREE.Vector3());
  for (const { geo } of geos) geo.translate(-centro.x, -centro.y, -centro.z);
  caixa.translate(centro.negate());
  const min = caixa.min.toArray(), tam = caixa.getSize(new THREE.Vector3()).toArray();
  const blocos: Buffer[] = [];
  let off = 0;
  const alinhar = (b: Buffer) => { const pad = (4 - (b.length % 4)) % 4; return pad ? Buffer.concat([b, Buffer.alloc(pad)]) : b; };
  const somar = (b: Buffer) => { const at = off; const al = alinhar(b); blocos.push(al); off += al.length; return at; };
  const json: MalhaVitrine = { versao: 1, min: caixa.min.toArray() as [number, number, number], max: caixa.max.toArray() as [number, number, number], partes: [] };
  for (const { nome, papel, cor, geo } of geos) {
    const p = geo.getAttribute('position'), n = geo.getAttribute('normal'), idx = geo.index!;
    const q = new Int16Array(p.count * 3), qn = new Int8Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      for (let k = 0; k < 3; k++) {
        const v = p.getComponent(i, k);
        q[i * 3 + k] = Math.round(((v - min[k]!) / (tam[k]! || 1)) * 65534) - 32767;
        qn[i * 3 + k] = Math.round(Math.max(-1, Math.min(1, n.getComponent(i, k))) * 127);
      }
    }
    const indice32 = p.count > 65535;
    const ind = indice32 ? Uint32Array.from(idx.array as ArrayLike<number>) : Uint16Array.from(idx.array as ArrayLike<number>);
    const posicoes = somar(Buffer.from(q.buffer)), normais = somar(Buffer.from(qn.buffer)), triangulos = somar(Buffer.from(ind.buffer));
    json.partes.push({ nome, papel, cor, vertices: p.count, indices: ind.length, posicoes, normais, triangulos, indice32 });
  }
  return { json, bin: Buffer.concat(blocos) };
}

function gravarSeMudou(arq: string, conteudo: Buffer | string): boolean {
  const novo = typeof conteudo === 'string' ? Buffer.from(conteudo) : conteudo;
  if (fs.existsSync(arq) && fs.readFileSync(arq).equals(novo)) return false;
  fs.writeFileSync(arq, novo);
  return true;
}

// Slides do topo e, para a esteira (cards girando), o exemplo de cada produto de letra montado:
// o mesmo da foto do card, para a foto e o 3D nao trocarem de peca.
const pecas: { id: string; peca: PecaVitrine }[] = [
  ...SLIDES_LETRAS.map((s) => ({ id: s.id, peca: s.peca })),
  ...produtosLetras().filter((p) => p.gerador).map((p) => ({ id: idDoProduto(p.slug), peca: { tipo: 'gerador' as const, gerador: p.gerador!, valores: {}, difusor: ['Frente'] } })),
];

fs.mkdirSync(PASTA, { recursive: true });
let total = 0;
for (const { id, peca } of pecas) {
  const partes = peca.tipo === 'letra-caixa' ? letraCaixa(peca) : deGerador(peca);
  const { json, bin } = empacotar(partes);
  const mudou = [gravarSeMudou(path.join(PASTA, `${id}.json`), JSON.stringify(json)), gravarSeMudou(path.join(PASTA, `${id}.bin`), bin)].some(Boolean);
  total += bin.length;
  const tris = json.partes.reduce((t, p) => t + p.indices / 3, 0);
  console.log(`  ${id.padEnd(30)} ${(bin.length / 1024).toFixed(0).padStart(5)} KB  ${String(Math.round(tris)).padStart(7)} triangulos  ${json.partes.map((p) => `${p.nome}(${p.papel})`).join(', ').slice(0, 90)}${mudou ? '  [atualizado]' : ''}`);
}
console.log(`vitrine de letras: ${pecas.length} pecas, ${(total / 1024).toFixed(0)} KB em ${PASTA}`);
