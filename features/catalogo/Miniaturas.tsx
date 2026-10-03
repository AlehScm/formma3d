'use client';

/**
 * Miniaturas reais dos geradores no catalogo. A foto sai do proprio gerador (exemplo da
 * ficha), uma por vez, depois que a pagina aparece; fica guardada na memoria e no
 * navegador para a proxima visita. Sem WebGL, o card fica com o desenho de reserva.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ficha, FICHAS } from '@/lib/gerador/receitas/fichas';

/** Mudou a geometria das receitas de um jeito que muda a foto: suba o numero. */
const VERSAO = 3;
/** Foto que demora mais que isto (fonte que nao chega, WebGL travado) fica no desenho de reserva. */
const TEMPO_MAX = 20000; // ms
const memoria = new Map<string, string>();
const pendentes = new Map<string, Promise<string>>();
let fila: Promise<unknown> = Promise.resolve();

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

function pedir(id: string, paleta?: string[]): Promise<string> {
  const k = chave(id, paleta);
  const emAndamento = pendentes.get(k);
  if (emAndamento) return emAndamento;
  const vez = fila.then(async () => {
    const pronta = guardada(id, paleta);
    if (pronta) return pronta;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const url = await Promise.race([
      import('./renderMiniatura').then(({ renderizarMiniatura }) => renderizarMiniatura(id, paleta)),
      new Promise<never>((_, falha) => { timer = setTimeout(() => falha(new Error('Miniatura demorou demais')), TEMPO_MAX); }),
    ]).finally(() => { if (timer) clearTimeout(timer); });
    memoria.set(k, url);
    try {
      localStorage.setItem(k, url);
    } catch {
      // sem espaco ou sem armazenamento: so vale nesta visita
    }
    return url;
  }).finally(() => { pendentes.delete(k); });
  pendentes.set(k, vez);
  fila = vez.catch(() => undefined);
  return vez;
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
  const [url, setUrl] = useState<string | null>(null);
  const [falhou, setFalhou] = useState(false);
  useEffect(() => {
    let vivo = true;
    const lista = assinatura ? assinatura.split('-') : undefined;
    const pronta = guardada(id, lista);
    setUrl(pronta);
    setFalhou(false);
    if (!pronta) pedir(id, lista).then((u) => vivo && setUrl(u)).catch(() => vivo && setFalhou(true));
    return () => {
      vivo = false;
    };
  }, [id, assinatura]);
  if (!url) return <div className="miniatura-reserva" role="img" aria-label={falhou ? `Ilustração de ${alt}` : `Ilustração de ${alt}; prévia 3D carregando`}>{reserva}</div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="miniatura" src={url} alt={alt} draggable={false} />;
}
