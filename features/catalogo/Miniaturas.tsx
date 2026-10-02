'use client';

/**
 * Miniaturas reais dos geradores no catalogo. A foto sai do proprio gerador (exemplo da
 * ficha), uma por vez, depois que a pagina aparece; fica guardada na memoria e no
 * navegador para a proxima visita. Sem WebGL, o card fica com o desenho de reserva.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { ficha, FICHAS } from '@/lib/gerador/receitas/fichas';

/** Mudou a geometria das receitas de um jeito que muda a foto: suba o numero. */
const VERSAO = 3;
/** Foto que demora mais que isto (fonte que nao chega, WebGL travado) fica no desenho de reserva. */
const TEMPO_MAX = 20000; // ms
const memoria = new Map<string, string>();
const pendentes = new Map<string, Promise<string>>();
let fila: Promise<unknown> = Promise.resolve();

function chave(id: string): string {
  const texto = JSON.stringify(ficha(id));
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) | 0;
  return `formma3d:miniatura:v${VERSAO}:${id}:${(h >>> 0).toString(36)}`;
}

let limpo = false;
/** Tira do navegador as fotos que nao valem mais (outra versao ou ficha mudada), uma vez por pagina. */
function limparAntigas(): void {
  if (limpo) return;
  limpo = true;
  try {
    const atuais = new Set(FICHAS.map((f) => chave(f.id)));
    for (const k of Object.keys(localStorage)) if (k.startsWith('formma3d:miniatura:') && !atuais.has(k)) localStorage.removeItem(k);
  } catch {
    // sem armazenamento: nada a limpar
  }
}

function guardada(id: string): string | null {
  limparAntigas();
  const k = chave(id);
  if (memoria.has(k)) return memoria.get(k)!;
  try {
    const salva = localStorage.getItem(k);
    if (salva) memoria.set(k, salva);
    return salva;
  } catch {
    return null;
  }
}

function pedir(id: string): Promise<string> {
  const k = chave(id);
  const emAndamento = pendentes.get(k);
  if (emAndamento) return emAndamento;
  const vez = fila.then(async () => {
    const pronta = guardada(id);
    if (pronta) return pronta;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const url = await Promise.race([
      import('./renderMiniatura').then(({ renderizarMiniatura }) => renderizarMiniatura(id)),
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

/** Foto do gerador `id`; `reserva` aparece se nao der para fotografar. */
export function Miniatura({ id, alt, reserva }: { id: string; alt: string; reserva: ReactNode }) {
  const [url, setUrl] = useState<string | null>(null);
  const [falhou, setFalhou] = useState(false);
  useEffect(() => {
    let vivo = true;
    const pronta = guardada(id);
    setUrl(pronta);
    setFalhou(false);
    if (!pronta) pedir(id).then((u) => vivo && setUrl(u)).catch(() => vivo && setFalhou(true));
    return () => {
      vivo = false;
    };
  }, [id]);
  if (!url) return <div className="miniatura-reserva" role="img" aria-label={falhou ? `Ilustração de ${alt}` : `Ilustração de ${alt}; prévia 3D carregando`}>{reserva}</div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="miniatura" src={url} alt={alt} draggable={false} />;
}
