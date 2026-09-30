'use client';

import { useEffect, useRef } from 'react';
import { useInterface, type Espaco, type Ferramenta } from '@/store/interface';
import { useModelo } from '@/modelo/Modelo';
import { agruparSelecao, desagruparSelecao, excluirSelecao, ocultarSelecao, selecionarTudo } from '@/features/acoes/selecao';

const FERRAMENTAS: Record<string, Ferramenta> = { v: 'selecionar', g: 'mover', r: 'girar', s: 'tamanho' };
const ESPACOS: Record<string, Espaco> = { '1': 'desenhar', '2': 'imprimir', '3': 'orcamento' };

/**
 * Atalhos de teclado. Ignorados enquanto se digita num campo -- senao escrever
 * "RS" no texto do letreiro trocaria de ferramenta.
 */
export function Atalhos({ onEnquadrar }: { onEnquadrar: () => void }) {
  // O modelo muda a cada edicao; o ouvinte do teclado le sempre o atual.
  const m = useModelo();
  const modelo = useRef(m);
  modelo.current = m;

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      if (alvo && (alvo.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName))) return;

      const ui = useInterface.getState();
      const k = e.key.toLowerCase();
      const objetos = ui.espaco !== 'orcamento';

      // Combinacoes com Ctrl (Cmd no Mac): as de objetos, como no Photoshop.
      if (e.ctrlKey || e.metaKey) {
        if (!objetos || e.altKey) return;
        if (k === 'a') {
          e.preventDefault();
          return selecionarTudo(modelo.current);
        }
        if (k === 'g') {
          e.preventDefault();
          return e.shiftKey ? desagruparSelecao() : agruparSelecao();
        }
        return;
      }
      if (e.altKey) return;

      // Esc sai da ferramenta primeiro; so no segundo Esc desmarca.
      if (k === 'escape') return ui.ferramentaRelevo ? ui.definirFerramentaRelevo(null) : ui.selecionar(null);
      // Delete/Backspace exclui o que esta selecionado (nunca com o foco num campo:
      // la apaga texto, e isso ja foi barrado acima).
      if ((k === 'delete' || k === 'backspace') && ui.selecao.length && objetos) {
        e.preventDefault();
        return excluirSelecao();
      }
      if (k === 'h' && ui.selecao.length && objetos) return ocultarSelecao();
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
