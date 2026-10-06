'use client';

import { BotaoIcone, IconeEnquadrar, IconeMais, IconeMenos } from '@/components/ui';
import { ZOOM_MAX, ZOOM_MIN, type Vista } from './useVista';

/** − 100 % + ⌖ no canto da tela (100 % = tamanho real num monitor de 96 dpi). */
export function ControlesZoom({ z, ajustar, enquadrar }: { z: number; ajustar: (fn: (v: Vista) => Vista) => void; enquadrar: () => void }) {
  return (
    <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-lg border border-borda bg-superficie p-1 shadow-flutuante">
      <BotaoIcone icone={IconeMenos} rotulo="Diminuir zoom" tamanho="sm" onClick={() => ajustar((v) => ({ ...v, zoom: Math.max(ZOOM_MIN, (v.zoom || 1) / 1.25) }))} />
      <span className="w-12 text-center text-mini tabular-nums text-texto-2">{Math.round((z / 3.78) * 100)}%</span>
      <BotaoIcone icone={IconeMais} rotulo="Aumentar zoom" tamanho="sm" onClick={() => ajustar((v) => ({ ...v, zoom: Math.min(ZOOM_MAX, (v.zoom || 1) * 1.25) }))} />
      <BotaoIcone icone={IconeEnquadrar} rotulo="Enquadrar" tamanho="sm" onClick={enquadrar} />
    </div>
  );
}
