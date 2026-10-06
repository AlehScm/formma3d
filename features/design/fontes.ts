'use client';

/**
 * Fontes carregadas na tela (o contorno do texto e calculado aqui para a tela mostrar
 * exatamente o que vira 3D). Carrega cada fonte uma vez e avisa quando chega.
 */
import { useEffect, useMemo, useState } from 'react';
import type { Font } from 'opentype.js';
import { carregarFonteWeb } from '@/lib/text/fontes';

const prontas = new Map<string, Font>();
const pedidas = new Map<string, Promise<Font>>();

export function useFontes(ids: string[]): { fontes: (id: string) => Font | undefined; versao: number } {
  const [versao, setVersao] = useState(0);
  const chave = [...new Set(ids)].sort().join('|');
  useEffect(() => {
    let vivo = true;
    for (const id of chave ? chave.split('|') : []) {
      if (prontas.has(id)) continue;
      // Cada tela que pede se inscreve na mesma promessa (no modo estrito o efeito roda duas
      // vezes; so marcar "pedida" deixava a segunda sem aviso quando a fonte chegava).
      let p = pedidas.get(id);
      if (!p) {
        p = carregarFonteWeb(id).then((f) => { prontas.set(id, f); return f; });
        p.catch(() => pedidas.delete(id));
        pedidas.set(id, p);
      }
      p.then(() => { if (vivo) setVersao((v) => v + 1); }).catch(() => undefined);
    }
    return () => {
      vivo = false;
    };
  }, [chave]);
  // versao faz quem usa recalcular quando uma fonte chega
  const fontes = useMemo(() => (id: string) => prontas.get(id), [versao]); // eslint-disable-line react-hooks/exhaustive-deps
  return { fontes, versao };
}
