'use client';

import { useEffect } from 'react';
import { useInterface, type Espaco, type Ferramenta } from '@/store/interface';

const FERRAMENTAS: Record<string, Ferramenta> = { v: 'selecionar', g: 'mover', r: 'girar', s: 'tamanho' };
const ESPACOS: Record<string, Espaco> = { '1': 'desenhar', '2': 'imprimir', '3': 'orcamento' };

/**
 * Atalhos de teclado. Ignorados enquanto se digita num campo -- senao escrever
 * "RS" no texto do letreiro trocaria de ferramenta.
 */
export function Atalhos({ onEnquadrar }: { onEnquadrar: () => void }) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const alvo = e.target as HTMLElement | null;
      if (alvo && (alvo.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName))) return;

      const ui = useInterface.getState();
      const k = e.key.toLowerCase();

      if (k === 'escape') return ui.selecionar(null);
      if (k === 'f') return onEnquadrar();
      const espaco = ESPACOS[k];
      if (espaco) return ui.setEspaco(espaco);
      const f = FERRAMENTAS[k];
      // "Tamanho" muda o produto: so existe em Desenhar.
      if (f && !(f === 'tamanho' && ui.espaco !== 'desenhar')) ui.setFerramenta(f);
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onEnquadrar]);

  return null;
}
