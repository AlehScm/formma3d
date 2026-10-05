'use client';

/**
 * Miniaturas reais dos geradores no catalogo. A foto sai do proprio gerador (exemplo da
 * ficha), uma por vez, depois que a pagina aparece; fica guardada na memoria e no
 * navegador para a proxima visita. Sem WebGL, o card fica com o desenho de reserva.
 */
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ficha, FICHAS } from '@/lib/gerador/receitas/fichas';
import { criarFilaSerial } from './filaSerial';

/** Mudou a geometria das receitas de um jeito que muda a foto: suba o numero. */
const VERSAO = 3;
const TEMPO_MAX = 20000;
const memoria = new Map<string, string>();
const pendentes = new Map<string, { promessa: Promise<string>; cancelar: () => void; ouvintes: number; iniciada: boolean }>();
const enfileirar = criarFilaSerial();

function chave(id: string, paleta?: string[]): string {
  const texto = JSON.stringify(ficha(id));
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) | 0;
  const base = `formma3d:miniatura:v${VERSAO}:${id}:${(h >>> 0).toString(36)}`;
  return paleta?.length ? `${base}|p=${paleta.join('-')}` : base;
}

let limpo = false;
/** Tira do navegador as fotos que nao valem mais (outra versao ou ficha mudada), uma vez por pagina. */
function limparAntigas(): void {
  if (limpo) return;
  limpo = true;
  try {
    const atuais = new Set(FICHAS.map((f) => chave(f.id)));
    for (const k of Object.keys(localStorage)) if (k.startsWith('formma3d:miniatura:') && !atuais.has(k.split('|p=')[0]!)) localStorage.removeItem(k);
  } catch {
    // sem armazenamento: nada a limpar
  }
}

function guardada(id: string, paleta?: string[]): string | null {
  limparAntigas();
  const k = chave(id, paleta);
  if (memoria.has(k)) return memoria.get(k)!;
  try {
    const salva = localStorage.getItem(k);
    if (salva) memoria.set(k, salva);
    return salva;
  } catch {
    return null;
  }
}

function pedir(id: string, paleta?: string[]): { promessa: Promise<string>; liberar: () => void } {
  const k = chave(id, paleta);
  const existente = pendentes.get(k);
  if (existente) {
    existente.ouvintes++;
    return { promessa: existente.promessa, liberar: () => liberar(k, existente) };
  }
  const estado = { promessa: Promise.resolve(''), cancelar: () => {}, ouvintes: 1, iniciada: false };
  const trabalho = enfileirar(async () => {
    estado.iniciada = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const pronta = guardada(id, paleta);
      if (pronta) return pronta;
      const modulo = await Promise.race([import('./renderMiniatura'), new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Carregamento da miniatura demorou demais')), TEMPO_MAX);
      })]);
      if (timer) clearTimeout(timer);
      const url = await modulo.renderizarMiniatura(id, paleta);
      memoria.set(k, url);
      try { localStorage.setItem(k, url); } catch { /* armazenamento opcional */ }
      return url;
    } finally {
      if (timer) clearTimeout(timer);
      pendentes.delete(k);
    }
  });
  estado.promessa = trabalho.promessa;
  estado.cancelar = trabalho.cancelar;
  pendentes.set(k, estado);
  return { promessa: estado.promessa, liberar: () => liberar(k, estado) };
}

function liberar(k: string, esperado: { promessa: Promise<string>; cancelar: () => void; ouvintes: number; iniciada: boolean }): void {
  const estado = pendentes.get(k);
  if (!estado || estado !== esperado) return;
  estado.ouvintes--;
  if (estado.ouvintes <= 0 && !estado.iniciada) {
    estado.cancelar();
    if (pendentes.get(k) === esperado) pendentes.delete(k);
  }
}

const Paleta = createContext<string[] | undefined>(undefined);

/** Pinta as miniaturas de dentro com as cores do tema (pagina de um universo). */
export function ComPaleta({ cores, children }: { cores: string[]; children: ReactNode }) {
  return <Paleta.Provider value={cores}>{children}</Paleta.Provider>;
}

/** Foto do gerador `id`; `reserva` aparece se nao der para fotografar. `paleta` vence a de `ComPaleta`. */
export function Miniatura({ id, alt, reserva, paleta }: { id: string; alt: string; reserva: ReactNode; paleta?: string[] }) {
  const doTema = useContext(Paleta);
  const cores = paleta ?? doTema;
  const assinatura = cores?.join('-') ?? '';
  const elemento = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [falhou, setFalhou] = useState(false);
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    const alvo = elemento.current;
    if (!alvo || typeof IntersectionObserver === 'undefined') { setVisivel(true); return; }
    const observador = new IntersectionObserver(([entrada]) => {
      if (entrada?.isIntersecting) { setVisivel(true); observador.disconnect(); }
    }, { rootMargin: '160px' });
    observador.observe(alvo);
    return () => observador.disconnect();
  }, []);
  useEffect(() => {
    let vivo = true;
    let liberar: (() => void) | undefined;
    const lista = assinatura ? assinatura.split('-') : undefined;
    const pronta = guardada(id, lista);
    setUrl(pronta);
    setFalhou(false);
    if (!pronta && visivel) {
      const trabalho = pedir(id, lista);
      liberar = trabalho.liberar;
      trabalho.promessa.then((u) => vivo && setUrl(u)).catch(() => vivo && setFalhou(true));
    }
    return () => {
      vivo = false;
      liberar?.();
    };
  }, [id, assinatura, visivel]);
  if (!url) return <div ref={elemento} className="miniatura-reserva" role="img" aria-label={falhou ? `Ilustração de ${alt}` : `Ilustração de ${alt}; prévia 3D carregando`}>{reserva}</div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="miniatura" src={url} alt={alt} draggable={false} />;
}
