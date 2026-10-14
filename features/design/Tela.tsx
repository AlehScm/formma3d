'use client';

/**
 * Tela do editor 2D: SVG em mm (Y para cima) com os contornos reais de cada elemento (o
 * mesmo que vira 3D), as camadas de contorno calculadas, grade, zoom na roda e arrastar a
 * tela no vazio. Alcas proprias: arrastar move, cantos escalam (Shift = livre), a alca de
 * cima gira (Shift = de 15 em 15 graus); imã no centro da tela e na grade. Os modelos
 * prontos aparecem vistos de cima, nas cores deles, e se mexem do mesmo jeito.
 */
import { useRef, useState, type PointerEvent as EventoPonteiro } from 'react';
import type { Region } from '@/lib/geom/region';
import { contornar } from '@/lib/gerador/formas';
import type { Design, Elemento } from '@/lib/design/documento';
import { caixaDoElemento, regiaoLocal, type Fontes } from '@/lib/design/geometria';
import { localDoElemento, mundoDoElemento } from '@/lib/design/manipuladores';
import { areaDoDesign } from '@/lib/design/enquadramento';
import type { ManipuladorModelo } from '@/lib/gerador/tipos';
import { caminho } from '@/features/visor/caminho';
import { ControlesZoom } from '@/features/visor/ControlesZoom';
import { useVista, type Ponto, type Reserva } from '@/features/visor/useVista';

const escalaReal = (e: Elemento) => ({ sx: e.escalaX * (e.espelhar ? -1 : 1), sy: e.escalaY });
const transformacao = (e: Elemento) => {
  const { sx, sy } = escalaReal(e);
  return `translate(${e.x} ${e.y}) rotate(${e.giro}) scale(${sx} ${sy})`;
};
const normalizar = (g: number) => ((((g + 180) % 360) + 360) % 360) - 180;

type Gesto =
  | { tipo: 'mover'; inicio: Ponto; originais: { id: string; x: number; y: number }[]; iniciado: boolean }
  | { tipo: 'escala'; el: Elemento; inicio: Ponto; iniciado: boolean }
  | { tipo: 'giro'; el: Elemento; ang0: number; iniciado: boolean }
  | { tipo: 'argola'; el: Elemento; manipulador: ManipuladorModelo; inicio: Ponto; pontoInicio: Ponto; valorInicio: Ponto; iniciado: boolean }
  | { tipo: 'pan'; inicio: Ponto; cx: number; cy: number };

/** Um modelo: fatias e alças no referencial do centro estável do resultado. */
export interface VistaModelo {
  nome: string;
  fatias: { regiao: Region; cor: string }[];
  minX: number;
  minY: number;
  w: number;
  h: number;
  pronta: boolean;
  manipuladores: ManipuladorModelo[];
}

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
  /** No cartao do canto: sem zoom nem etiqueta, sempre enquadrada. */
  compacto?: boolean;
  /** Canto ocupado pelo cartao da outra vista (o enquadrar o deixa livre). */
  reserva?: Reserva;
  /** Modelos prontos ja gerados, por id do elemento. */
  modelos?: Map<string, VistaModelo>;
  onAlterarManipulador: (id: string, manipulador: ManipuladorModelo, valor: Ponto) => void;
}

export function Tela({ design, regioes, fontes, selecao, grade, finos, onSelecionar, onIniciarGesto, onAlterar, onAlterarManipulador, compacto, reserva, modelos }: Props) {
  const W = design.larguraMm, H = design.alturaMm;
  const camadasOcultas = new Set(design.camadas.filter((c) => c.oculta).map((c) => c.id));
  const area = areaDoDesign(design, regioes, modelos);
  const { caixa, vista, z, mundo, naTela, transformacao: transformacaoTela, enquadrar, ajustar } = useVista(area, { compacto, reserva });
  const gesto = useRef<Gesto | null>(null);
  const [guias, setGuias] = useState<{ x?: number; y?: number }>({});
  const [argolaPreview, setArgolaPreview] = useState<{ id: string; ponto: Ponto } | null>(null);
  const cacheLocal = useRef(new WeakMap<Region, Map<number, Region>>());

  const localFinal = (e: Elemento): Region => {
    const base = regiaoLocal(e, fontes);
    if (!e.engrossar) return base;
    let porEspessura = cacheLocal.current.get(base);
    if (!porEspessura) {
      porEspessura = new Map();
      cacheLocal.current.set(base, porEspessura);
    }
    let r = porEspessura.get(e.engrossar);
    if (!r) {
      r = contornar(base, e.engrossar);
      porEspessura.set(e.engrossar, r);
    }
    return r;
  };

  const travado = (e: Elemento) => e.travado || design.camadas.find((c) => c.id === e.camadaId)?.travada;
  // Caixa real já escalada, em torno da referência estável do elemento e antes do giro.
  const caixaDe = (e: Elemento) => {
    if (e.tipo !== 'modelo') {
      const b = caixaDoElemento(e, fontes);
      return { minX: -b.w / 2, minY: -b.h / 2, w: b.w, h: b.h };
    }
    const m = modelos?.get(e.id);
    const b = m ? { minX: m.minX, minY: m.minY, w: m.w, h: m.h } : { minX: -15, minY: -10, w: 30, h: 20 };
    const sx = e.escalaX * (e.espelhar ? -1 : 1), sy = e.escalaY;
    const x0 = b.minX * sx, x1 = (b.minX + b.w) * sx, y0 = b.minY * sy, y1 = (b.minY + b.h) * sy;
    return { minX: Math.min(x0, x1), minY: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) };
  };

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
    const originais = design.elementos.filter((x) => ids.includes(x.id) && !x.oculto && !camadasOcultas.has(x.camadaId) && !travado(x)).map((x) => ({ id: x.id, x: x.x, y: x.y }));
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
      ajustar((v) => ({ ...v, cx: g.cx - (ev.clientX - g.inicio.x) / z, cy: g.cy + (ev.clientY - g.inicio.y) / z }));
      return;
    }
    const p = mundo(ev.clientX, ev.clientY);
    if (g.tipo === 'mover') {
      if (!g.iniciado) { ajustar((v) => v); onIniciarGesto(); g.iniciado = true; }
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
      if (!g.iniciado) { ajustar((v) => v); onIniciarGesto(); g.iniciado = true; }
      const e0 = g.el;
      const local = localDoElemento(e0, p);
      const fx0 = g.inicio.x ? local.x / g.inicio.x : 1;
      const fy0 = g.inicio.y ? local.y / g.inicio.y : 1;
      let fx: number, fy: number;
      if (ev.shiftKey) { fx = fx0; fy = fy0; }
      else {
        const d = g.inicio.x * g.inicio.x + g.inicio.y * g.inicio.y;
        fx = fy = d ? (local.x * g.inicio.x + local.y * g.inicio.y) / d : 1;
      }
      fx = Math.max(0.05, fx); fy = Math.max(0.05, fy);
      onAlterar([e0.id], (e) => ({ ...e, escalaX: +(e0.escalaX * fx).toFixed(4), escalaY: +(e0.escalaY * fy).toFixed(4) }));
    } else if (g.tipo === 'giro') {
      if (!g.iniciado) { ajustar((v) => v); onIniciarGesto(); g.iniciado = true; }
      const ang = (Math.atan2(p.y - g.el.y, p.x - g.el.x) * 180) / Math.PI;
      let giro = normalizar(g.el.giro + ang - g.ang0);
      if (ev.shiftKey) giro = Math.round(giro / 15) * 15;
      else for (const alvo of [-180, -90, 0, 90, 180]) if (Math.abs(giro - alvo) < 2) giro = alvo;
      onAlterar([g.el.id], (e) => ({ ...e, giro: +normalizar(giro).toFixed(1) }));
    } else if (g.tipo === 'argola') {
      const local = localDoElemento(g.el, p);
      const dx = local.x - g.inicio.x, dy = local.y - g.inicio.y;
      if (Math.hypot(dx, dy) < 0.1 && !g.iniciado) return;
      if (!g.iniciado) { ajustar((v) => v); onIniciarGesto(); g.iniciado = true; }
      const valor = { x: +(g.valorInicio.x + dx * (g.manipulador.eixoX ?? 1)).toFixed(2), y: +(g.valorInicio.y + dy).toFixed(2) };
      onAlterarManipulador(g.el.id, g.manipulador, valor);
      setArgolaPreview({ id: g.manipulador.id, ponto: mundoDoElemento(g.el, { x: g.pontoInicio.x + dx, y: g.pontoInicio.y + dy }) });
    }
  };

  const soltar = (ev: EventoPonteiro) => {
    gesto.current = null;
    setGuias({});
    setArgolaPreview(null);
    if (caixa.current?.hasPointerCapture(ev.pointerId)) caixa.current.releasePointerCapture(ev.pointerId);
  };

  const selecionados = design.elementos.filter((e) => selecao.includes(e.id) && !e.oculto && !camadasOcultas.has(e.camadaId));
  const unico = selecionados.length === 1 ? selecionados[0]! : null;
  const caixaUnico = unico ? caixaDe(unico) : null;
  const r = 6 / z;

  // Etiqueta "L x A mm, camada" abaixo do elemento (em pixels, fora do SVG).
  let etiqueta: { left: number; top: number; texto: string } | null = null;
  if (unico && caixaUnico && !compacto) {
    const rad = (unico.giro * Math.PI) / 180;
    const cantos = [[caixaUnico.minX, caixaUnico.minY], [caixaUnico.minX + caixaUnico.w, caixaUnico.minY], [caixaUnico.minX + caixaUnico.w, caixaUnico.minY + caixaUnico.h], [caixaUnico.minX, caixaUnico.minY + caixaUnico.h]].map(([x, y]) => ({ x: unico.x + x! * Math.cos(rad) - y! * Math.sin(rad), y: unico.y + x! * Math.sin(rad) + y! * Math.cos(rad) }));
    const baixo = Math.min(...cantos.map((c) => c.y));
    const camada = unico.tipo === 'modelo' ? (modelos?.get(unico.id)?.nome ?? 'Modelo') : (design.camadas.find((c) => c.id === unico.camadaId)?.nome ?? '');
    const p = naTela(unico.x, baixo);
    etiqueta = { left: p.x, top: p.y + 10, texto: `${caixaUnico.w.toFixed(1)} × ${caixaUnico.h.toFixed(1)} mm, ${camada}` };
  }

  return (
    <div ref={caixa} className="relative size-full touch-none overflow-hidden bg-superficie-2 select-none" onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar}>
      <svg className="absolute inset-0 size-full" onPointerDown={noVazio} role="img" aria-label="Tela do design">
        <defs>
          <pattern id="grade-mm" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M10 0H0V10" fill="none" className="stroke-texto-3" strokeWidth="0.12" strokeOpacity="0.35" />
          </pattern>
        </defs>
        <g transform={transformacaoTela}>
          <rect x={area.minX} y={area.minY} width={area.w} height={area.h} className="fill-white" />
          {grade && <rect x={area.minX} y={area.minY} width={area.w} height={area.h} fill="url(#grade-mm)" />}
          {design.camadas.map((c) => {
            if (c.oculta) return null;
            if (c.origem !== 'desenhada') {
              const reg = regioes.get(c.id);
              return reg?.length ? <path key={c.id} d={caminho(reg)} fill={c.cor} fillRule="evenodd" className="pointer-events-none" /> : null;
            }
            return design.elementos.filter((e) => e.camadaId === c.id && !e.oculto && e.tipo !== 'modelo').map((e) => (
              <g key={e.id} transform={transformacao(e)}>
                <path d={caminho(localFinal(e))} fill={c.cor} fillRule="evenodd" className={travado(e) ? '' : 'cursor-move'} onPointerDown={(ev) => noElemento(ev, e)} />
              </g>
            ));
          })}
          {design.elementos.filter((e) => e.tipo === 'modelo' && !e.oculto && !camadasOcultas.has(e.camadaId)).map((e) => {
            const m = modelos?.get(e.id);
            return (
              <g key={e.id} transform={transformacao(e)} className={travado(e) ? '' : 'cursor-move'} onPointerDown={(ev) => noElemento(ev, e)}>
                {m ? (
                  <>
                    <rect x={m.minX} y={m.minY} width={m.w} height={m.h} fill="transparent" />
                    {m.fatias.map((f, i) => (
                      <path key={i} d={caminho(f.regiao)} fill={f.cor} fillRule="evenodd" className="stroke-texto-3" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                    ))}
                  </>
                ) : (
                  <rect x={-15} y={-10} width={30} height={20} rx={2} className="fill-superficie-3 stroke-borda-forte" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                )}
              </g>
            );
          })}
          {finos.length > 0 && <path d={caminho(finos)} className="pointer-events-none fill-perigo" fillRule="evenodd" />}
          {guias.x !== undefined && <line x1={0} x2={0} y1={-H / 2} y2={H / 2} className="stroke-acento" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
          {guias.y !== undefined && <line x1={-W / 2} x2={W / 2} y1={0} y2={0} className="stroke-acento" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
          {selecionados.map((e) => {
            const cx = caixaDe(e);
            const ehUnico = unico?.id === e.id;
            return (
              <g key={`sel-${e.id}`} transform={`translate(${e.x} ${e.y}) rotate(${e.giro})`}>
                <rect x={cx.minX} y={cx.minY} width={cx.w} height={cx.h} fill="none" className="pointer-events-none stroke-acento" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                {ehUnico && !travado(e) && (
                  <>
                    <line x1={cx.minX + cx.w / 2} y1={cx.minY + cx.h} x2={cx.minX + cx.w / 2} y2={cx.minY + cx.h + 22 / z} className="pointer-events-none stroke-acento" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                    <circle cx={cx.minX + cx.w / 2} cy={cx.minY + cx.h + 22 / z} r={r} className="cursor-grab fill-white stroke-acento" strokeWidth="1.5" vectorEffect="non-scaling-stroke"
                      onPointerDown={(ev) => { const p = mundo(ev.clientX, ev.clientY); comecar(ev, { tipo: 'giro', el: e, ang0: (Math.atan2(p.y - e.y, p.x - e.x) * 180) / Math.PI, iniciado: false }); }} />
                    {[[cx.minX, cx.minY], [cx.minX + cx.w, cx.minY], [cx.minX + cx.w, cx.minY + cx.h], [cx.minX, cx.minY + cx.h]].map(([x, y], i) => (
                      <rect key={i} x={x! - r} y={y! - r} width={2 * r} height={2 * r} className="cursor-nwse-resize fill-white stroke-acento" strokeWidth="1.5" vectorEffect="non-scaling-stroke"
                        onPointerDown={(ev) => comecar(ev, { tipo: 'escala', el: e, inicio: localDoElemento(e, mundo(ev.clientX, ev.clientY)), iniciado: false })} />
                    ))}
                  </>
                )}
              </g>
            );
          })}
          {unico?.tipo === 'modelo' && !travado(unico) && (() => {
            const modelo = modelos?.get(unico.id);
            if (!modelo || (!modelo.pronta && !argolaPreview)) return null;
            return modelo.manipuladores.filter((m) => modelo.pronta || argolaPreview?.id === m.id).map((m) => {
              const ponto = argolaPreview?.id === m.id ? argolaPreview.ponto : mundoDoElemento(unico, m.ponto);
              return (
                <g key={m.id} aria-hidden="true" data-manipulador="true" className="cursor-grab">
                  <circle cx={ponto.x} cy={ponto.y} r={24 / z} fill="transparent" pointerEvents={modelo.pronta ? 'all' : 'none'} onPointerDown={(ev) => {
                    if (ev.button !== 0) return;
                    const inicio = localDoElemento(unico, mundo(ev.clientX, ev.clientY));
                    comecar(ev, { tipo: 'argola', el: unico, manipulador: m, inicio, pontoInicio: m.ponto, valorInicio: m.valor, iniciado: false });
                    setArgolaPreview({ id: m.id, ponto: mundoDoElemento(unico, m.ponto) });
                  }} />
                  <circle cx={ponto.x} cy={ponto.y} r={6 / z} className="pointer-events-none fill-acento stroke-white" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                  <text transform={`translate(${ponto.x + 10 / z} ${ponto.y - 9 / z}) scale(1 -1)`} fontSize={11 / z} paintOrder="stroke" stroke="var(--color-superficie)" strokeWidth={3 / z} className="pointer-events-none fill-texto font-semibold">{m.rotulo}</text>
                </g>
              );
            });
          })()}
        </g>
      </svg>
      {etiqueta && (
        <span className="pointer-events-none absolute -translate-x-1/2 rounded-md bg-acento px-2 py-0.5 text-mini font-semibold whitespace-nowrap text-white" style={{ left: etiqueta.left, top: etiqueta.top }}>
          {etiqueta.texto}
        </span>
      )}
      {!compacto && <ControlesZoom z={z} ajustar={ajustar} enquadrar={enquadrar} />}
    </div>
  );
}
