/** Dividir a peca nos cortes: junta as etapas na ordem. */
import { intersectRegion, minThickness, offsetRegion, regionArea, regionBounds, type Region } from '../region';
import type { Mat4 } from 'manifold-3d';
import type { ExtraStl, Params, Part } from '../modes';
import { comEscopo } from '../../malha/nucleo';
import { doMalha } from '../../malha/converter';
import { prisma, projecao } from '../../malha/solidos';
import { caixaDaMalha } from '../../malha/tipos';
import { aplicar, compor, deitarPlano, normalDoPlano, transladar } from '../../malha/plano';
import { ehAltura, ehEsboco, ehReta, inclinado, type Corte, type CorteNaAltura, type CorteReto, type Divisao, type Eixo, type MarcaDeEncaixe, type OpcoesEmenda, type PedacoDePeca, type PlanoDoCorte } from './tipos';
import { EMENDA_PADRAO, FURO_M3, LASCA } from './constantes';
import { circulo, ehSolida, espessuraDaParede, secaoEm, unir, zBase, zonaMacica, zTopo } from './geometria';
import { caixaDe, centroDaPeca, faixaDaLinha, linhaDoCorte, trechosDaLinha } from './linha';
import { encaixeDoCorte, formaDoCorte, type Contexto } from './encaixe';
import { ilhas, partir, SOBRA_Z, type Divisor, type Pilha } from './cortar';
import { cheioNaFaixa, deitado, encaixarNaAltura, partirNaAltura, vistaDeCima, type ContextoAltura } from './altura';
import { finoForaDaEmenda, gravarNumero, pecaDe, talasDoCorte } from './pecas';

/** Ordem de aplicar os cortes vistos de cima: retas em X, retas em Y (cada eixo em ordem, sem repetir), depois inclinadas e esbocos. */
function ordemDosCortes(cortes: Corte[]): number[] {
  const retas = (eixo: Eixo) =>
    cortes
      .flatMap((c, k): [CorteReto, number][] => (ehReta(c) && !c.angulo && c.eixo === eixo ? [[c, k]] : []))
      .sort((a, b) => a[0].pos - b[0].pos);
  const vistos = new Set<string>();
  const out: number[] = [];
  for (const [c, k] of [...retas('x'), ...retas('y')]) {
    const id = `${c.eixo}${c.pos}`;
    if (vistos.has(id)) continue;
    vistos.add(id);
    out.push(k);
  }
  cortes.forEach((c, k) => { if (ehEsboco(c) || (ehReta(c) && c.angulo)) out.push(k); });
  return out;
}

/**
 * Divide a peca nos `cortes`. Cada pedaco e uma peca normal (malha, contorno, volume): mesa,
 * arranjo, custo e exportacao valem sem mudanca. A chapa cortada fica inteira no pedaco 1; as
 * talas, cavilhas e borboletas vao como extras impressos do pedaco de antes de cada emenda.
 * `texto(rotulo, altura)` desenha o numero (a fonte vem de quem chama); sem ele, nao grava.
 */
export function dividirPeca(
  part: Part,
  cfg: Params,
  cortes: Corte[],
  o: Partial<OpcoesEmenda> = {},
  nome = '',
  texto?: (t: string, altura: number) => Region
): Divisao {
  const opc = { ...EMENDA_PADRAO, ...o };
  const avisos: string[] = [];
  if (!cortes.length) return { pedacos: [{ indice: 1, part }], emendas: 0, parafusos: 0, avisos, linhas: [], marcas: [], planos: [] };
  return comEscopo((m) => {
    const x: Divisor = { m, papeis: { ...part.papeis } };
    const inteira = doMalha(m, part.malha);
    const solida = ehSolida(part, cfg);
    const material = projecao(inteira);
    const cx = caixaDe(part);
    const centro = centroDaPeca(part);
    const espParede = solida ? 0 : espessuraDaParede(part, cfg);
    const linhas = cortes.map((c) => linhaDoCorte(c, cx, centro));
    const validos = ordemDosCortes(cortes).filter((k) => {
      const ok = !!linhas[k] && trechosDaLinha(part.contorno, linhas[k]!).length > 0;
      if (!ok) avisos.push(`O corte ${k + 1} não atravessa a peça: tire ou mude de lugar.`);
      return ok;
    });
    const base = zBase(inteira), alturaPeca = zTopo(inteira);
    // O mesmo plano duas vezes parte em nada: vale o primeiro, e o outro avisa.
    const vistas = new Map<string, number>();
    const naAltura = cortes
      .flatMap((c, k): [CorteNaAltura, number][] => (ehAltura(c) ? [[c, k]] : []))
      .sort((a, b) => a[0].z - b[0].z)
      .filter(([c, k]) => {
        const chave = inclinado(c) ? `${c.z}|${c.inclinacao}|${c.direcao ?? 0}` : `${c.z}`;
        const igual = vistas.get(chave);
        if (igual !== undefined) {
          avisos.push(`O corte ${k + 1} repete o corte ${igual + 1}: tire um dos dois.`);
          return false;
        }
        vistas.set(chave, k);
        const ok = c.z > base + 0.5 && c.z < alturaPeca - 0.5;
        if (!ok) avisos.push(`O corte ${k + 1} não atravessa a peça: tire ou mude de lugar.`);
        return ok;
      });
    const contexto: Contexto = {
      cx,
      solida,
      material,
      zonaDente: solida ? material : zonaMacica(part, espParede),
      base,
      altura: alturaPeca,
      cheio: (z0, z1) => cheioNaFaixa(inteira, z0, z1),
      opc,
      avisos,
    };
    const encaixes = validos.map((k) => encaixeDoCorte(cortes[k]!, k, linhas[k]!, validos.filter((j) => j !== k).map((j) => linhas[j]!), contexto));

    // Talas e furos de parafuso: calculados na peca inteira, um conjunto por corte com tala.
    const talas = encaixes.filter((e) => e.forma === 'tala').flatMap((e) => talasDoCorte(e.linha, part, cfg, opc).map((t) => ({ e, ...t })));
    let pilha: Pilha = { s: inteira, extras: part.extras.filter((e): e is ExtraStl => e.kind === 'stl') };
    // Furos M3 na tampa de baixo, nos mesmos pontos da tala (em cima deles e cavidade).
    const furos = talas.flatMap((t) => t.furos);
    const tampa = part.meta.tampaBaixo;
    if (furos.length && tampa) {
      const buracos = unir(furos.map((pt) => circulo(pt.x, pt.y, FURO_M3 / 2, 24)));
      pilha = { ...pilha, s: pilha.s.subtract(prisma(m, buracos, tampa.z0 - SOBRA_Z, tampa.z1 + SOBRA_Z)) };
    }

    // Cada corte parte todas as pilhas que ele cruza.
    let pilhas: Pilha[] = [pilha];
    for (const e of encaixes) pilhas = pilhas.flatMap((p) => partir(x, p, e, opc)).filter((p) => !p.s.isEmpty());

    // Cortes na altura, de baixo para cima: cada um parte todas as pilhas que atravessa.
    const marcasZ: MarcaDeEncaixe[] = [];
    const planos: PlanoDoCorte[] = [];
    let emendasZ = 0;
    if (naAltura.length) {
      const espAnel = Math.max(1.2, Math.min(2, cfg.parede * 0.67));
      const ctxZ: ContextoAltura = {
        opc,
        cavidade: solida ? [] : offsetRegion(part.contorno, 0.5),
        evitar: unir(encaixes.map((e) => faixaDaLinha(e.linha, e.forma === 'tala' ? opc.larguraTala + 1 : espAnel + opc.folga + 1))),
        espAnel,
        papelDoPino: { role: solida ? 'corpo' : 'parede' },
      };
      for (const [c, k] of naAltura) {
        const forma = formaDoCorte(c, opc.forma, solida);
        const usados = new Set<number>();
        const secoes: Region[] = [];
        let semEncaixe = 0;
        // Plano inclinado: a peca gira ate o plano ficar em z = 0, corta e encaixa como no corte
        // reto, e volta. A parte de cima guarda o giro: e assim que ela deita na mesa.
        const tombado = inclinado(c);
        const n = normalDoPlano(c.inclinacao ?? 0, c.direcao ?? 0);
        const pivo: [number, number, number] = [centro.x, centro.y, c.z];
        const { ida, volta } = deitarPlano(n, pivo);
        const h = tombado ? 0 : c.z;
        const emCima = (e: ExtraStl) => {
          const cx = caixaDaMalha(e.malha);
          const meio: [number, number, number] = [(cx.min[0] + cx.max[0]) / 2, (cx.min[1] + cx.max[1]) / 2, (cx.min[2] + cx.max[2]) / 2];
          const q = e.montagem.matriz ? aplicar(e.montagem.matriz, ...meio) : [meio[0], meio[1], meio[2] + e.montagem.z];
          return n[0] * (q[0]! - pivo[0]) + n[1] * (q[1]! - pivo[1]) + n[2] * (q[2]! - pivo[2]) >= 0;
        };
        pilhas = pilhas.flatMap((p) => {
          const deitada: Pilha = tombado ? { ...p, s: p.s.transform(ida as Mat4) } : p;
          const [baixo, cima] = partirNaAltura(deitada, h, tombado ? emCima : undefined);
          if (baixo.s.isEmpty() || cima.s.isEmpty()) return [p];
          secoes.push(unir([secaoEm(deitada.s, h - 0.01), secaoEm(deitada.s, h + 0.01)]));
          const jaTinha = baixo.extras.length;
          const r = encaixarNaAltura(x, baixo, cima, tombado ? deitado(c) : c, k, forma, ctxZ, usados);
          if (tombado) {
            baixo.s = baixo.s.transform(volta as Mat4);
            cima.s = cima.s.transform(volta as Mat4);
            cima.imprimir = { ida, volta };
            // Os pinos novos foram feitos com o plano deitado: na peca montada ficam na direcao da normal.
            baixo.extras = baixo.extras.map((e, i) => (i < jaTinha ? e : { ...e, montagem: { ...e.montagem, matriz: compor(volta, transladar(0, 0, e.montagem.z)) } }));
          }
          marcasZ.push(...(tombado ? r.marcas.map((m) => vistaDeCima(m, volta)) : r.marcas));
          if (r.semEncaixe) semEncaixe++;
          emendasZ++;
          return [baixo, cima];
        });
        const perdidos = tombado ? 0 : (c.emenda?.lugares?.length ?? 0) - usados.size;
        if (perdidos > 0) avisos.push(`No corte ${k + 1}, ${perdidos === 1 ? 'um pino não coube' : `${perdidos} pinos não couberam`}: diminua o diâmetro ou mude de lugar.`);
        if (semEncaixe) avisos.push(`No corte ${k + 1}, ${forma === 'anel' ? 'o anel' : 'o pino'} não coube em ${semEncaixe === 1 ? 'uma parte' : `${semEncaixe} partes`}: ali fica só a cola.`);
        planos.push({ corte: k, z: h, regiao: unir(secoes), ...(tombado ? { matriz: volta } : {}) });
      }
    }

    // Partes soltas viram pedacos; lascas somem com aviso.
    const comSombra = pilhas.flatMap((p) => ilhas(m, p)).map((p) => ({ ...p, sombra: projecao(p.s) })).filter((p) => {
      const a = regionArea(p.sombra);
      if (a < LASCA) { if (a > 0.5) avisos.push(`Uma lasca de ${a.toFixed(0)} mm² saiu da emenda: mude o corte de lugar.`); return false; }
      return true;
    });

    // Ordem de leitura: de cima para baixo, da esquerda para a direita; no mesmo lugar, da mesa para cima.
    const centroDe = (p: Pilha) => { const b = p.s.boundingBox(); return { x: (b.min[0] + b.max[0]) / 2, y: (b.min[1] + b.max[1]) / 2, z: b.min[2] }; };
    // No mesmo lugar e na mesma altura (os dois aneis de parede do O cortado na altura), o menor primeiro.
    const tamanho = (p: { sombra: Region }) => { const b = regionBounds(p.sombra); return b.w * b.h; };
    comSombra.sort((a, b) => {
      const ca = centroDe(a), cb = centroDe(b);
      if (Math.abs(ca.y - cb.y) > 20) return cb.y - ca.y;
      if (Math.abs(ca.x - cb.x) > 1) return ca.x - cb.x;
      return Math.abs(ca.z - cb.z) > 1e-6 ? ca.z - cb.z : tamanho(a) - tamanho(b);
    });

    // Cada peca solta vai no pedaco de antes da linha que encosta nela (a tala: a parede fica em volta dela).
    const soltas = [
      ...talas.map(({ e, tala }) => ({ e, peca: tala, recuo: espParede + opc.folgaTala + 1 })),
      ...encaixes.flatMap((e) => e.soltas.map((peca) => ({ e, peca, recuo: opc.folga + 0.5 }))),
    ];
    const dono = soltas.map(({ e, peca, recuo }) => {
      const antes = intersectRegion(projecao(doMalha(m, peca.malha)), e.base);
      return comSombra.findIndex((p) => regionArea(intersectRegion(offsetRegion(p.sombra, -recuo), antes)) > 0.1);
    });
    soltas.forEach(({ peca }, k) => { if (dono[k]! < 0) avisos.push(`Uma ${peca.name} de emenda ficou sem pedaço: mude o corte de lugar.`); });
    const pedacos: PedacoDePeca[] = comSombra.map((p, i) => {
      const conta = new Map<string, number>();
      const minhas = soltas
        .filter((_, k) => dono[k] === i)
        .map(({ peca }) => {
          const n = (conta.get(peca.name) ?? 0) + 1;
          conta.set(peca.name, n);
          return { ...peca, name: `${peca.name}-${i + 1}-${n}` };
        });
      if (opc.gravarNumero && texto) gravarNumero(x, p, solida, part.meta, espParede, texto, `${nome ? `${nome}-` : ''}${i + 1}`);
      // A chapa cortada fica inteira, uma vez so (no pedaco 1).
      const peca = pecaDe(x, p.s, [...(i === 0 ? part.extras.filter((e) => e.kind === 'cut') : []), ...p.extras, ...minhas], part, p.sombra, p.imprimir?.ida);
      const esp = minThickness(peca.contorno);
      if (esp < cfg.bico * 2 && finoForaDaEmenda(peca.contorno, cfg.bico, encaixes.map((e) => e.linha))) {
        peca.avisos.push(`O pedaço ${i + 1} tem um trecho de ${esp.toFixed(1)} mm: mude o corte de lugar.`);
      }
      return { indice: i + 1, part: peca };
    });

    const chapa = part.extras.find((e) => e.kind === 'cut');
    if (chapa) {
      const b = regionBounds(chapa.region);
      if (Math.min(b.w, b.h) > 1220) avisos.push(`A chapa tem ${b.w.toFixed(0)} x ${b.h.toFixed(0)} mm: passa da chapa de 1220 mm de largura.`);
    }
    // Uma emenda por trecho do desenho que a linha cruza (oca ou solida, conta igual).
    const emendas = encaixes.reduce((n, e) => n + trechosDaLinha(part.contorno, e.linha).length, 0) + emendasZ;
    return {
      pedacos,
      emendas,
      parafusos: furos.length,
      avisos,
      linhas: cortes.map((_, k) => (validos.includes(k) ? linhas[k]! : null)),
      marcas: [...encaixes.flatMap((e) => e.marcas), ...marcasZ],
      planos,
    };
  });
}
