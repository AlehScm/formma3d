/**
 * STL importado e placa exportada.
 *   npx tsx scripts/verificar-placa.mts
 *
 * O teste que importa: o que sai no arquivo tem de estar exatamente onde o arranjo
 * pos cada peca. Medido na MALHA exportada, nao nos numeros do arranjo -- o 3D ja
 * desenhou peca fora da placa uma vez com os numeros certos.
 */
import fs from 'fs';
import JSZip from 'jszip';
import { lerStl, volumeMalha } from '../lib/import/stl';
import { posicoesParaSTL, posicoesDaGeometria } from '../lib/export/stl';
import { gerar3mf, modelo3mf } from '../lib/export/tresmf';
import { montarPlaca, juntar, type PecaPlaca } from '../lib/print/placa';
import { arrumar, prepararParaArranjo } from '../lib/print/arranjo';
import { acharImpressora, cascoConvexo } from '../lib/print/impressoras';
import { buildPart, PARAMS_PADRAO } from '../lib/geom/modes';
import { partToGeometry } from '../lib/geom/extrude';
import { buildRegion, intersectRegion, minThickness, regionArea, regionBounds, rotateRegion, translateRegion, type Region } from '../lib/geom/region';
import { parseFont, textToLetters, normalizeLetters } from '../lib/text/glyphs';
import { enfileirarArquivos, type ArquivoNaFila } from '../lib/import/fila';
import { PADRAO, calibrar, dividirEntreSocios, esquecerCalibracao, gramasEstimadas, orcar, type Insumos } from '../lib/cost/calc';
import { custosDoTrabalho } from '../lib/cost/trabalho';
import { formatarTempoHM, lerTempo } from '../components/ui/formato';
import { useProjeto, lerChave } from '../store/projeto';

let falhas = 0;
let total = 0;
const ok = (nome: string, cond: boolean, detalhe = '') => {
  total++;
  if (!cond) falhas++;
  console.log(`${cond ? '  ok  ' : ' FALHA'}  ${nome}${detalhe ? '  -> ' + detalhe : ''}`);
};
const perto = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;

/** Cubo de lado `l` com o canto em (x,y,z), normais para fora. */
function cubo(l: number, x = 0, y = 0, z = 0): Float32Array {
  const v = (i: number) => [x + (i & 1 ? l : 0), y + (i & 2 ? l : 0), z + (i & 4 ? l : 0)];
  const f = [
    [0, 2, 3, 1], [4, 5, 7, 6], [0, 1, 5, 4], [2, 6, 7, 3], [0, 4, 6, 2], [1, 3, 7, 5],
  ];
  const out: number[] = [];
  for (const [a, b, c, d] of f) out.push(...v(a!), ...v(b!), ...v(c!), ...v(a!), ...v(c!), ...v(d!));
  return new Float32Array(out);
}

const casca = (p: Float32Array): Region => {
  const pts = [];
  for (let i = 0; i < p.length; i += 3) pts.push({ x: p[i]!, y: p[i + 1]! });
  return [{ outer: cascoConvexo(pts), holes: [] }];
};

async function main() {
  console.log('\n== ler STL ==');
  {
    const c = cubo(20, 100, -50, 7);
    ok('cubo de 20 mm tem 8000 mm3', perto(volumeMalha(c), 8000, 0.01), volumeMalha(c).toFixed(2));

    const bin = lerStl(posicoesParaSTL(c, 'cubo'));
    ok('binario: 12 triangulos', bin.triangulos === 12, `${bin.triangulos}`);
    ok('binario: assentado em Z=0 e centrado em XY',
       perto(bin.min[2], 0) && perto(bin.max[2], 20) && perto(bin.min[0], -10) && perto(bin.max[1], 10),
       `z ${bin.min[2]}..${bin.max[2]}, x ${bin.min[0]}..${bin.max[0]}`);
    ok('binario: volume preservado', perto(volumeMalha(bin.posicoes), 8000, 0.01));

    const linhas = ['solid cubo'];
    for (let i = 0; i < c.length; i += 9) {
      linhas.push(' facet normal 0 0 0', '  outer loop');
      for (let k = 0; k < 9; k += 3) linhas.push(`   vertex ${c[i + k]} ${c[i + k + 1]} ${c[i + k + 2]}`);
      linhas.push('  endloop', ' endfacet');
    }
    linhas.push('endsolid cubo');
    const txt = new TextEncoder().encode(linhas.join('\n'));
    const asc = lerStl(txt.buffer.slice(txt.byteOffset, txt.byteOffset + txt.byteLength) as ArrayBuffer);
    ok('ASCII: mesma malha do binario', asc.triangulos === 12 && perto(volumeMalha(asc.posicoes), 8000, 0.01));

    // Binario cujo cabecalho comeca com "solid": varios exportadores fazem isso.
    const enganoso = posicoesParaSTL(c, 'x');
    const h = new Uint8Array(enganoso);
    'solid enganoso'.split('').forEach((ch, i) => (h[i] = ch.charCodeAt(0)));
    ok('binario com cabecalho "solid" nao e lido como texto', lerStl(enganoso).triangulos === 12);

    let quebrou = false;
    try {
      lerStl(new TextEncoder().encode('lixo').buffer as ArrayBuffer);
    } catch {
      quebrou = true;
    }
    ok('arquivo que nao e STL da erro claro', quebrou);
  }

  console.log('\n== placa montada: letras + STL ==');
  const b = fs.readFileSync('C:/Windows/Fonts/arialbd.ttf');
  const font = parseFont(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
  const letras = normalizeLetters(textToLetters(font, 'OLA', { altura: 70, tracking: 0 }));
  const pecas: (PecaPlaca & { alturaZ: number })[] = letras.map((l, i) => {
    const part = buildPart(l.region, PARAMS_PADRAO, minThickness(l.region));
    return {
      chave: `${l.nome}#${i}`,
      nome: l.nome,
      posicoes: posicoesDaGeometria(partToGeometry(part)!),
      contorno: part.contorno,
      alturaZ: part.alturaZ,
    };
  });
  const stl = lerStl(posicoesParaSTL(cubo(40), 'suporte'));
  pecas.push({ chave: 'stl:1', nome: 'suporte', posicoes: stl.posicoes, contorno: casca(stl.posicoes), alturaZ: stl.max[2] });

  const X2D = acharImpressora('x2d')!;
  const a = arrumar(prepararParaArranjo(pecas.map((p) => ({ nome: p.chave, region: p.contorno, alturaZ: p.alturaZ })), X2D), X2D, 3);
  ok('letras e STL cabem juntos numa placa', a.colocadas.length === pecas.length && a.placas === 1, `${a.colocadas.length}/${pecas.length}, ${a.placas} placa`);

  const objs = montarPlaca(pecas, a.colocadas);
  ok('um objeto por peca colocada', objs.length === pecas.length);

  const caixa = (p: Float32Array) => {
    let [x0, x1, y0, y1] = [Infinity, -Infinity, Infinity, -Infinity];
    for (let i = 0; i < p.length; i += 3) {
      x0 = Math.min(x0, p[i]!); x1 = Math.max(x1, p[i]!);
      y0 = Math.min(y0, p[i + 1]!); y1 = Math.max(y1, p[i + 1]!);
    }
    return { x0, x1, y0, y1 };
  };
  const fora = objs.filter((o) => {
    const k = caixa(o.posicoes);
    return k.x0 < -0.05 || k.y0 < -0.05 || k.x1 > X2D.x + 0.05 || k.y1 > X2D.y + 0.05;
  });
  ok('toda malha exportada fica dentro da mesa', fora.length === 0, fora.map((o) => o.nome).join(',') || `0..${X2D.x} x 0..${X2D.y}`);

  // A malha foi para o MESMO lugar do footprint que o arranjo usou.
  let desvio = 0;
  const footprints: Region[] = [];
  for (const c of a.colocadas) {
    const p = pecas.find((x) => x.chave === c.nome)!;
    const bb = regionBounds(p.contorno);
    const f = translateRegion(rotateRegion(p.contorno, c.giro, bb.minX + bb.w / 2, bb.minY + bb.h / 2), c.dx, c.dy);
    footprints.push(f);
    const fb = regionBounds(f);
    const mk = caixa(objs.find((o) => o.nome === p.nome)!.posicoes);
    desvio = Math.max(desvio, Math.abs(mk.x0 - fb.minX), Math.abs(mk.x1 - fb.maxX), Math.abs(mk.y0 - fb.minY), Math.abs(mk.y1 - fb.maxY));
  }
  // A malha pode ser um pouco menor que o footprint (borda de apoio), nunca maior.
  ok('a malha cai sobre o footprint do arranjo', desvio < 5, `desvio max ${desvio.toFixed(2)} mm`);
  let colisoes = 0;
  for (let i = 0; i < footprints.length; i++)
    for (let j = i + 1; j < footprints.length; j++)
      if (regionArea(intersectRegion(footprints[i]!, footprints[j]!)) > 0.01) colisoes++;
  ok('nenhuma peca invade outra na placa', colisoes === 0, `${colisoes}`);

  const soma = pecas.reduce((s, p) => s + volumeMalha(p.posicoes), 0);
  const junto = juntar(objs);
  ok('a placa num STL so tem o volume de todas as pecas', perto(volumeMalha(junto), soma, soma * 1e-4),
     `${(volumeMalha(junto) / 1000).toFixed(1)} vs ${(soma / 1000).toFixed(1)} cm3`);
  const releitura = lerStl(posicoesParaSTL(junto, 'placa'));
  ok('e o STL da placa relido tem os mesmos triangulos', releitura.triangulos === junto.length / 9);

  console.log('\n== 3MF ==');
  {
    const blob = await gerar3mf(objs);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    ok('tem as tres partes do pacote', !!zip.file('[Content_Types].xml') && !!zip.file('_rels/.rels') && !!zip.file('3D/3dmodel.model'));
    const xml = await zip.file('3D/3dmodel.model')!.async('string');
    const objetos = (xml.match(/<object /g) ?? []).length;
    const itens = (xml.match(/<item /g) ?? []).length;
    ok('um objeto separado por peca, cada um no build', objetos === objs.length && itens === objs.length, `${objetos} objetos, ${itens} itens`);
    ok('unidade em milimetro', xml.includes('unit="millimeter"'));

    // Relendo o 3MF: mesmos triangulos e mesmo volume -- o reaproveitamento de
    // vertice nao pode ter trocado nenhum ponto.
    const blocos = xml.split('<object ').slice(1);
    let vol = 0;
    let verts = 0;
    let tris = 0;
    for (const bl of blocos) {
      const vs = [...bl.matchAll(/<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"\/>/g)].map((m) => [Number(m[1]), Number(m[2]), Number(m[3])]);
      const ts = [...bl.matchAll(/<triangle v1="(\d+)" v2="(\d+)" v3="(\d+)"\/>/g)].map((m) => [Number(m[1]), Number(m[2]), Number(m[3])]);
      verts += vs.length;
      tris += ts.length;
      vol += volumeMalha(new Float32Array(ts.flatMap((t) => t.flatMap((i) => vs[i]!))));
    }
    ok('3MF relido tem o mesmo volume', perto(vol, soma, soma * 1e-4), `${(vol / 1000).toFixed(1)} vs ${(soma / 1000).toFixed(1)} cm3`);
    ok('vertices repetidos reaproveitados', verts < tris * 3 / 3, `${verts} vertices para ${tris} triangulos`);
    ok('nome com caractere especial nao quebra o XML', modelo3mf([{ nome: 'A&B <x>', posicoes: cubo(1) }]).includes('name="A&#38;B &#60;x&#62;"'));
  }

  console.log('\n== varias placas ==');
  {
    const muitas = Array.from({ length: 6 }, (_, i) => {
      const p = lerStl(posicoesParaSTL(cubo(100), `c${i}`));
      return { chave: `c${i}`, nome: `c${i}`, posicoes: p.posicoes, contorno: casca(p.posicoes), alturaZ: 100 };
    });
    const r = arrumar(prepararParaArranjo(muitas.map((p) => ({ nome: p.chave, region: p.contorno, alturaZ: 100 })), X2D), X2D, 3);
    ok('6 cubos de 100 mm dao 2 placas na X2D', r.placas === 2 && r.todas.length === 2, `${r.placas}`);
    ok('cada peca aparece em uma placa so', new Set(r.todas.flat().map((c) => c.nome)).size === 6 && r.todas.flat().length === 6);
    ok('a primeira placa e a que o arranjo mostra', JSON.stringify(r.todas[0]) === JSON.stringify(r.colocadas));
  }

  console.log('\n== varios arquivos no mesmo letreiro ==');
  {
    // Dois arquivos com os MESMOS nomes de peca, de proposito, e alturas diferentes.
    const quad = (x: number, w: number, h: number): Region =>
      buildRegion([[{ x, y: 0 }, { x: x + w, y: 0 }, { x: x + w, y: h }, { x, y: h }]], 'nonzero');
    const arq = (id: string, alvo: number, desat: string[] = []): ArquivoNaFila => ({
      id,
      alvo,
      desativadas: new Set(desat),
      pecas: [
        { nome: '01', region: quad(10, 30, 50), espessuraNativa: 30 },
        { nome: '02', region: quad(60, 20, 50), espessuraNativa: 20 },
      ],
    });
    const fila = enfileirarArquivos([arq('a', 100), arq('b', 200)]);
    const chaves = new Set(fila.map((p) => p.chave));
    ok('chaves unicas com "01" nos dois arquivos', chaves.size === 4, [...chaves].join(' '));
    ok('rotulo diz de qual arquivo veio', fila.map((p) => p.nome).join(',') === 'A01,A02,B01,B02', fila.map((p) => p.nome).join(','));
    const bA = regionBounds(fila.filter((p) => p.chave.startsWith('a:')).flatMap((p) => p.region));
    const bB = regionBounds(fila.filter((p) => p.chave.startsWith('b:')).flatMap((p) => p.region));
    ok('cada arquivo na sua altura', perto(bA.h, 100) && perto(bB.h, 200), `${bA.h} / ${bB.h}`);
    ok('lado a lado, sem sobrepor, com vao', bB.minX - bA.maxX > 1, `vao ${(bB.minX - bA.maxX).toFixed(1)} mm`);
    ok('espessura acompanha a escala', perto(fila[2].espessuraMin, 30 * 4), String(fila[2].espessuraMin));
    const sem = enfileirarArquivos([arq('a', 100, ['01']), arq('b', 200)]);
    ok('desligar o 01 de A nao mexe no 01 de B', sem.some((p) => p.chave === 'b:01') && !sem.some((p) => p.chave === 'a:01'));
    ok('um arquivo so: rotulo sem letra', enfileirarArquivos([arq('a', 100)])[0].nome === '01');

    const imp = (nome: string) =>
      ({ nomeArquivo: nome, desenho: { objetos: [], textos: [] }, conteudoMm: { w: 100, h: 50 }, avisos: [], paginas: 1, pagina: 1 }) as never;
    const st = useProjeto.getState();
    st.adicionarArquivo(imp('x.ai'), 'ignorar' as never, true);
    st.adicionarArquivo(imp('y.ai'), 'ignorar' as never, false);
    const [x, y] = useProjeto.getState().arquivos;
    ok('adicionar mantem o primeiro arquivo', useProjeto.getState().arquivos.length === 2);
    st.removerPeca(`${x.id}:01`);
    const depois = useProjeto.getState().arquivos;
    ok('excluir peca de um arquivo nao mexe no outro', depois[0].desativadas.has('01') && !depois[1].desativadas.has('01'));
    st.adicionarObjeto3d({ nome: 'cubo', posicoes: new Float32Array(9), alturaZ: 1 } as never);
    st.removerPeca(`stl:${useProjeto.getState().objetos3d[0].id}`);
    ok('excluir STL tira so o STL', useProjeto.getState().objetos3d.length === 0 && useProjeto.getState().arquivos.length === 2);
    st.removerArquivo(y.id);
    ok('remover arquivo deixa o outro', useProjeto.getState().arquivos.map((a) => a.id).join() === x.id);
    ok('lerChave distingue os tres', lerChave('stl:9').tipo === 'stl' && lerChave('a:01').tipo === 'arquivo' && lerChave('A#0').tipo === 'texto');
  }

  console.log('\n== custo por peca e por placa ==');
  {
    const cfg = { ...PADRAO, valorHora: 30, setupMin: 10, posMin: 5, taxaFalha: 8 };
    const insumos = new Map<string, Insumos>([
      ['a', { volumeMm3: 50000, areaChapaMm2: 20000, perimetroLedMm: 300 }],
      ['b', { volumeMm3: 30000, areaChapaMm2: 0, perimetroLedMm: 0 }],
      ['c', { volumeMm3: 80000, areaChapaMm2: 45000, perimetroLedMm: 500 }],
      ['stl:x', { volumeMm3: 8000, areaChapaMm2: 0, perimetroLedMm: 0 }],
    ]);
    const ehLetra = (k: string) => !k.startsWith('stl:');
    const placas = [['a', 'b'], ['c', 'stl:x']];
    const preparo = orcar({ volumeMm3: 0, qtdLetras: 0, impressoes: 1, cfg }).custo;
    const soma = (ks: string[], c: ReturnType<typeof custosDoTrabalho>) => ks.reduce((t, k) => t + c.porPeca.get(k)!.custo, 0);

    const est = custosDoTrabalho({ insumos, placas, reais: [], ehLetra, cfg });
    ok('estimado: soma das pecas + um preparo por placa = total', perto(soma(['a', 'b', 'c'], est) + 2 * preparo, est.total!.custo, 1e-9));
    ok('estimado: cada placa = suas pecas + um preparo', est.porPlaca.every((p) => perto(p.orc.custo, soma(p.chaves, est) + preparo, 1e-9)));
    ok('sem dado real, tudo marcado como estimado', est.estimado && est.porPlaca.every((p) => p.estimado));
    ok('letreiro nao leva o STL', perto(est.total!.gramas, est.porPeca.get('a')!.gramas + est.porPeca.get('b')!.gramas + est.porPeca.get('c')!.gramas, 1e-9));

    // Placa 1 fatiada: 250 g em 9h30.
    const real = custosDoTrabalho({ insumos, placas, reais: [{ gramas: 250, horas: 9.5 }], ehLetra, cfg });
    const p1 = real.porPlaca[0]!;
    ok('placa com dado real usa os gramas e o tempo dela', perto(p1.orc.gramas, 250, 1e-9) && perto(p1.orc.horas, 9.5, 1e-9) && !p1.estimado);
    ok('a outra placa continua estimada', real.porPlaca[1]!.estimado && perto(real.porPlaca[1]!.orc.gramas, est.porPlaca[1]!.orc.gramas, 1e-9));
    const ga = real.porPeca.get('a')!.gramas;
    const gb = real.porPeca.get('b')!.gramas;
    ok('pecas dividem o real na proporcao do volume', perto(ga + gb, 250, 1e-9) && perto(ga / gb, 50 / 30, 1e-9), `${ga.toFixed(1)} + ${gb.toFixed(1)} g`);
    ok('real: soma das pecas + preparos = total', perto(soma(['a', 'b', 'c'], real) + 2 * preparo, real.total!.custo, 1e-9));
    ok('ainda estimado enquanto falta a placa 2', real.estimado);
    const tudoReal = custosDoTrabalho({ insumos, placas, reais: [{ gramas: 250, horas: 9.5 }, { gramas: 120, horas: 5 }], ehLetra, cfg });
    ok('placa com STL: o letreiro fica so com a parte das letras', tudoReal.total!.gramas < 250 + 120 && !tudoReal.estimado, `${tudoReal.total!.gramas.toFixed(1)} g`);

    const semArranjo = custosDoTrabalho({ insumos, placas: [[...insumos.keys()]], reais: [{ gramas: 400, horas: 12 }], ehLetra, cfg });
    ok('sem arranjo: o trabalho todo e uma placa', semArranjo.porPlaca.length === 1 && perto(semArranjo.porPlaca[0]!.orc.gramas, 400, 1e-9));
  }

  console.log('\n== placas avulsas e placas fora do orcamento ==');
  {
    const cfg = { ...PADRAO, valorHora: 30, setupMin: 10, posMin: 5 };
    const insumos = new Map<string, Insumos>([
      ['a', { volumeMm3: 50000, areaChapaMm2: 20000, perimetroLedMm: 0 }],
      ['b', { volumeMm3: 30000, areaChapaMm2: 10000, perimetroLedMm: 0 }],
    ]);
    const base = { insumos, placas: [['a'], ['b']], reais: [], ehLetra: () => true, cfg };
    const tudo = custosDoTrabalho(base);
    const semB = custosDoTrabalho({ ...base, excluidas: new Set([1]) });
    const soA = custosDoTrabalho({ ...base, insumos: new Map([['a', insumos.get('a')!]]), placas: [['a']] });
    ok('placa fora do orcamento sai do total (chapa junto)', perto(semB.total!.custo, soA.total!.custo, 1e-9) && semB.total!.custo < tudo.total!.custo);
    ok('mas continua na lista, marcada', semB.porPlaca[1]!.excluida && semB.porPlaca.length === 2);
    const todasFora = custosDoTrabalho({ ...base, excluidas: new Set([0, 1]) });
    ok('tudo fora e sem avulsa: nada a orcar', todasFora.total === null);

    const av = { id: 'x', nome: 'Chaveiros', pecas: 4, gramas: 120, horas: 3 };
    const soAvulsa = custosDoTrabalho({ insumos: new Map(), placas: [], reais: [], ehLetra: () => true, avulsas: [av], cfg });
    const direto = orcar({ volumeMm3: 0, qtdLetras: 4, impressoes: 1, gramasReais: 120, horasReais: 3, cfg });
    ok('so avulsa, sem letreiro: orca pelos dados do fatiador', perto(soAvulsa.total!.custo, direto.custo, 1e-9) && perto(soAvulsa.total!.gramas, 120, 1e-9));
    const junto = custosDoTrabalho({ ...base, avulsas: [av] });
    ok('letreiro + avulsa = soma das duas', perto(junto.total!.custo, tudo.total!.custo + soAvulsa.porAvulsa.get('x')!.custo, 1e-9));
  }

  console.log('\n== divisao entre socios ==');
  {
    const o = orcar({ volumeMm3: 0, qtdLetras: 1, impressoes: 1, gramasReais: 31.02, horasReais: 1.4, cfg: PADRAO });
    const me = o.maquina + o.energia;
    ok('maquina e energia saem no orcamento', perto(o.maquina, 1.4 * PADRAO.custoMaquina, 1e-9) && o.energia > 0, `${me.toFixed(2)}`);
    const iguais = dividirEntreSocios(o.preco, me, 3, 0, false);
    ok('desligado: tres partes iguais', iguais.length === 3 && iguais.every((p) => perto(p, o.preco / 3, 1e-9)));
    const comMaq = dividirEntreSocios(o.preco, me, 3, 1, true);
    ok('ligado: dono recebe maquina + energia + a parte dele', perto(comMaq[1]!, me + (o.preco - me) / 3, 1e-9) && perto(comMaq[0]!, (o.preco - me) / 3, 1e-9));
    ok('a soma das partes e o preco', perto(comMaq.reduce((a, b) => a + b, 0), o.preco, 1e-9) && perto(iguais.reduce((a, b) => a + b, 0), o.preco, 1e-9));
    ok('um socio so recebe tudo', perto(dividirEntreSocios(o.preco, me, 1, 0, true)[0]!, o.preco, 1e-9));
  }

  console.log('\n== aprender com o real ==');
  {
    const c0 = { ...PADRAO, vazao: 12, fatorGramas: 1, amostras: [] };
    const vol = 200000; // 248 g pelo volume em PLA
    const c1 = calibrar(c0, 'p1', { gramas: 310, horas: 20 }, vol);
    ok('primeira placa define a vazao', perto(c1.vazao, 15.5, 1e-9) && c1.amostras.length === 1, `${c1.vazao} g/h`);
    ok('e o fator de gramas', perto(c1.fatorGramas, 310 / 248, 1e-9), c1.fatorGramas.toFixed(3));
    ok('a estimativa seguinte ja usa o fator', perto(gramasEstimadas(vol, c1), 310, 1e-9));
    const c2 = calibrar(c1, 'p2', { gramas: 248, horas: 31 }, vol);
    ok('outra placa entra na conta', c2.amostras.length === 2 && perto(c2.vazao, (310 + 248) / 51, 1e-9));
    let c3 = c2;
    for (let i = 0; i < 5; i++) c3 = calibrar(c3, 'p2', { gramas: 248, horas: 31 }, vol);
    ok('redigitar a mesma placa nao soma de novo', c3.amostras.length === 2 && perto(c3.vazao, c2.vazao, 1e-12));
    const c4 = calibrar(c2, 'p2', { gramas: 300, horas: 30 }, vol);
    ok('corrigir a placa troca a amostra', c4.amostras.length === 2 && perto(c4.vazao, 610 / 50, 1e-9));
    let c5 = c0;
    for (let i = 0; i < 14; i++) c5 = calibrar(c5, `x${i}`, { gramas: 100, horas: 5 }, vol);
    ok('guarda so as ultimas 10', c5.amostras.length === 10 && c5.amostras[0]!.id === 'x4');
    ok('dado invalido nao mexe', calibrar(c1, 'p9', { gramas: 0, horas: 3 }, vol) === c1);
    ok('esquecer volta ao padrao', esquecerCalibracao(c2).amostras.length === 0 && esquecerCalibracao(c2).fatorGramas === 1);
  }

  console.log('\n== ler o tempo do fatiador ==');
  {
    const casos: [string, number | null][] = [
      ['5h 32m', 5 + 32 / 60], ['5h32m', 5 + 32 / 60], ['5h32', 5 + 32 / 60], ['1d 2h 3m', 26 + 3 / 60],
      ['48m', 0.8], ['332 min', 332 / 60], ['5:32', 5 + 32 / 60], ['5,5', 5.5], ['2h', 2], ['abc', null], ['', null], ['5x', null],
    ];
    for (const [t, h] of casos) {
      const v = lerTempo(t);
      ok(`"${t}"`, h === null ? v === null : v !== null && perto(v, h, 1e-9), String(v));
    }
    ok('formatar volta igual', formatarTempoHM(26 + 3 / 60) === '1d 2h 3m' && formatarTempoHM(0.8) === '48m' && formatarTempoHM(5.5) === '5h 30m');
  }

  console.log(`\n${total - falhas}/${total} passaram\n`);
  process.exit(falhas ? 1 : 0);
}
main();
