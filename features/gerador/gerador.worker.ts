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
import { resolverModeloPronto, type ModeloPronto } from '@/lib/design/modelosProntos';
import { validarCamposDesenho } from '@/lib/gerador/validacaoDesenho';
import { lerDesign } from '@/lib/design/documento';

export interface PedidoGeracao {
  pedido: number;
  receitaId: string;
  valores: Valores;
  idsFonte: string[];
  modo?: 'malhas' | 'resultado';
  modelosProntos?: ModeloPronto[];
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
  const { pedido, receitaId, valores, idsFonte, modo = 'malhas', modelosProntos = [] } = e.data;
  const receita = receitaPorId(receitaId);
  if (!receita) { responder({ pedido, erro: `Gerador desconhecido: ${receitaId}` }); return; }
  try {
    for (const parametro of receita.parametros) {
      if (parametro.tipo !== 'svg') continue;
      const valor = valores[parametro.id];
      if (typeof valor !== 'string' || !valor) continue;
      if (receitaId === 'design-livre' && parametro.id === 'design') {
        try {
          const design = lerDesign(JSON.parse(valor));
          const camadas = new Set(design.camadas.filter((c) => !c.oculta).map((c) => c.id));
          for (const elemento of design.elementos) {
            if (elemento.tipo !== 'modelo' || elemento.oculto || !camadas.has(elemento.camadaId)) continue;
            const receitaModelo = receitaPorId(elemento.receita);
            if (!receitaModelo) continue;
            const valoresModelo = valoresValidos(receitaModelo, elemento.valores);
            const campoInvalido = validarCamposDesenho(receitaModelo.parametros, valoresModelo);
            if (campoInvalido) throw new Error(`${elemento.id} · ${campoInvalido.rotulo}: ${campoInvalido.mensagem}`);
          }
        }
        catch (err) { throw new Error(`${parametro.rotulo}: ${(err as Error).message || 'design inválido.'}`); }
        continue;
      }
      const campoInvalido = validarCamposDesenho([parametro], valores);
      if (campoInvalido) throw new Error(`${campoInvalido.rotulo}: ${campoInvalido.mensagem}`);
    }
  } catch (err) {
    responder({ pedido, erro: (err as Error).message || 'O desenho importado é inválido.' });
    return;
  }
  let lista: Font[];
  try {
    lista = await Promise.all(idsFonte.map(fonte));
  } catch (err) {
    responder({ pedido, erro: (err as Error).message, erroFonte: true });
    return;
  }
  try {
    const mapa = new Map(idsFonte.map((id, i) => [id, lista[i]!]));
    const resolver = e.data.modelosProntos !== undefined ? resolverModeloPronto(modelosProntos) : undefined;
    const resultado = receita.gerar(valoresValidos(receita, valores), { fonte: (f) => mapa.get(f) ?? lista[0]!, ...(resolver ? { resultadoModelo: resolver, tentativaModelo: (id) => modelosProntos.find((m) => m.elementoId === id)?.tentativa ?? 0 } : {}) });
    if (modo === 'resultado') { responder({ pedido, resultado, malhas: [] }); return; }
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
