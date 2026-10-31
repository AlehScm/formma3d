'use client';

/**
 * Tag do Google (Ads e Analytics) e a conversao do clique no WhatsApp. Desligada (IDs vazios em
 * lib/medicao.ts ou fora do site publicado), nao renderiza nada. O clique e ouvido no documento:
 * todo link wa.me conta, inclusive os que entrarem depois, sem mexer em cada botao. Link que
 * nao e pedido (troca, dados pessoais) leva `data-medir="nao"`.
 */
import Script from 'next/script';
import { useEffect } from 'react';
import { medicaoLigada, medir, tagsDoGoogle } from '@/lib/medicao';

export function Medicao() {
  const ligada = medicaoLigada();
  useEffect(() => {
    if (!ligada) return;
    const aoClicar = (e: MouseEvent) => {
      if (e.target instanceof Element && e.target.closest('a[href^="https://wa.me/"]:not([data-medir="nao"])')) medir('whatsapp');
    };
    document.addEventListener('click', aoClicar, true);
    return () => document.removeEventListener('click', aoClicar, true);
  }, [ligada]);
  if (!ligada) return null;
  const ids = tagsDoGoogle();
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${ids[0]}`} strategy="afterInteractive" />
      <Script id="tag-google" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());${ids.map((id) => `gtag('config',${JSON.stringify(id)});`).join('')}`}
      </Script>
    </>
  );
}
