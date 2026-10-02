import opentype, { type Font } from 'opentype.js';

// Fontes pesadas/condensadas, que sao as que funcionam em letra caixa.
// Servidas pelo Fontsource via jsDelivr para o app abrir funcionando sem instalar nada.
const CDN = 'https://cdn.jsdelivr.net/fontsource/fonts/';

export interface FonteWeb {
  id: string;
  nome: string;
  url: string;
}

export const FONTES_WEB: FonteWeb[] = [
  { id: 'anton', nome: 'Anton', url: CDN + 'anton@latest/latin-400-normal.ttf' },
  { id: 'archivo-black', nome: 'Archivo Black', url: CDN + 'archivo-black@latest/latin-400-normal.ttf' },
  { id: 'bebas-neue', nome: 'Bebas Neue', url: CDN + 'bebas-neue@latest/latin-400-normal.ttf' },
  { id: 'montserrat-900', nome: 'Montserrat Black', url: CDN + 'montserrat@latest/latin-900-normal.ttf' },
  { id: 'oswald-700', nome: 'Oswald Bold', url: CDN + 'oswald@latest/latin-700-normal.ttf' },
  { id: 'poppins-800', nome: 'Poppins ExtraBold', url: CDN + 'poppins@latest/latin-800-normal.ttf' },
  { id: 'lobster', nome: 'Lobster (script)', url: CDN + 'lobster@latest/latin-400-normal.ttf' },
  { id: 'pacifico', nome: 'Pacifico (script)', url: CDN + 'pacifico@latest/latin-400-normal.ttf' },
  // Google Fonts (licenca livre, OFL) das familias dos geradores do catalogo.
  { id: 'luckiest-guy', nome: 'Luckiest Guy', url: CDN + 'luckiest-guy@latest/latin-400-normal.ttf' },
  { id: 'cal-sans', nome: 'Cal Sans', url: CDN + 'cal-sans@latest/latin-400-normal.ttf' },
  { id: 'plus-jakarta-800', nome: 'Plus Jakarta Sans ExtraBold', url: CDN + 'plus-jakarta-sans@latest/latin-800-normal.ttf' },
  { id: 'open-sans-800', nome: 'Open Sans ExtraBold', url: CDN + 'open-sans@latest/latin-800-normal.ttf' },
  { id: 'cinzel-700', nome: 'Cinzel Bold', url: CDN + 'cinzel@latest/latin-700-normal.ttf' },
  { id: 'playfair-900', nome: 'Playfair Display Black', url: CDN + 'playfair-display@latest/latin-900-normal.ttf' },
  { id: 'chicle', nome: 'Chicle', url: CDN + 'chicle@latest/latin-400-normal.ttf' },
  { id: 'emilys-candy', nome: 'Emilys Candy', url: CDN + 'emilys-candy@latest/latin-400-normal.ttf' },
  { id: 'mouse-memoirs', nome: 'Mouse Memoirs', url: CDN + 'mouse-memoirs@latest/latin-400-normal.ttf' },
  { id: 'roboto-mono-700', nome: 'Roboto Mono Bold', url: CDN + 'roboto-mono@latest/latin-700-normal.ttf' },
  { id: 'dancing-script-700', nome: 'Dancing Script (script)', url: CDN + 'dancing-script@latest/latin-700-normal.ttf' },
  { id: 'great-vibes', nome: 'Great Vibes (script)', url: CDN + 'great-vibes@latest/latin-400-normal.ttf' },
  { id: 'kaushan-script', nome: 'Kaushan Script (script)', url: CDN + 'kaushan-script@latest/latin-400-normal.ttf' },
  { id: 'permanent-marker', nome: 'Permanent Marker (script)', url: CDN + 'permanent-marker@latest/latin-400-normal.ttf' },
  { id: 'cookie', nome: 'Cookie (script)', url: CDN + 'cookie@latest/latin-400-normal.ttf' },
  { id: 'damion', nome: 'Damion (script)', url: CDN + 'damion@latest/latin-400-normal.ttf' },
  { id: 'sacramento', nome: 'Sacramento (script)', url: CDN + 'sacramento@latest/latin-400-normal.ttf' },
  { id: 'sofia', nome: 'Sofia (script)', url: CDN + 'sofia@latest/latin-400-normal.ttf' },
];

/** Emoji em contorno (Noto Emoji, OFL): fonte de reserva para o que a fonte escolhida nao tem. */
export const FONTE_EMOJI: FonteWeb = { id: 'noto-emoji', nome: 'Noto Emoji', url: CDN + 'noto-emoji@latest/emoji-400-normal.ttf' };

const cache = new Map<string, Font>();

export async function carregarFonteWeb(id: string): Promise<Font> {
  const emCache = cache.get(id);
  if (emCache) return emCache;
  const def = [...FONTES_WEB, FONTE_EMOJI].find((f) => f.id === id);
  if (!def) throw new Error('Fonte desconhecida: ' + id);
  const res = await fetch(def.url);
  if (!res.ok) throw new Error(`Falha ao baixar ${def.nome} (${res.status})`);
  const font = opentype.parse(await res.arrayBuffer());
  cache.set(id, font);
  return font;
}

export async function carregarFonteArquivo(file: File): Promise<Font> {
  return opentype.parse(await file.arrayBuffer());
}

export interface FonteSistema {
  id: string;
  nome: string;
  familia: string;
  handle: FontData;
}

export interface ResultadoFontesSistema {
  suportado: boolean;
  fontes: FonteSistema[];
  erro?: string;
}

/**
 * Fontes instaladas na maquina, via Local Font Access API (Chrome/Edge em localhost).
 * Da acesso ao acervo que ja existe para o Corel. Pede permissao na primeira chamada.
 */
export async function listarFontesSistema(): Promise<ResultadoFontesSistema> {
  if (typeof window === 'undefined' || !window.queryLocalFonts) {
    return { suportado: false, fontes: [] };
  }
  try {
    const fonts = await window.queryLocalFonts();
    return {
      suportado: true,
      fontes: fonts.map((f) => ({ id: f.postscriptName, nome: f.fullName, familia: f.family, handle: f })),
    };
  } catch (e) {
    return { suportado: true, fontes: [], erro: e instanceof Error ? e.message : String(e) };
  }
}

export async function carregarFonteSistema(entry: FonteSistema): Promise<Font> {
  const blob = await entry.handle.blob();
  return opentype.parse(await blob.arrayBuffer());
}
