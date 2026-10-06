/**
 * Nucleo do editor 2D livre (lib/design): medidas em mm depois de mover, girar e escalar,
 * espelho, camadas de contorno que acompanham e se fundem, uma peca por camada no 3D, o
 * desenho por camada para os geradores, trechos finos e o JSON salvo e reaberto igual.
 *   npx tsx scripts/verificar-design.mts
 */
import fs from 'fs';
import type { Font } from 'opentype.js';
import { parseFont } from '../lib/text/glyphs';
import { regionBounds, type Region } from '../lib/geom/region';
import { camadasPadrao, designNovo, lerDesign, type Design, type Elemento } from '../lib/design/documento';
import { regiaoDoElemento, regioesDasCamadas, trechosFinos } from '../lib/design/geometria';
import { designParaDesenho, designParaResultado } from '../lib/design/saida';
import { RECEITAS, receitaPorId } from '../lib/gerador/receitas';

let falhas = 0, total = 0;
const ok = (nome: string, cond: boolean, detalhe = '') => {
  total++;
  if (!cond) falhas++;
  console.log(`${cond ? '  ok   ' : ' FALHA '} ${nome}${detalhe ? `  -> ${detalhe}` : ''}`);
};
const perto = (a: number, b: number, tol = 0.15) => Math.abs(a - b) <= tol;

const buf = fs.readFileSync('public/fontes/archivo-black.ttf');
const archivo: Font = parseFont(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
const fontes = (id: string) => (id === 'archivo-black' ? archivo : undefined);

const base = { camadaId: 'topo', x: 0, y: 0, giro: 0, escalaX: 1, escalaY: 1 };
const el = (e: Partial<Elemento> & Pick<Elemento, 'tipo'>): Elemento => ({ id: 'e' + Math.random(), ...base, ...e } as Elemento);
const caixa = (r: Region) => regionBounds(r);

// Formas e transformacoes
const circ = caixa(regiaoDoElemento(el({ tipo: 'forma', forma: 'circulo', largura: 40, x: 10, y: 5 }), fontes));
ok('forma: círculo de 40 mm no lugar certo', perto(circ.w, 40) && perto((circ.minX + circ.maxX) / 2, 10) && perto((circ.minY + circ.maxY) / 2, 5), `${circ.w.toFixed(2)} mm`);
const dobro = caixa(regiaoDoElemento(el({ tipo: 'forma', forma: 'circulo', largura: 40, escalaX: 2, escalaY: 2 }), fontes));
ok('escala 2x dobra a medida', perto(dobro.w, 80) && perto(dobro.h, 80));
const ret = caixa(regiaoDoElemento(el({ tipo: 'forma', forma: 'retangulo', largura: 50 }), fontes));
const retGirado = caixa(regiaoDoElemento(el({ tipo: 'forma', forma: 'retangulo', largura: 50, giro: 90 }), fontes));
ok('giro de 90° troca largura e altura', perto(ret.w, retGirado.h) && perto(ret.h, retGirado.w), `${ret.w.toFixed(1)}x${ret.h.toFixed(1)} -> ${retGirado.w.toFixed(1)}x${retGirado.h.toFixed(1)}`);
const triangulo: Region = [{ outer: [{ x: -10, y: -5 }, { x: 10, y: -5 }, { x: 10, y: 5 }], holes: [] }];
const tri = caixa(regiaoDoElemento(el({ tipo: 'desenho', nome: 't', regiao: triangulo }), fontes));
const triEsp = regiaoDoElemento(el({ tipo: 'desenho', nome: 't', regiao: triangulo, espelhar: true }), fontes);
ok('espelhar inverte o desenho sem mudar a medida', perto(caixa(triEsp).w, tri.w) && triEsp[0]!.outer.some((p) => perto(p.x, -10) && perto(p.y, 5)));

// Texto e QR
const texto = caixa(regiaoDoElemento(el({ tipo: 'texto', texto: 'ANA', fonte: 'archivo-black', altura: 20 }), fontes));
ok('texto: maiúsculas com a altura pedida (mm)', perto(texto.h, 20, 0.6) && texto.w > 30, `${texto.w.toFixed(1)}x${texto.h.toFixed(1)}`);
ok('texto sem fonte carregada não quebra (vazio)', regiaoDoElemento(el({ tipo: 'texto', texto: 'ANA', fonte: 'nao-existe', altura: 20 }), fontes).length === 0);
const qr = caixa(regiaoDoElemento(el({ tipo: 'qr', conteudo: 'https://scarprint.com', largura: 30 }), fontes));
ok('QR cabe no lado pedido', qr.w <= 30 && qr.w > 20 && perto(qr.w, qr.h, 0.01), `${qr.w.toFixed(1)} mm`);

// Camadas de contorno
const d: Design = { ...designNovo(), elementos: [
  el({ tipo: 'forma', forma: 'circulo', largura: 20, x: -13 }),
  el({ tipo: 'forma', forma: 'circulo', largura: 20, x: 13 }),
] };
const regioes = regioesDasCamadas(d, fontes);
const topo = regioes.get('topo')!, meio = regioes.get('meio')!, fundo = regioes.get('base')!;
ok('camada desenhada: os dois círculos separados', topo.length === 2);
ok('borda acompanha o desenho (+1,5 mm de cada lado)', perto(caixa(meio).w, caixa(topo).w + 3, 0.2), `${caixa(meio).w.toFixed(2)} vs ${caixa(topo).w.toFixed(2)}`);
ok('fundo funde os dois onde encosta (folga 4 mm, vão de 6 mm)', fundo.length === 1 && perto(caixa(fundo).w, caixa(topo).w + 8, 0.2));
const movido = regioesDasCamadas({ ...d, elementos: d.elementos.map((e, i) => (i === 1 ? { ...e, x: 60 } : e)) }, fontes);
ok('afastando, o fundo se separa de novo', movido.get('base')!.length === 2);
const circular: Design = { ...d, camadas: [{ ...camadasPadrao()[0]!, origem: { contornoDe: 'meio', folgaMm: 1 } }, { ...camadasPadrao()[1]!, origem: { contornoDe: 'base', folgaMm: 1 } }, camadasPadrao()[2]!] };
ok('contorno em círculo (A de B, B de A) não trava', regioesDasCamadas(circular, fontes).size === 3);

// Saidas
const res = designParaResultado(d, fontes);
const pecas = res.itens[0]?.pecas ?? [];
ok('3D: uma peça por camada, empilhadas em Z', pecas.length === 3 && pecas.map((p) => `${p.camadas[0]!.z0}-${p.camadas[0]!.z1}`).join(' ') === '0-2 2-2.8 2.8-3.6', pecas.map((p) => p.nome).join(','));
ok('3D: cor de cada peça é a da camada', JSON.stringify(res.hex) === JSON.stringify(d.camadas.map((c) => c.cor)));
ok('3D: camada oculta não vira peça', (designParaResultado({ ...d, camadas: d.camadas.map((c) => (c.id === 'meio' ? { ...c, oculta: true } : c)) }, fontes).itens[0]?.pecas.length ?? 0) === 2);
ok('3D: design vazio avisa', designParaResultado({ ...d, elementos: [] }, fontes).avisos.length > 0);
const desenho = designParaDesenho(d, fontes);
ok('Desenho para os geradores: uma cor por camada e a forma toda', desenho.cores?.length === 3 && perto(caixa(desenho.regiao).w, caixa(fundo).w, 0.05));

// Trechos finos
const fino: Region = [{ outer: [{ x: -10, y: -0.1 }, { x: 10, y: -0.1 }, { x: 10, y: 0.1 }, { x: -10, y: 0.1 }], holes: [] }];
const elFino = el({ tipo: 'desenho', nome: 'linha', regiao: fino });
ok('linha de 0,2 mm é apontada como fina', trechosFinos(regiaoDoElemento(elFino, fontes)).length > 0);
ok('engrossar 0,2 mm resolve', trechosFinos(regiaoDoElemento({ ...elFino, engrossar: 0.2 }, fontes)).length === 0);
ok('círculo de 20 mm não tem trecho fino', trechosFinos(topo).length === 0);

// JSON e receita
const ida = JSON.parse(JSON.stringify(d));
ok('design salvo e reaberto igual', JSON.stringify(lerDesign(ida)) === JSON.stringify(d));
let errou = false;
try { lerDesign({ versao: 9 }); } catch { errou = true; }
ok('arquivo que não é design dá erro claro', errou);
const receita = receitaPorId('design-livre');
const gerado = receita?.gerar({ design: JSON.stringify(d) }, { fonte: () => archivo });
ok('receita interna gera o mesmo 3D pelo worker', (gerado?.itens[0]?.pecas.length ?? 0) === 3);
ok('receita interna fora do catálogo e dos testes de gerador', !RECEITAS.some((r) => r.id === 'design-livre'));

console.log(`\n${total - falhas}/${total} passaram\n`);
if (falhas) process.exit(1);
