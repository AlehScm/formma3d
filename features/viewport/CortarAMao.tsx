'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { Part } from '@/lib/geom/modes';
import { layerToGeometry } from '@/lib/geom/extrude';
import { pointInContour, regionBounds, strokeToRegion, unionRegion, type Pt, type Region } from '@/lib/geom/region';
import {
  caixaDe,
  centroDaPeca,
  direcaoDaReta,
  distanciaALinha,
  ehAltura,
  inclinado,
  ehEsboco,
  ehReta,
  linhaDoCorte,
  pontosDoEsboco,
  moverCorte,
  tracosDoCorte,
  type Corte,
  type LugarDoDente,
  type MarcaDeEncaixe,
} from '@/lib/geom/emenda';

const COR_ALCA = '#ff922b';
const COR_ARRASTO = '#ffd43b';
const COR_ESBOCO = '#4dabf7';
/** Linha de corte e dentes por cima da peca: ciano, que nao some no cinza nem no laranja. */
const COR_LINHA = '#22d3ee';

export interface CortarAMaoProps {
  /** A peca inteira (antes de dividir), no letreiro. */
  inteira: Part;
  /** Os cortes dados, em mm a partir de `origem` (o canto da peca inteira). */
  cortes: Corte[];
  origem: Pt;
  /** O que a divisao achou de cada corte, no letreiro. */
  linhas: (Pt[] | null)[];
  marcas: MarcaDeEncaixe[];
  desenhando: boolean;
  onCortes: (cortes: Corte[]) => void;
  onFimDoEsboco: () => void;
}

type Arrasto =
  | { tipo: 'mover' | 'girar'; k: number; orig: Corte }
  | { tipo: 'vertice'; k: number; i: number; orig: Corte }
  | { tipo: 'transladar'; k: number; de: Pt; orig: Corte };

/** Pares de pontos como linhas, na altura z. */
function emLinhas(segs: [Pt, Pt][], z: number): THREE.BufferGeometry {
  const pts: number[] = [];
  for (const [a, b] of segs) pts.push(a.x, a.y, z, b.x, b.y, z);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

const dentroDe = (r: Region, q: Pt) => r.some((p) => pointInContour(p.outer, q) && !p.holes.some((h) => pointInContour(h, q)));
const distancia = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** O ponto `b` girado em torno de `a` ate o multiplo de `passo` graus mais perto. */
function prender(a: Pt, b: Pt, passo: number): Pt {
  const d = distancia(a, b);
  const p = (passo * Math.PI) / 180;
  const ang = Math.round(Math.atan2(b.y - a.y, b.x - a.x) / p) * p;
  return { x: a.x + d * Math.cos(ang), y: a.y + d * Math.sin(ang) };
}

function Alca({ p, z, raio, cor, onPegar }: { p: Pt; z: number; raio: number; cor: string; onPegar: (e: ThreeEvent<PointerEvent>) => void }) {
  return (
    <mesh
      position={[p.x, p.y, z + raio * 0.5]}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        onPegar(e);
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <sphereGeometry args={[raio, 20, 14]} />
      <meshBasicMaterial color={cor} />
    </mesh>
  );
}

/**
 * Cortar a mao, por cima da peca no letreiro (vista de cima): arrastar a alca do meio move o
 * corte, a da ponta inclina, as do esboco movem cada ponto. Clique na linha poe um dente ali,
 * clique num dente tira, botao direito no dente troca o lado. Com corte na altura, clique na peca
 * (fora das linhas) poe um pino, clique no pino tira. Desenhando: cada clique poe um
 * ponto do esboco; duplo clique ou Enter termina, Backspace desfaz, Esc desiste. Shift prende o
 * angulo.
 */
export function CortarAMao({ inteira, cortes, origem, linhas, marcas, desenhando, onCortes, onFimDoEsboco }: CortarAMaoProps) {
  const raiz = useRef<THREE.Group>(null);
  const controls = useThree((s) => s.controls) as unknown as { enabled: boolean } | null;
  const [arrasto, setArrasto] = useState<Arrasto | null>(null);
  const [previa, setPrevia] = useState<Corte[] | null>(null);
  const [esboco, setEsboco] = useState<Pt[]>([]);
  const [cursor, setCursor] = useState<Pt | null>(null);

  const b = useMemo(() => regionBounds(inteira.contorno), [inteira]);
  const cx = useMemo(() => caixaDe(inteira), [inteira]);
  const centro = useMemo(() => centroDaPeca(inteira), [inteira]);
  const z = inteira.alturaZ + 0.6;
  const raioAlca = Math.min(12, Math.max(2.5, Math.min(b.w, b.h) * 0.02));
  const tolerancia = Math.max(5, Math.max(b.w, b.h) * 0.02);

  const absoluto = (c: Corte) => moverCorte(c, origem.x, origem.y);
  const relativo = (c: Corte) => moverCorte(c, -origem.x, -origem.y, true);

  // Durante o arrasto a linha segue o mouse; a divisao so e refeita ao soltar.
  const linhasAgora = useMemo(
    () => (previa ? previa.map((c) => linhaDoCorte(moverCorte(c, origem.x, origem.y), cx, centro)) : linhas),
    [previa, linhas, cx, centro, origem]
  );

  const alcas = useMemo(
    () =>
      linhasAgora.map((linha, k) => {
        const c = (previa ?? cortes)[k];
        if (!linha || !c) return null;
        const tr = tracosDoCorte(inteira.contorno, linha);
        if (!tr.length) return null;
        const ini = tr[0]![0], fim = tr[tr.length - 1]![1];
        const a0 = absoluto(c);
        if (ehEsboco(a0)) {
          // Uma alca por ponto do corte: o arrasto muda o ponto de mesmo indice.
          const pts = pontosDoEsboco(a0, cx);
          const m = Math.max(0, Math.floor((pts.length - 1) / 2));
          const a = pts[m]!, bb = pts[Math.min(pts.length - 1, m + 1)]!;
          return { meio: { x: (a.x + bb.x) / 2, y: (a.y + bb.y) / 2 }, giro: null, vertices: pts };
        }
        const n = distancia(ini, fim) || 1;
        const d = { x: (fim.x - ini.x) / n, y: (fim.y - ini.y) / n };
        return { meio: { x: (ini.x + fim.x) / 2, y: (ini.y + fim.y) / 2 }, giro: { x: fim.x + d.x * raioAlca * 3, y: fim.y + d.y * raioAlca * 3 }, vertices: [] as Pt[] };
      }),
    [linhasAgora, previa, cortes, inteira, raioAlca, cx, origem]
  );

  // Faixas grossas (a linha do WebGL tem 1 px): a linha de cada corte e o contorno dos dentes.
  const largura = Math.max(1.2, Math.max(b.w, b.h) * 0.004);
  const faixas = useMemo(() => {
    const rs: Region[] = [];
    linhasAgora.forEach((l, k) => {
      if (!l || arrasto?.k === k) return;
      for (const [a, f] of tracosDoCorte(inteira.contorno, l)) rs.push(strokeToRegion([{ pts: [a, f], closed: false }], largura, true));
    });
    if (!previa) for (const m of marcas) for (const p of m.regiao) rs.push(strokeToRegion([{ pts: p.outer, closed: true }], largura * 0.7));
    const r = rs.reduce<Region>((acc, x) => (acc.length ? unionRegion(acc, x) : x), []);
    return r.length ? layerToGeometry({ region: r, z0: z + 0.1, z1: z + 0.3 }) : null;
  }, [linhasAgora, marcas, previa, arrasto, inteira, largura, z]);
  useEffect(() => () => faixas?.dispose(), [faixas]);
  const dentes = useMemo(() => {
    if (previa || !marcas.length) return null;
    const r = marcas.reduce<Region>((acc, m) => (acc.length ? unionRegion(acc, m.regiao) : m.regiao), []);
    return layerToGeometry({ region: r, z0: z, z1: z + 0.1 });
  }, [marcas, previa, z]);
  useEffect(() => () => dentes?.dispose(), [dentes]);

  const tracosPrevia = useMemo(() => {
    if (!previa || !arrasto) return null;
    const l = linhasAgora[arrasto.k];
    return l ? emLinhas(tracosDoCorte(inteira.contorno, l), z + 0.2) : null;
  }, [previa, arrasto, linhasAgora, inteira, z]);
  useEffect(() => () => tracosPrevia?.dispose(), [tracosPrevia]);

  const pontosEsboco = cursor && desenhando ? [...esboco, cursor] : esboco;
  const tracosEsboco = useMemo(
    () => (pontosEsboco.length > 1 ? emLinhas(pontosEsboco.slice(1).map((p, i): [Pt, Pt] => [pontosEsboco[i]!, p]), z + 0.2) : null),
    [esboco, cursor, desenhando, z]
  );
  useEffect(() => () => tracosEsboco?.dispose(), [tracosEsboco]);

  // Saiu do desenho (Esc, Sair): o esboco pela metade some.
  useEffect(() => {
    if (!desenhando) {
      setEsboco([]);
      setCursor(null);
    }
  }, [desenhando]);

  const terminarEsboco = (pts: Pt[]) => {
    const limpos = pts.filter((p, i) => i === 0 || distancia(p, pts[i - 1]!) > 0.5);
    if (limpos.length >= 2) onCortes([...cortes, relativo({ tipo: 'esboco', pontos: limpos })]);
    setEsboco([]);
    onFimDoEsboco();
  };

  useEffect(() => {
    if (!desenhando) return;
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      if (alvo?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        terminarEsboco(esboco);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setEsboco((s) => s.slice(0, -1));
      }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  });

  const local = (e: ThreeEvent<PointerEvent | MouseEvent>): Pt | null => {
    if (!raiz.current) return null;
    const p = raiz.current.worldToLocal(e.point.clone());
    return { x: p.x, y: p.y };
  };

  // O arrasto vive em refs: o mouse pode soltar antes do React redesenhar.
  const arrastoRef = useRef<Arrasto | null>(null);
  const previaRef = useRef<Corte[] | null>(null);

  const soltar = () => {
    const p = previaRef.current;
    arrastoRef.current = null;
    previaRef.current = null;
    if (controls) controls.enabled = true;
    setArrasto(null);
    setPrevia(null);
    if (p) onCortes(p);
  };

  // Soltou em qualquer lugar (dentro ou fora do plano): termina o arrasto.
  const pegar = (a: Arrasto) => {
    if (desenhando) return;
    if (controls) controls.enabled = false;
    arrastoRef.current = a;
    setArrasto(a);
    window.addEventListener('pointerup', soltar, { once: true });
  };

  const arrastar = (q: Pt, shift: boolean) => {
    const arrasto = arrastoRef.current;
    if (!arrasto) return;
    const c = absoluto(arrasto.orig);
    let novo: Corte = c;
    if (arrasto.tipo === 'mover' && ehReta(c)) {
      const d = direcaoDaReta(c);
      const pos = c.eixo === 'x' ? q.x + ((centro.y - q.y) / d.y) * d.x : q.y + ((centro.x - q.x) / d.x) * d.y;
      novo = { ...c, pos };
    } else if (arrasto.tipo === 'girar' && ehReta(c)) {
      const p = c.eixo === 'x' ? { x: c.pos, y: centro.y } : { x: centro.x, y: c.pos };
      const v = { x: q.x - p.x, y: q.y - p.y };
      let a = ((c.eixo === 'x' ? Math.atan2(-v.x, v.y) : Math.atan2(-v.y, -v.x)) * 180) / Math.PI;
      if (a > 90) a -= 180;
      if (a <= -90) a += 180;
      a = Math.max(-75, Math.min(75, shift ? Math.round(a / 15) * 15 : Math.round(a)));
      novo = { ...c, angulo: a || undefined };
    } else if (arrasto.tipo === 'vertice' && ehEsboco(c)) {
      novo = { ...c, pontos: c.pontos.map((p, i) => (i === arrasto.i ? q : p)) };
    } else if (arrasto.tipo === 'transladar') {
      novo = moverCorte(c, q.x - arrasto.de.x, q.y - arrasto.de.y);
    }
    const nova = (previaRef.current ?? cortes).map((x, j) => (j === arrasto.k ? relativo(novo) : x));
    previaRef.current = nova;
    setPrevia(nova);
  };

  /** Troca os lugares dos dentes de um corte (os automaticos viram lugares escolhidos). */
  const mudarLugares = (k: number, f: (ls: LugarDoDente[]) => LugarDoDente[]) => {
    const c = absoluto(cortes[k]!);
    const inv = !!c.emenda?.inverter;
    const atuais: LugarDoDente[] =
      c.emenda?.lugares ?? marcas.filter((m) => m.corte === k).map((m) => ({ x: m.lugar.x, y: m.lugar.y, ...(m.inverter !== inv ? { inverter: true } : {}) }));
    onCortes(cortes.map((x, j) => (j === k ? relativo({ ...c, emenda: { ...c.emenda, lugares: f(atuais) } }) : x)));
  };

  const maisPerto = (ls: LugarDoDente[], p: Pt) => ls.reduce((m, l, i) => (m < 0 || distancia(l, p) < distancia(ls[m]!, p) ? i : m), -1);

  // O corte na altura inclinado mostra os pinos (na sombra deles), mas nao aceita clique: os
  // lugares dele nao sao pontos da vista de cima, e os pinos vao no automatico.
  const tombado = (c: Corte | undefined) => !!c && ehAltura(c) && inclinado(c);
  const clicaveis = marcas.filter((x) => !tombado(cortes[x.corte]));

  const clicar = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 4) return;
    const q0 = local(e);
    if (!q0) return;
    if (desenhando) {
      const ult = esboco[esboco.length - 1];
      setEsboco([...esboco, ult && e.nativeEvent.shiftKey ? prender(ult, q0, 45) : q0]);
      return;
    }
    const m = clicaveis.find((x) => dentroDe(x.regiao, q0));
    if (m) return mudarLugares(m.corte, (ls) => { const i = maisPerto(ls, m.lugar); return ls.filter((_, j) => j !== i); });
    // Na linha, sobre o material: poe um dente ali.
    let k = -1, dk = tolerancia;
    linhas.forEach((l, j) => {
      if (!l) return;
      const sobre = tracosDoCorte(inteira.contorno, l).some(([a, bb]) => distanciaALinha(q0, [a, bb]) < tolerancia);
      const d = distanciaALinha(q0, l);
      if (sobre && d < dk) { k = j; dk = d; }
    });
    if (k >= 0) return mudarLugares(k, (ls) => [...ls, { x: q0.x, y: q0.y }]);
    // Fora das linhas, no material: pino no corte na altura (o que ja esta em "onde eu clicar" ou o que tem pino).
    const reto = (c: Corte | undefined) => !!c && ehAltura(c) && !inclinado(c);
    const escolhido = cortes.findIndex((c) => reto(c) && !!c.emenda?.lugares);
    const alvo = escolhido >= 0 ? escolhido : (clicaveis.find((x) => reto(cortes[x.corte]))?.corte ?? -1);
    if (alvo >= 0 && dentroDe(inteira.contorno, q0)) mudarLugares(alvo, (ls) => [...ls, { x: q0.x, y: q0.y }]);
  };

  const menu = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    e.nativeEvent.preventDefault();
    const q = local(e);
    const m = q && clicaveis.find((x) => dentroDe(x.regiao, q));
    if (!m || (cortes[m.corte] && ehAltura(cortes[m.corte]!))) return;
    mudarLugares(m.corte, (ls) => { const i = maisPerto(ls, m.lugar); return ls.map((l, j) => (j === i ? { ...l, inverter: !l.inverter } : l)); });
  };

  const ancho = Math.max(b.w, b.h) + 600;
  return (
    <group ref={raiz}>
      {/* Plano por cima da peca: recebe o mouse da ferramenta (nao some o clique na letra). */}
      <mesh
        position={[b.minX + b.w / 2, b.minY + b.h / 2, z]}
        onPointerMove={(e) => {
          const q = local(e);
          if (!q) return;
          if (arrastoRef.current) return arrastar(q, e.nativeEvent.shiftKey);
          if (desenhando) {
            const ult = esboco[esboco.length - 1];
            setCursor(ult && e.nativeEvent.shiftKey ? prender(ult, q, 45) : q);
          }
        }}
        onClick={clicar}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (desenhando) terminarEsboco(esboco);
        }}
        onContextMenu={menu}
      >
        <planeGeometry args={[ancho, ancho]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {!desenhando &&
        alcas.map((a, k) => {
          if (!a) return null;
          const orig = (previa ?? cortes)[k]!;
          const ativa = arrasto?.k === k;
          return (
            <group key={k}>
              <Alca
                p={a.meio}
                z={z}
                raio={raioAlca}
                cor={ativa ? COR_ARRASTO : COR_ALCA}
                onPegar={(e) => {
                  const q = local(e);
                  if (!q) return;
                  pegar(ehReta(orig) ? { tipo: 'mover', k, orig } : { tipo: 'transladar', k, de: q, orig });
                }}
              />
              {a.giro && <Alca p={a.giro} z={z} raio={raioAlca * 0.7} cor={ativa ? COR_ARRASTO : COR_ESBOCO} onPegar={() => pegar({ tipo: 'girar', k, orig })} />}
              {a.vertices.map((p, i) => (
                <Alca key={i} p={p} z={z} raio={raioAlca * 0.7} cor={ativa ? COR_ARRASTO : COR_ESBOCO} onPegar={() => pegar({ tipo: 'vertice', k, i, orig })} />
              ))}
            </group>
          );
        })}

      {faixas && (
        <mesh geometry={faixas}>
          <meshBasicMaterial color={COR_LINHA} />
        </mesh>
      )}
      {dentes && (
        <mesh geometry={dentes}>
          <meshBasicMaterial color={COR_LINHA} transparent opacity={0.35} depthWrite={false} />
        </mesh>
      )}

      {tracosPrevia && (
        <lineSegments geometry={tracosPrevia}>
          <lineBasicMaterial color={COR_ARRASTO} />
        </lineSegments>
      )}

      {desenhando && esboco.map((p, i) => <Alca key={i} p={p} z={z} raio={raioAlca * 0.6} cor={COR_ESBOCO} onPegar={() => {}} />)}
      {tracosEsboco && (
        <lineSegments geometry={tracosEsboco}>
          <lineBasicMaterial color={COR_ESBOCO} />
        </lineSegments>
      )}
    </group>
  );
}
