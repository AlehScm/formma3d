'use client';

/**
 * Enxergar uma tela em mm (Y para cima) num SVG: tamanho da caixa, zoom na roda em volta do
 * cursor, enquadrar e a conversao entre tela e mundo. Enquanto a pessoa nao mexe no zoom
 * nem arrasta a tela, a vista se reenquadra sozinha quando a caixa muda de tamanho (janela,
 * troca entre principal e canto). No canto (`compacto`) fica sempre enquadrada e, ao voltar,
 * recupera o zoom que a pessoa tinha.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export interface Limites { minX: number; minY: number; w: number; h: number }
/** Canto de cima a direita ocupado por outra coisa (o cartao da outra vista), em px. */
export interface Reserva { w: number; h: number }
export interface Vista { zoom: number; cx: number; cy: number }
export type Ponto = { x: number; y: number };

export const ZOOM_MIN = 0.3;
export const ZOOM_MAX = 40;

/**
 * `folga`: quanto da caixa sobra em volta dos limites (1,15 = 15 %); `borda`: px livres em
 * volta (para cotas). `reserva`: o enquadrar deixa livre esse canto, abrindo mao da faixa de
 * cima ou da coluna da direita (a que deixar a peca maior).
 */
export function useVista(limites: Limites, { folga = 1.15, borda = 0, compacto = false, reserva }: { folga?: number; borda?: number; compacto?: boolean; reserva?: Reserva } = {}) {
  const caixa = useRef<HTMLDivElement>(null);
  const [tam, setTam] = useState({ w: 0, h: 0 });
  const [vista, setVista] = useState<Vista>({ zoom: 0, cx: 0, cy: 0 });
  const auto = useRef(true);
  const lim = useRef(limites);
  lim.current = limites;
  const res = useRef(reserva);
  res.current = reserva;

  const calcular = useCallback((w: number, h: number): Vista => {
    const l = lim.current, r = res.current;
    const lw = Math.max(l.w, 1) * folga, lh = Math.max(l.h, 1) * folga;
    // Area livre (e o deslocamento do centro dela, em px): a caixa toda, sem a faixa de cima ou sem a coluna da direita.
    const areas = [{ w, h, dx: 0, dy: 0 }];
    if (r) areas.push({ w, h: h - r.h, dx: 0, dy: r.h / 2 }, { w: w - r.w, h, dx: -r.w / 2, dy: 0 });
    const b = compacto ? 0 : 2 * borda;
    const zoomDe = (a: (typeof areas)[number]) => (a.w > b && a.h > b ? Math.min((a.w - b) / lw, (a.h - b) / lh) : 0);
    const melhor = r ? areas.slice(1).reduce((m, a) => (zoomDe(a) > zoomDe(m) ? a : m)) : areas[0]!;
    const zoom = zoomDe(melhor) || zoomDe(areas[0]!);
    return { zoom, cx: l.minX + l.w / 2 - melhor.dx / zoom, cy: l.minY + l.h / 2 + melhor.dy / zoom };
  }, [folga, borda, compacto]);

  const enquadrar = useCallback(() => {
    auto.current = true;
    if (tam.w && tam.h) setVista(calcular(tam.w, tam.h));
  }, [tam.w, tam.h, calcular]);

  /** Mudanca feita pela pessoa (zoom, arrastar a tela): para de enquadrar sozinho. */
  const ajustar = useCallback((fn: (v: Vista) => Vista) => {
    auto.current = false;
    setVista(fn);
  }, []);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setTam({ w: e!.contentRect.width, h: e!.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    if (tam.w && tam.h && (auto.current || !vista.zoom)) setVista(calcular(tam.w, tam.h));
  }, [tam.w, tam.h, reserva?.w, reserva?.h, calcular]); // eslint-disable-line react-hooks/exhaustive-deps

  const guardada = useRef<Vista | null>(null);
  useEffect(() => {
    if (compacto) {
      guardada.current = auto.current ? null : vista;
      auto.current = true;
      if (tam.w && tam.h) setVista(calcular(tam.w, tam.h));
    } else if (guardada.current) {
      const v = guardada.current;
      guardada.current = null;
      auto.current = false;
      setVista(v);
    }
  }, [compacto]); // eslint-disable-line react-hooks/exhaustive-deps

  const z = vista.zoom || 1;
  const mundo = useCallback((cliX: number, cliY: number): Ponto => {
    const r = caixa.current!.getBoundingClientRect();
    return { x: (cliX - r.left - tam.w / 2) / z + vista.cx, y: -(cliY - r.top - tam.h / 2) / z + vista.cy };
  }, [tam.w, tam.h, z, vista.cx, vista.cy]);
  /** Ponto do mundo (mm) em pixels dentro da caixa. */
  const naTela = (x: number, y: number): Ponto => ({ x: (x - vista.cx) * z + tam.w / 2, y: -(y - vista.cy) * z + tam.h / 2 });

  // Roda: zoom em volta do cursor (listener nativo, para poder impedir a rolagem da pagina).
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const roda = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const px = e.clientX - r.left - tam.w / 2, py = e.clientY - r.top - tam.h / 2;
      ajustar((v) => {
        const z0 = v.zoom || 1;
        const z1 = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z0 * Math.exp(-e.deltaY * 0.0015)));
        const wx = px / z0 + v.cx, wy = -py / z0 + v.cy;
        return { zoom: z1, cx: wx - px / z1, cy: wy + py / z1 };
      });
    };
    el.addEventListener('wheel', roda, { passive: false });
    return () => el.removeEventListener('wheel', roda);
  }, [tam.w, tam.h, ajustar]);

  const transformacao = `translate(${tam.w / 2} ${tam.h / 2}) scale(${z} ${-z}) translate(${-vista.cx} ${-vista.cy})`;
  return { caixa, tam, vista, z, mundo, naTela, transformacao, enquadrar, ajustar };
}
