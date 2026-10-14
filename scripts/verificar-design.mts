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
import { camadasPadrao, designNovo, fontesDoDesign, lerDesign, type Design, type Elemento } from '../lib/design/documento';
import { finosDasCamadas, regiaoDoElemento, regioesDasCamadas, trechosFinos } from '../lib/design/geometria';
import { designParaDesenho, designParaResultado } from '../lib/design/saida';
import { empacotar3mf } from '../lib/export/tresmf';
import { lerTresMf } from '../lib/import/tresmf';
import { xml3mfMontado } from '../lib/gerador/exportar';
import { RECEITAS, receitaPorId } from '../lib/gerador/receitas';
import { valoresPadrao } from '../lib/gerador/tipos';
import { atualizarPosicaoManipulador } from '../lib/gerador/manipuladores';

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
const desenho10: Region = [{ outer: [{ x: -5, y: -5 }, { x: 5, y: -5 }, { x: 5, y: 5 }, { x: -5, y: 5 }], holes: [] }];
const desenho20: Region = [{ outer: [{ x: -10, y: -5 }, { x: 10, y: -5 }, { x: 10, y: 5 }, { x: -10, y: 5 }], holes: [] }];
const mesmoId10 = { ...el({ tipo: 'desenho', nome: '10', regiao: desenho10 }), id: 'desenho-igual' } as Elemento;
const mesmoId20 = { ...el({ tipo: 'desenho', nome: '20', regiao: desenho20 }), id: 'desenho-igual' } as Elemento;
ok('2D: desenhos com mesmo ID e polígonos, mas geometrias diferentes, não colidem no cache', perto(caixa(regiaoDoElemento(mesmoId10, fontes)).w, 10) && perto(caixa(regiaoDoElemento(mesmoId20, fontes)).w, 20));
const design10: Design = { ...designNovo(), elementos: [mesmoId10] };
const design20: Design = { ...designNovo(), elementos: [mesmoId20] };
const topo3d10 = designParaResultado(design10, fontes).itens[0]?.pecas.find((p) => p.nome === 'Desenho')?.camadas[0]?.region;
const topo3d20 = designParaResultado(design20, fontes).itens[0]?.pecas.find((p) => p.nome === 'Desenho')?.camadas[0]?.region;
ok('3D: desenhos com mesmo ID e polígonos mantêm suas larguras', !!topo3d10 && !!topo3d20 && perto(caixa(topo3d10).w, 10) && perto(caixa(topo3d20).w, 20));

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
const comFino: Design = { ...designNovo(), elementos: [{ ...elFino, x: 40 }] };
const finosCam = finosDasCamadas(comFino, fontes);
ok('rápido: linha fina apontada só na camada desenhada (contornos nunca são finos)', finosCam.has('topo') && !finosCam.has('meio') && !finosCam.has('base'));
ok('rápido: o trecho fino acompanha o elemento', perto(regionBounds(finosCam.get('topo')!).minX + regionBounds(finosCam.get('topo')!).w / 2, 40, 0.5));
const coberto: Design = { ...comFino, elementos: [{ ...elFino, x: 40 }, el({ tipo: 'forma', forma: 'quadrado', largura: 30, x: 40 })] };
ok('rápido: trecho fino coberto por outro elemento não conta', !finosDasCamadas(coberto, fontes).has('topo'));

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

// Modelo do catalogo como elemento: gera as proprias pecas, no lugar onde o elemento esta.
{
  const base = designNovo();
  const modelo = { id: 'm1', camadaId: 'topo', x: 50, y: -20, giro: 0, escalaX: 1, escalaY: 1, tipo: 'modelo', receita: 'porta-canetas-grade', valores: {} } as Elemento;
  const so: Design = { ...base, elementos: [modelo] };
  const r = designParaResultado(so, fontes);
  const tudo = r.itens.flatMap((it) => it.pecas.flatMap((p) => p.camadas.flatMap((c) => c.region)));
  const b = regionBounds(tudo);
  ok('modelo: as peças dele entram no 3D do design', r.itens.length > 0 && tudo.length > 0, `${r.itens.length} itens`);
  const camadaOculta: Design = { ...so, camadas: so.camadas.map((c) => (c.id === modelo.camadaId ? { ...c, oculta: true } : c)) };
  ok('modelo: camada oculta não exporta as peças do modelo', designParaResultado(camadaOculta, fontes).itens.length === 0);
  ok('modelo: fica centrado no (x, y) do elemento', perto(b.minX + b.w / 2, 50, 0.2) && perto(b.minY + b.h / 2, -20, 0.2), `${(b.minX + b.w / 2).toFixed(2)}, ${(b.minY + b.h / 2).toFixed(2)}`);
  const girado = designParaResultado({ ...so, elementos: [{ ...modelo, x: 0, y: 0, giro: 90 } as Elemento] }, fontes);
  const bg = regionBounds(girado.itens.flatMap((it) => it.pecas.flatMap((p) => p.camadas.flatMap((c) => c.region))));
  ok('modelo: gira com o elemento', perto(bg.w, b.h, 0.3) && perto(bg.h, b.w, 0.3));
  ok('modelo: não entra na área das camadas (borda e fundo não contornam ele)', [...regioesDasCamadas(so, fontes).values()].every((reg) => reg.length === 0));
  ok('modelo: sobrevive a salvar e abrir', lerDesign(JSON.parse(JSON.stringify(so))).elementos[0]?.tipo === 'modelo');
  const comTexto: Design = { ...base, elementos: [{ ...modelo, receita: 'chaveiro-nome', valores: { fonte: 'lobster' } } as Elemento] };
  ok('modelo: as fontes dele entram nas fontes do design', fontesDoDesign(comTexto).includes('lobster'), fontesDoDesign(comTexto).join(', '));
}

{
  const modeloA = { id: 'm-a', camadaId: 'topo', x: 75, y: 35, giro: 15, escalaX: 1, escalaY: 1, tipo: 'modelo', receita: 'chaveiro-nome', valores: { nomes: 'Ana', corBase: '#112233', corMeio: '#445566', corTopo: '#778899' } } as Elemento;
  const modeloB = { id: 'm-b', camadaId: 'topo', x: -75, y: 35, giro: 0, escalaX: 2, escalaY: 2, tipo: 'modelo', receita: 'chaveiro-nome', valores: { nomes: 'Ana', corBase: '#aa1111', corMeio: '#11aa11', corTopo: '#1111aa' } } as Elemento;
  const misto: Design = { ...designNovo(), elementos: [
    el({ tipo: 'forma', forma: 'circulo', largura: 18, x: 0, y: -35 }),
    el({ tipo: 'texto', texto: 'ANA', fonte: 'archivo-black', altura: 10, x: 0, y: 0 }),
    modeloA,
    modeloB,
  ] };
  const resultadoMisto = designParaResultado(misto, fontes, { fonte: () => archivo });
  const pecasDeItem = (i: number) => resultadoMisto.itens[i]?.pecas.flatMap((p) => p.camadas.flatMap((c) => c.region)) ?? [];
  const caixaDoItem = (i: number) => regionBounds(pecasDeItem(i));
  ok('composição: forma e texto ficam junto das camadas e dois modelos', resultadoMisto.itens.length === 3 && resultadoMisto.itens[0]?.pecas.length === 3 && pecasDeItem(1).length > 0 && pecasDeItem(2).length > 0);
  ok('composição: cada peça aponta para uma cor válida', resultadoMisto.itens.every((it) => it.pecas.every((p) => Number.isInteger(p.cor) && p.cor >= 0 && p.cor < resultadoMisto.cores.length && !!resultadoMisto.hex[p.cor])));
  ok('composição: modelos preservam cores e transformações diferentes', ['#112233', '#445566', '#778899', '#aa1111', '#11aa11', '#1111aa'].every((cor) => resultadoMisto.hex.includes(cor)) && caixaDoItem(1).minX + caixaDoItem(1).w / 2 > 50 && caixaDoItem(2).minX + caixaDoItem(2).w / 2 < -50);
  const mistoSemEscala = { ...misto, elementos: misto.elementos.map((e) => (e.id === modeloB.id ? { ...e, escalaX: 1, escalaY: 1 } : e)) };
  const caixaB1x = regionBounds(designParaResultado(mistoSemEscala, fontes, { fonte: () => archivo }).itens[2]!.pecas.flatMap((p) => p.camadas.flatMap((c) => c.region)));
  const caixaB2x = caixaDoItem(2);
  ok('composição: escala 2x do segundo modelo dobra sua caixa', perto(caixaB2x.w, caixaB1x.w * 2, 0.4) && perto(caixaB2x.h, caixaB1x.h * 2, 0.4));
  const pacote = await empacotar3mf(xml3mfMontado(resultadoMisto));
  const volta = await lerTresMf(await pacote.arrayBuffer(), 'design-misto.3mf');
  ok('composição: 3MF montado volta com os três objetos e malhas válidas', volta.length === 3 && volta.every((o) => o.malha.posicoes.length > 0 && [...o.malha.posicoes].every(Number.isFinite)));
}

{
  const receita = receitaPorId('chaveiro-retangular')!;
  const valores = { ...valoresPadrao(receita), nomes: 'ANA', fonte: 'archivo-black' };
  const inicial = receita.gerar(valores, { fonte: () => archivo });
  const manipulador = inicial.manipuladores![0]!;
  const valoresEditados = atualizarPosicaoManipulador(valores, manipulador, { x: 3, y: -2 });
  const modelo: Elemento = { ...base, id: 'argola-exportacao', tipo: 'modelo', receita: receita.id, valores: valoresEditados, x: 14, y: -8, giro: 31, escalaX: 1.4, escalaY: 0.8, espelhar: true };
  const editado = { ...designNovo(), elementos: [modelo] };
  const resultado = designParaResultado(editado, fontes, { fonte: () => archivo });
  const semEdicao = designParaResultado({ ...editado, elementos: [{ ...modelo, valores }] }, fontes, { fonte: () => archivo });
  ok('argola: a alteração interna chega à geometria exportada do design', JSON.stringify(resultado.itens) !== JSON.stringify(semEdicao.itens));
  const reaberto = lerDesign(JSON.parse(JSON.stringify(editado)));
  ok('argola: projeto reaberto gera as mesmas peças editadas', JSON.stringify(designParaResultado(reaberto, fontes, { fonte: () => archivo }).itens) === JSON.stringify(resultado.itens));
  const pacote = await empacotar3mf(xml3mfMontado(resultado));
  const volta = await lerTresMf(await pacote.arrayBuffer(), 'argola-editada.3mf');
  ok('argola: 3MF editado reabre com malha finita', volta.length === 1 && volta[0]!.malha.posicoes.length > 0 && [...volta[0]!.malha.posicoes].every(Number.isFinite));
}

console.log(`\n${total - falhas}/${total} passaram\n`);
if (falhas) process.exit(1);
