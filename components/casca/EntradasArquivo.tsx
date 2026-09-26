'use client';

import { useEffect, useRef } from 'react';
import { useInterface } from '@/store/interface';
import { abrirArquivo, usarFonteArquivo, usarTtfParaTexto } from '@/features/acoes/origem';

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
  const fonteTexto = useRef<HTMLInputElement>(null);
  // Qual fonte o texto vivo pediu: o .ttf escolhido e guardado com esse nome.
  const pedida = useRef('');
  // Abrir desenho substitui os arquivos do letreiro; Adicionar poe ao lado.
  const substituir = useRef(true);
  const registrar = useInterface((s) => s.registrarSeletores);

  useEffect(() => {
    registrar(
      (sub = true) => {
        substituir.current = sub;
        desenho.current?.click();
      },
      () => fonte.current?.click(),
      (nome) => {
        pedida.current = nome;
        fonteTexto.current?.click();
      }
    );
  }, [registrar]);

  return (
    <>
      <input
        ref={desenho}
        type="file"
        multiple
        accept=".ai,.pdf,.stl,application/pdf,application/postscript,model/stl"
        className="hidden"
        onChange={async (e) => {
          const lista = [...(e.target.files ?? [])];
          e.target.value = '';
          // Varios de uma vez: o primeiro segue o modo pedido, os outros entram ao lado.
          for (const [i, f] of lista.entries()) await abrirArquivo(f, substituir.current && i === 0);
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
      <input
        ref={fonteTexto}
        type="file"
        accept=".ttf,.otf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f && pedida.current) void usarTtfParaTexto(pedida.current, f);
        }}
      />
    </>
  );
}
