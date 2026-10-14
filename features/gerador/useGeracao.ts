'use client';

/**
 * Gera a receita no worker. So um pedido por vez: enquanto um calcula, os valores que
 * chegam ficam guardados e so o ultimo vai depois (arrastar um controle nao enfileira
 * dezenas de geracoes). A previa continua mostrando o ultimo resultado ate o novo chegar.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Resultado, Valores } from '@/lib/gerador/tipos';
import type { MalhaPronta, PedidoGeracao, RespostaGeracao } from './gerador.worker';
import type { ModeloPronto } from '@/lib/design/modelosProntos';

export interface OpcoesGeracao {
  modo?: 'malhas' | 'resultado';
  modelosProntos?: ModeloPronto[];
  habilitado?: boolean;
}

let sequenciaValores = 0;
const idsValores = new WeakMap<object, number>();
function identidadeValores(valores: Valores): number {
  let id = idsValores.get(valores);
  if (!id) { id = ++sequenciaValores; idsValores.set(valores, id); }
  return id;
}

export interface Geracao {
  resultado: Resultado | null;
  malhas: MalhaPronta[][] | null;
  erro: string | null;
  erroFonte: string | null;
  gerando: boolean;
  chaveAtual: string;
  chaveResultado: string | null;
  chaveErro: string | null;
}

export function useGeracao(receitaId: string, valores: Valores, idsFonte: string[], tentativa: number, opcoes: OpcoesGeracao = {}): Geracao {
  const [estado, setEstado] = useState<Geracao>({ resultado: null, malhas: null, erro: null, erroFonte: null, gerando: true, chaveAtual: '', chaveResultado: null, chaveErro: null });
  const worker = useRef<Worker | null>(null);
  const ocupado = useRef(false);
  const proximo = useRef<PedidoGeracao | null>(null);
  const contador = useRef(0);
  const pedidoAtual = useRef(0);

  const chaveFontes = [...new Set(idsFonte)].sort().join('|');
  const { modo = 'malhas', modelosProntos = [], habilitado = true } = opcoes;
  const temPacoteModelos = opcoes.modelosProntos !== undefined;
  const assinaturaModelos = temPacoteModelos ? modelosProntos.map((m) => `${m.elementoId}:${m.chave}`).sort().join('|') : null;
  const assinaturaValores = temPacoteModelos ? identidadeValores(valores) : valores;
  const chaveAtual = JSON.stringify([receitaId, assinaturaValores, chaveFontes, tentativa, modo, assinaturaModelos]);
  useEffect(() => {
    let w: Worker;
    try { w = new Worker(new URL('./gerador.worker.ts', import.meta.url), { type: 'module' }); }
    catch (e) {
      setEstado((s) => ({ ...s, erro: (e as Error).message || 'Não foi possível iniciar o gerador.', erroFonte: null, chaveAtual, chaveErro: chaveAtual, gerando: false }));
      return;
    }
    worker.current = w;
    const falhar = (mensagem: string) => {
      if (worker.current !== w) return;
      w.terminate();
      worker.current = null;
      ocupado.current = false;
      proximo.current = null;
      setEstado((s) => ({ ...s, erro: mensagem, erroFonte: null, chaveErro: s.chaveAtual, gerando: false }));
    };
    w.onerror = (e) => { e.preventDefault(); falhar(e.message || 'O gerador foi interrompido.'); };
    w.onmessageerror = () => falhar('Não foi possível ler a resposta do gerador.');
    w.onmessage = (e: MessageEvent<RespostaGeracao>) => {
      if (worker.current !== w) return;
      const r = e.data;
      if (r.pedido === pedidoAtual.current) {
        if ('erro' in r) setEstado((s) => ({ ...s, erro: r.erroFonte ? null : r.erro, erroFonte: r.erroFonte ? r.erro : null, chaveErro: s.chaveAtual, gerando: false }));
        else setEstado((s) => ({ ...s, resultado: r.resultado, malhas: r.malhas, erro: null, erroFonte: null, chaveResultado: s.chaveAtual, chaveErro: null, gerando: false }));
      }
      ocupado.current = false;
      const p = proximo.current;
      if (p) {
        proximo.current = null;
        ocupado.current = true;
        try { w.postMessage(p); } catch (e) { falhar((e as Error).message || 'Não foi possível iniciar o gerador.'); }
      }
    };
    return () => {
      w.terminate();
      worker.current = null;
      ocupado.current = false;
      proximo.current = null;
    };
  }, [tentativa]);

  useEffect(() => {
    const w = worker.current;
    if (!w) return;
    const idPedido = ++contador.current;
    pedidoAtual.current = idPedido;
    if (!habilitado) {
      proximo.current = null;
      setEstado((s) => ({ ...s, chaveAtual, gerando: false, chaveErro: null }));
      return;
    }
    const pedido: PedidoGeracao = { pedido: idPedido, receitaId, valores, idsFonte, modo, ...(temPacoteModelos ? { modelosProntos } : {}) };
    setEstado((s) => ({ ...s, chaveAtual, chaveErro: null, gerando: true }));
    if (ocupado.current) proximo.current = pedido;
    else {
      ocupado.current = true;
      try { w.postMessage(pedido); } catch (e) {
        ocupado.current = false;
        setEstado((s) => ({ ...s, erro: (e as Error).message || 'Não foi possível iniciar o gerador.', erroFonte: null, chaveErro: chaveAtual, gerando: false }));
      }
    }
  }, [receitaId, valores, chaveFontes, tentativa, chaveAtual, habilitado, modo, assinaturaModelos, temPacoteModelos]); // eslint-disable-line react-hooks/exhaustive-deps

  const chaveErroVisivel = !worker.current && estado.erro ? chaveAtual : estado.chaveErro;
  return useMemo(() => ({ ...estado, chaveAtual, chaveErro: chaveErroVisivel }), [estado, chaveAtual, chaveErroVisivel]);
}
