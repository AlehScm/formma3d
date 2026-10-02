/**
 * Worker dos geradores: gera a receita e ja monta a malha de cada peca (posicoes e
 * normais), fora da linha da tela -- receita pesada (centenas de ms) nao trava o
 * navegador. As fontes carregam aqui mesmo, uma vez cada.
 */
import * as THREE from 'three';
import type { Font } from 'opentype.js';
import { receitaPorId } from '@/lib/gerador/receitas';
import { valoresValidos, type Resultado, type Valores } from '@/lib/gerador/tipos';
import { posicoesDaPeca } from '@/lib/gerador/malha';
import { carregarFonteWeb } from '@/lib/text/fontes';

export interface PedidoGeracao {
  pedido: number;
  receitaId: string;
  valores: Valores;
  idsFonte: string[];
}

export interface MalhaPronta {
  posicoes: Float32Array;
  normais: Float32Array;
}

export type RespostaGeracao =
  | { pedido: number; resultado: Resultado; malhas: MalhaPronta[][] }
  | { pedido: number; erro: string; erroFonte?: boolean };

const fontes = new Map<string, Promise<Font>>();
const fonte = (id: string) => {
  let f = fontes.get(id);
  if (!f) {
    f = carregarFonteWeb(id);
    // Falhou: esquece, para a proxima tentativa buscar de novo.
    f.catch(() => fontes.delete(id));
    fontes.set(id, f);
  }
  return f;
};

const responder = (r: RespostaGeracao, transferir: Transferable[] = []) => (self as unknown as Worker).postMessage(r, transferir);

self.onmessage = async (e: MessageEvent<PedidoGeracao>) => {
  const { pedido, receitaId, valores, idsFonte } = e.data;
  let lista: Font[];
  try {
    lista = await Promise.all(idsFonte.map(fonte));
  } catch (err) {
    responder({ pedido, erro: (err as Error).message, erroFonte: true });
    return;
  }
  try {
    const receita = receitaPorId(receitaId);
    if (!receita) throw new Error(`Gerador desconhecido: ${receitaId}`);
    const mapa = new Map(idsFonte.map((id, i) => [id, lista[i]!]));
    const resultado = receita.gerar(valoresValidos(receita, valores), { fonte: (f) => mapa.get(f) ?? lista[0]! });
    const transferir: Transferable[] = [];
    const malhas = resultado.itens.map((it) =>
      it.pecas.map((p) => {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(posicoesDaPeca(p), 3));
        g.computeVertexNormals();
        const posicoes = g.getAttribute('position').array as Float32Array, normais = g.getAttribute('normal').array as Float32Array;
        g.dispose();
        transferir.push(posicoes.buffer, normais.buffer);
        return { posicoes, normais };
      })
    );
    responder({ pedido, resultado, malhas }, transferir);
  } catch (err) {
    responder({ pedido, erro: (err as Error).message });
  }
};
