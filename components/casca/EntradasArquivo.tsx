'use client';

import { useEffect, useRef } from 'react';
import { useInterface } from '@/store/interface';
import { abrirDesenho, usarFonteArquivo } from '@/features/acoes/origem';

/**
 * Os seletores de arquivo nativos, escondidos (nao da para estilizar).
 *
 * Vivem na casca, fora dos paineis: trocar de area desmontaria o input no meio do
 * dialogo de escolher arquivo, e a escolha se perderia sem erro nenhum. Ja
 * aconteceu -- o import parou de funcionar e so deu para ver lendo o JSX.
 */
export function EntradasArquivo() {
  const desenho = useRef<HTMLInputElement>(null);
  const fonte = useRef<HTMLInputElement>(null);
  const registrar = useInterface((s) => s.registrarSeletores);

  useEffect(() => {
    registrar(
      () => desenho.current?.click(),
      () => fonte.current?.click()
    );
  }, [registrar]);

  return (
    <>
      <input
        ref={desenho}
        type="file"
        accept=".ai,.pdf,application/pdf,application/postscript"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void abrirDesenho(f);
        }}
      />
      <input
        ref={fonte}
        type="file"
        accept=".ttf,.otf,.woff"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void usarFonteArquivo(f);
        }}
      />
    </>
  );
}
