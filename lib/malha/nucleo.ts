/**
 * Motor de malha 3D (manifold-3d, WASM): booleanas com saida sempre fechada.
 *
 * Inicia uma vez (`iniciarMalha`) e so se usa dentro de `comEscopo`. Todo objeto WASM criado
 * ali (Manifold, CrossSection) e apagado quando o escopo termina, entao nada vivo escapa para
 * o React, o worker ou o teste: o que sai do escopo e dado puro (Malha, Region, numeros).
 * Criar objeto fora de um escopo, ou devolver um objeto WASM do escopo, e erro.
 */
import type { CrossSection, Manifold, ManifoldToplevel } from 'manifold-3d';

export type Motor = ManifoldToplevel;

interface Apagavel {
  delete(): void;
  isDeleted(): boolean;
}

let motor: Motor | null = null;
let iniciando: Promise<Motor> | null = null;
const escopos: Set<Apagavel>[] = [];
let vivos = 0;
let ehObjeto: (x: unknown) => x is Manifold | CrossSection = (x): x is Manifold | CrossSection => false;

const NAO_SAO_CRIACAO = new Set(['constructor', 'prototype', 'delete', 'isDeleted', 'deleteLater', 'isAliasOf', 'length', 'name']);
const EMBRULHADO = Symbol('malha:embrulhado');

function registrar<T>(r: T): T {
  const lista = Array.isArray(r) ? r : [r];
  for (const o of lista) {
    if (!ehObjeto(o)) continue;
    const escopo = escopos[escopos.length - 1];
    if (!escopo) {
      (o as unknown as Apagavel).delete();
      throw new Error('malha: objeto criado fora de comEscopo');
    }
    if (!escopo.has(o as unknown as Apagavel)) {
      escopo.add(o as unknown as Apagavel);
      vivos++;
    }
  }
  return r;
}

/** Embrulha cada metodo (do objeto e da cadeia de prototipos) para registrar o que ele cria. */
function interceptar(alvo: object, parar: object) {
  for (let p: object | null = alvo; p && p !== parar; p = Object.getPrototypeOf(p)) {
    for (const k of Object.getOwnPropertyNames(p)) {
      if (NAO_SAO_CRIACAO.has(k)) continue;
      const d = Object.getOwnPropertyDescriptor(p, k);
      if (!d || typeof d.value !== 'function' || !d.writable || d.value[EMBRULHADO]) continue;
      const original = d.value as (...a: unknown[]) => unknown;
      const embrulho = function (this: unknown, ...a: unknown[]) {
        return registrar(original.apply(this, a));
      };
      Object.defineProperty(embrulho, EMBRULHADO, { value: true });
      Object.defineProperty(p, k, { ...d, value: embrulho });
    }
  }
}

/** Construtor que registra o objeto criado com `new`. */
function construtorRegistrado<C extends abstract new (...a: never[]) => object>(classe: C): C {
  return new Proxy(classe, {
    construct(alvo, args, novo) {
      return registrar(Reflect.construct(alvo, args, novo));
    },
  });
}

/**
 * Carrega o WASM (uma vez; chamadas seguintes esperam a mesma carga). Se a carga falhar (rede,
 * arquivo trocado no deploy), a proxima chamada tenta de novo.
 */
export function iniciarMalha(): Promise<void> {
  // No node (testes) o modulo acha o .wasm ao lado dele; no navegador e no worker, em public/.
  const emNode = typeof process !== 'undefined' && !!process.versions?.node;
  // import() e nao import: o pacote so exporta ESM, e assim o JS dele so baixa quando pedido.
  iniciando ??= import('manifold-3d').then(({ default: Module }) =>
    Module(emNode ? undefined : { locateFile: () => `${process.env.NEXT_PUBLIC_BASE ?? ''}/manifold.wasm` })
  ).then((m) => {
    m.setup();
    const { Manifold: M, CrossSection: C } = m;
    ehObjeto = (x): x is Manifold | CrossSection => x instanceof M || x instanceof C;
    interceptar(M, Function.prototype);
    interceptar(M.prototype, Object.prototype);
    interceptar(C, Function.prototype);
    interceptar(C.prototype, Object.prototype);
    m.Manifold = construtorRegistrado(M);
    m.CrossSection = construtorRegistrado(C);
    motor = m;
    return m;
  }, (erro: unknown) => {
    iniciando = null;
    throw erro;
  });
  return iniciando.then(() => undefined);
}

export const malhaPronta = (): boolean => motor !== null;

/**
 * Roda `fn` com o motor; tudo que for criado dentro e apagado no fim (mesmo com erro).
 * Escopos aninhados apagam so o que criaram. `fn` e sincrona: depois de um `await` os
 * objetos ja estariam apagados.
 */
export function comEscopo<T>(fn: (m: Motor) => T): T {
  if (!motor) throw new Error('malha: motor nao iniciado (falta await iniciarMalha())');
  const escopo = new Set<Apagavel>();
  escopos.push(escopo);
  try {
    const r = fn(motor);
    if (typeof (r as { then?: unknown } | null)?.then === 'function') throw new Error('malha: comEscopo recebeu funcao assincrona; o escopo e sincrono');
    if (ehObjeto(r) || (Array.isArray(r) && r.some(ehObjeto))) throw new Error('malha: comEscopo devolveu objeto WASM; devolva Malha, Region ou numero');
    return r;
  } finally {
    escopos.pop();
    for (const o of escopo) if (!o.isDeleted()) o.delete();
    vivos -= escopo.size;
  }
}

/** Quantos objetos WASM estao vivos agora (0 fora de qualquer escopo). */
export const objetosVivos = () => vivos;
