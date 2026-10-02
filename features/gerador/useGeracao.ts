'use client';

/**
 * Gera a receita no worker. So um pedido por vez: enquanto um calcula, os valores que
 * chegam ficam guardados e so o ultimo vai depois (arrastar um controle nao enfileira
 * dezenas de geracoes). A previa continua mostrando o ultimo resultado ate o novo chegar.
 */
import { useEffect, useRef, useState } from 'react';
import type { Resultado, Valores } from '@/lib/gerador/tipos';
import type { MalhaPronta, PedidoGeracao, RespostaGeracao } from './gerador.worker';

export interface Geracao {
  resultado: Resultado | null;
  malhas: MalhaPronta[][] | null;
  erro: string | null;
  erroFonte: string | null;
  gerando: boolean;
}

export function useGeracao(receitaId: string, valores: Valores, idsFonte: string[], tentativa: number): Geracao {
  const [estado, setEstado] = useState<Geracao>({ resultado: null, malhas: null, erro: null, erroFonte: null, gerando: true });
  const worker = useRef<Worker | null>(null);
  const ocupado = useRef(false);
  const proximo = useRef<PedidoGeracao | null>(null);
  const contador = useRef(0);

  useEffect(() => {
    const w = new Worker(new URL('./gerador.worker.ts', import.meta.url), { type: 'module' });
    worker.current = w;
    w.onmessage = (e: MessageEvent<RespostaGeracao>) => {
      const r = e.data;
      // Resposta de um pedido que ja foi superado: so serve se nao houver outro na fila.
      if ('erro' in r) setEstado((s) => ({ ...s, erro: r.erroFonte ? null : r.erro, erroFonte: r.erroFonte ? r.erro : null, gerando: !!proximo.current }));
      else setEstado({ resultado: r.resultado, malhas: r.malhas, erro: null, erroFonte: null, gerando: !!proximo.current });
      ocupado.current = false;
      const p = proximo.current;
      if (p) {
        proximo.current = null;
        ocupado.current = true;
        w.postMessage(p);
      }
    };
    return () => {
      w.terminate();
      worker.current = null;
      ocupado.current = false;
      proximo.current = null;
    };
  }, []);

  const chaveFontes = idsFonte.join('|');
  useEffect(() => {
    const w = worker.current;
    if (!w) return;
    const pedido: PedidoGeracao = { pedido: ++contador.current, receitaId, valores, idsFonte };
    setEstado((s) => ({ ...s, gerando: true }));
    if (ocupado.current) proximo.current = pedido;
    else {
      ocupado.current = true;
      w.postMessage(pedido);
    }
  }, [receitaId, valores, chaveFontes, tentativa]); // eslint-disable-line react-hooks/exhaustive-deps

  return estado;
}
