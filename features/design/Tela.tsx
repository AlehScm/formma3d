'use client';

/**
 * Tela do editor 2D: SVG em mm (Y para cima) com os contornos reais de cada elemento (o
 * mesmo que vira 3D), as camadas de contorno calculadas, grade, zoom na roda e arrastar a
 * tela no vazio. Alcas proprias: arrastar move, cantos escalam (Shift = livre), a alca de
 * cima gira (Shift = de 15 em 15 graus); imã no centro da tela e na grade.
 */
import { useCallback, useEffect, useRef, useState, type PointerEvent as EventoPonteiro } from 'react';
import type { Region } from '@/lib/geom/region';
import { contornar } from '@/lib/gerador/formas';
import type { Design, Elemento } from '@/lib/design/documento';
import { caixaDoElemento, regiaoLocal, type Fontes } from '@/lib/design/geometria';
import { BotaoIcone, IconeEnquadrar, IconeMais, IconeMenos } from '@/components/ui';

/** Region (mm, Y para cima) para o `d` de um <path>. */
export function caminho(r: Region): string {
  const anel = (pts: { x: number; y: number }[]) => (pts.length ? `M${pts.map((p) => `${p.x.toFixed(3)} ${p.y.toFixed(3)}`).join('L')}Z` : '');
  return r.map((p) => anel(p.outer) + p.holes.map(anel).join('')).join('');
}

const escalaReal = (e: Elemento) => ({ sx: e.escalaX * (e.espelhar ? -1 : 1), sy: e.escalaY });
const transformacao = (e: Elemento) => {
  const { sx, sy } = escalaReal(e);
  return `translate(${e.x} ${e.y}) rotate(${e.giro}) scale(${sx} ${sy})`;
};
const normalizar = (g: number) => ((((g + 180) % 360) + 360) % 360) - 180;

type Ponto = { x: number; y: number };
type Gesto =
  | { tipo: 'mover'; inicio: Ponto; originais: { id: string; x: number; y: number }[]; iniciado: boolean }
  | { tipo: 'escala'; el: Elemento; w0: number; h0: number; iniciado: boolean }
  | { tipo: 'giro'; el: Elemento; ang0: number; iniciado: boolean }
  | { tipo: 'pan'; inicio: Ponto; cx: number; cy: number };

interface Props {
  design: Design;
  /** Area de cada camada (as de contorno sao desenhadas daqui). */
  regioes: Map<string, Region>;
  fontes: Fontes;
  selecao: string[];
  grade: boolean;
  /** Trechos finos para destacar (vazio = nada). */
  finos: Region;
  onSelecionar: (ids: string[]) => void;
  onIniciarGesto: () => void;
  onAlterar: (ids: string[], fn: (e: Elemento) => Elemento) => void;
}

export function Tela({ design, regioes, fontes, selecao, grade, finos, onSelecionar, onIniciarGesto, onAlterar }: Props) {
  const caixa = useRef<HTMLDivElement>(null);
  const [tam, setTam] = useState({ w: 0, h: 0 });
  const [vista, setVista] = useState({ zoom: 0, cx: 0, cy: 0 });
  const gesto = useRef<Gesto | null>(null);
  const [guias, setGuias] = useState<{ x?: number; y?: number }>({});
  const cacheLocal = useRef(new Map<string, Region>());

  const enquadrar = useCallback(() => {
    if (!tam.w || !tam.h) return;
    setVista({ zoom: Math.min(tam.w / (design.larguraMm * 1.15), tam.h / (design.alturaMm * 1.15)), cx: 0, cy: 0 });
  }, [tam.w, tam.h, design.larguraMm, design.alturaMm]);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setTam({ w: e!.contentRect.width, h: e!.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => { if (!vista.zoom && tam.w) enquadrar(); }, [tam.w, vista.zoom, enquadrar]);

  const z = vista.zoom || 1;
  const mundo = useCallback((cliX: number, cliY: number): Ponto => {
    const r = caixa.current!.getBoundingClientRect();
    return { x: (cliX - r.left - tam.w / 2) / z + vista.cx, y: -(cliY - r.top - tam.h / 2) / z + vista.cy };
  }, [tam.w, tam.h, z, vista.cx, vista.cy]);

  // Roda: zoom em volta do cursor (listener nativo, para poder impedir a rolagem da pagina).
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const roda = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const px = e.clientX - r.left - tam.w / 2, py = e.clientY - r.top - tam.h / 2;
      setVista((v) => {
        const z0 = v.zoom || 1;
        const z1 = Math.min(40, Math.max(0.3, z0 * Math.exp(-e.deltaY * 0.0015)));
        const wx = px / z0 + v.cx, wy = -py / z0 + v.cy;
        return { zoom: z1, cx: wx - px / z1, cy: wy + py / z1 };
      });
    };
    el.addEventListener('wheel', roda, { passive: false });
    return () => el.removeEventListener('wheel', roda);
  }, [tam.w, tam.h]);

  const localFinal = (e: Elemento): Region => {
    const base = regiaoLocal(e, fontes);
    if (!e.engrossar) return base;
    const k = `${e.id}|${e.engrossar}|${base.length}|${JSON.stringify(base[0]?.outer[0] ?? null)}`;
    let r = cacheLocal.current.get(k);
    if (!r) {
      r = contornar(base, e.engrossar);
      cacheLocal.current.set(k, r);
      if (cacheLocal.current.size > 200) cacheLocal.current.delete(cacheLocal.current.keys().next().value!);
    }
    return r;
  };

  const travado = (e: Elemento) => e.travado || design.camadas.find((c) => c.id === e.camadaId)?.travada;

  const comecar = (ev: EventoPonteiro, g: Gesto) => {
    ev.stopPropagation();
    gesto.current = g;
    try {
      caixa.current?.setPointerCapture(ev.pointerId);
    } catch {
      // ponteiro ja solto (ou sintetico): o gesto segue pelos eventos da caixa
    }
  };

  const noElemento = (ev: EventoPonteiro, e: Elemento) => {
    if (ev.button !== 0 || travado(e)) return;
    const ja = selecao.includes(e.id);
    const ids = ev.shiftKey || ev.ctrlKey || ev.metaKey ? (ja ? selecao.filter((x) => x !== e.id) : [...selecao, e.id]) : ja ? selecao : [e.id];
    onSelecionar(ids);
    const originais = design.elementos.filter((x) => ids.includes(x.id) && !travado(x)).map((x) => ({ id: x.id, x: x.x, y: x.y }));
    comecar(ev, { tipo: 'mover', inicio: mundo(ev.clientX, ev.clientY), originais, iniciado: false });
  };

  const noVazio = (ev: EventoPonteiro) => {
    if (ev.button === 0 && !(ev.shiftKey || ev.ctrlKey || ev.metaKey)) onSelecionar([]);
    comecar(ev, { tipo: 'pan', inicio: { x: ev.clientX, y: ev.clientY }, cx: vista.cx, cy: vista.cy });
  };

  const mover = (ev: EventoPonteiro) => {
    const g = gesto.current;
    if (!g) return;
    if (g.tipo === 'pan') {
      setVista((v) => ({ ...v, cx: g.cx - (ev.clientX - g.inicio.x) / z, cy: g.cy + (ev.clientY - g.inicio.y) / z }));
      return;
    }
    const p = mundo(ev.clientX, ev.clientY);
    if (!g.iniciado) { onIniciarGesto(); g.iniciado = true; }
    if (g.tipo === 'mover') {
      let dx = p.x - g.inicio.x, dy = p.y - g.inicio.y;
      const prim = g.originais[0];
      const novasGuias: { x?: number; y?: number } = {};
      if (prim && !ev.altKey) {
        const tol = 6 / z;
        const nx = prim.x + dx, ny = prim.y + dy;
        if (Math.abs(nx) < tol) { dx = -prim.x; novasGuias.x = 0; } else if (grade) dx = Math.round(nx) - prim.x;
        if (Math.abs(ny) < tol) { dy = -prim.y; novasGuias.y = 0; } else if (grade) dy = Math.round(ny) - prim.y;
      }
      setGuias(novasGuias);
      const mapa = new Map(g.originais.map((o) => [o.id, o]));
      onAlterar(g.originais.map((o) => o.id), (e) => {
        const o = mapa.get(e.id)!;
        return { ...e, x: +(o.x + dx).toFixed(2), y: +(o.y + dy).toFixed(2) };
      });
    } else if (g.tipo === 'escala') {
      const e0 = g.el;
      const rad = (-e0.giro * Math.PI) / 180;
      const vx = p.x - e0.x, vy = p.y - e0.y;
      const lx = Math.abs(vx * Math.cos(rad) - vy * Math.sin(rad)), ly = Math.abs(vx * Math.sin(rad) + vy * Math.cos(rad));
      const hw = g.w0 / 2, hh = g.h0 / 2;
      let fx: number, fy: number;
      if (ev.shiftKey) { fx = lx / hw; fy = ly / hh; } else { fx = fy = (lx * hw + ly * hh) / (hw * hw + hh * hh); }
      fx = Math.max(0.05, fx); fy = Math.max(0.05, fy);
      onAlterar([e0.id], (e) => ({ ...e, escalaX: +(e0.escalaX * fx).toFixed(4), escalaY: +(e0.escalaY * fy).toFixed(4) }));
    } else if (g.tipo === 'giro') {
      const ang = (Math.atan2(p.y - g.el.y, p.x - g.el.x) * 180) / Math.PI;
      let giro = normalizar(g.el.giro + ang - g.ang0);
      if (ev.shiftKey) giro = Math.round(giro / 15) * 15;
      else for (const alvo of [-180, -90, 0, 90, 180]) if (Math.abs(giro - alvo) < 2) giro = alvo;
      onAlterar([g.el.id], (e) => ({ ...e, giro: +normalizar(giro).toFixed(1) }));
    }
  };

  const soltar = (ev: EventoPonteiro) => {
    gesto.current = null;
    setGuias({});
    if (caixa.current?.hasPointerCapture(ev.pointerId)) caixa.current.releasePointerCapture(ev.pointerId);
  };

  const selecionados = design.elementos.filter((e) => selecao.includes(e.id) && !e.oculto);
  const unico = selecionados.length === 1 ? selecionados[0]! : null;
  const caixaUnico = unico ? caixaDoElemento(unico, fontes) : null;
  const r = 6 / z;

  // Etiqueta "L x A mm, camada" abaixo do elemento (em pixels, fora do SVG).
  let etiqueta: { left: number; top: number; texto: string } | null = null;
  if (unico && caixaUnico) {
    const rad = (unico.giro * Math.PI) / 180;
    const cantos = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => ({ x: unico.x + (a! * caixaUnico.w / 2) * Math.cos(rad) - (b! * caixaUnico.h / 2) * Math.sin(rad), y: unico.y + (a! * caixaUnico.w / 2) * Math.sin(rad) + (b! * caixaUnico.h / 2) * Math.cos(rad) }));
    const baixo = Math.min(...cantos.map((c) => c.y));
    const camada = design.camadas.find((c) => c.id === unico.camadaId)?.nome ?? '';
    etiqueta = { left: (unico.x - vista.cx) * z + tam.w / 2, top: -(baixo - vista.cy) * z + tam.h / 2 + 10, texto: `${caixaUnico.w.toFixed(1)} × ${caixaUnico.h.toFixed(1)} mm, ${camada}` };
  }

  const W = design.larguraMm, H = design.alturaMm;
  return (
    <div ref={caixa} className="relative size-full touch-none overflow-hidden bg-superficie-2 select-none" onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar}>
      <svg className="absolute inset-0 size-full" onPointerDown={noVazio} role="img" aria-label="Tela do design">
        <defs>
          <pattern id="grade-mm" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M10 0H0V10" fill="none" className="stroke-texto-3" strokeWidth="0.12" strokeOpacity="0.35" />
          </pattern>
        </defs>
        <g transform={`translate(${tam.w / 2} ${tam.h / 2}) scale(${z} ${-z}) translate(${-vista.cx} ${-vista.cy})`}>
          <rect x={-W / 2} y={-H / 2} width={W} height={H} className="fill-white" />
          {grade && <rect x={-W / 2} y={-H / 2} width={W} height={H} fill="url(#grade-mm)" />}
          {design.camadas.map((c) => {
            if (c.oculta) return null;
            if (c.origem !== 'desenhada') {
              const reg = regioes.get(c.id);
              return reg?.length ? <path key={c.id} d={caminho(reg)} fill={c.cor} fillRule="evenodd" className="pointer-events-none" /> : null;
            }
            return design.elementos.filter((e) => e.camadaId === c.id && !e.oculto).map((e) => (
              <g key={e.id} transform={transformacao(e)}>
                <path d={caminho(localFinal(e))} fill={c.cor} fillRule="evenodd" className={travado(e) ? '' : 'cursor-move'} onPointerDown={(ev) => noElemento(ev, e)} />
              </g>
            ));
          })}
          {finos.length > 0 && <path d={caminho(finos)} className="pointer-events-none fill-perigo" fillRule="evenodd" />}
          {guias.x !== undefined && <line x1={0} x2={0} y1={-H / 2} y2={H / 2} className="stroke-acento" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
          {guias.y !== undefined && <line x1={-W / 2} x2={W / 2} y1={0} y2={0} className="stroke-acento" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
          {selecionados.map((e) => {
            const cx = caixaDoElemento(e, fontes);
            const ehUnico = unico?.id === e.id;
            return (
              <g key={`sel-${e.id}`} transform={`translate(${e.x} ${e.y}) rotate(${e.giro})`}>
                <rect x={-cx.w / 2} y={-cx.h / 2} width={cx.w} height={cx.h} fill="none" className="pointer-events-none stroke-acento" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                {ehUnico && !travado(e) && (
                  <>
                    <line x1={0} y1={cx.h / 2} x2={0} y2={cx.h / 2 + 22 / z} className="pointer-events-none stroke-acento" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                    <circle cx={0} cy={cx.h / 2 + 22 / z} r={r} className="cursor-grab fill-white stroke-acento" strokeWidth="1.5" vectorEffect="non-scaling-stroke"
                      onPointerDown={(ev) => { const p = mundo(ev.clientX, ev.clientY); comecar(ev, { tipo: 'giro', el: e, ang0: (Math.atan2(p.y - e.y, p.x - e.x) * 180) / Math.PI, iniciado: false }); }} />
                    {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => (
                      <rect key={`${a}${b}`} x={(a! * cx.w) / 2 - r} y={(b! * cx.h) / 2 - r} width={2 * r} height={2 * r} className="cursor-nwse-resize fill-white stroke-acento" strokeWidth="1.5" vectorEffect="non-scaling-stroke"
                        onPointerDown={(ev) => comecar(ev, { tipo: 'escala', el: e, w0: cx.w, h0: cx.h, iniciado: false })} />
                    ))}
                  </>
                )}
              </g>
            );
          })}
        </g>
      </svg>
      {etiqueta && (
        <span className="pointer-events-none absolute -translate-x-1/2 rounded-md bg-acento px-2 py-0.5 text-mini font-semibold whitespace-nowrap text-white" style={{ left: etiqueta.left, top: etiqueta.top }}>
          {etiqueta.texto}
        </span>
      )}
      <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-lg border border-borda bg-superficie p-1 shadow-flutuante">
        <BotaoIcone icone={IconeMenos} rotulo="Diminuir zoom" tamanho="sm" onClick={() => setVista((v) => ({ ...v, zoom: Math.max(0.3, (v.zoom || 1) / 1.25) }))} />
        <span className="w-12 text-center text-mini tabular-nums text-texto-2">{Math.round((z / 3.78) * 100)}%</span>
        <BotaoIcone icone={IconeMais} rotulo="Aumentar zoom" tamanho="sm" onClick={() => setVista((v) => ({ ...v, zoom: Math.min(40, (v.zoom || 1) * 1.25) }))} />
        <BotaoIcone icone={IconeEnquadrar} rotulo="Enquadrar" tamanho="sm" onClick={enquadrar} />
      </div>
    </div>
  );
}
