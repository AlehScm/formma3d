'use client';

/**
 * Chamada do WhatsApp que acompanha a rolagem na landing de letras. No computador, o selo
 * redondo girando, preso no canto; no celular, uma barra verde presa embaixo, que aparece
 * quando nenhum botao de orcamento da pagina esta na tela (no celular o do topo fica abaixo da
 * primeira tela). Os dois somem quando o botao do fim da pagina chega, para nao duplicar nem
 * cobrir o rodape. Os botoes da pagina se marcam com `data-cta-whatsapp`.
 */
import { useEffect, useState } from 'react';
import { BarraFixa } from '@/components/loja/BarraFixa';
import { FOCO_MARCA } from '@/components/marca';
import { cx } from '@/components/ui/cx';
import { linkWhatsapp, MENSAGENS } from '@/lib/marketplace/contato';
import { IconeWhatsapp } from './IconeWhatsapp';

const LINK = linkWhatsapp(MENSAGENS.letraCaixa());
const TEXTO_SELO = ' orçamento pelo WhatsApp • resposta com preço e prazo • ';
const GIRO = '@keyframes letra3d-giro { to { transform: rotate(360deg); } }';

export function ChamadaWhatsApp() {
  const [barra, setBarra] = useState(false);
  const [noFim, setNoFim] = useState(false);

  useEffect(() => {
    const ctas = [...document.querySelectorAll('[data-cta-whatsapp]')];
    if (!ctas.length) return;
    const final = ctas[ctas.length - 1]!;
    const estado = new Map<Element, IntersectionObserverEntry>();
    const io = new IntersectionObserver((entradas) => {
      for (const e of entradas) estado.set(e.target, e);
      const algumNaTela = [...estado.values()].some((e) => e.isIntersecting);
      const f = estado.get(final);
      const fim = !!f && (f.isIntersecting || f.boundingClientRect.top < 0);
      setNoFim(fim);
      setBarra(!algumNaTela && !fim);
    });
    ctas.forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, []);

  if (!LINK) return null;
  return (
    <>
      <style>{GIRO}</style>
      <a
        href={LINK}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Pedir orçamento pelo WhatsApp"
        tabIndex={noFim ? -1 : undefined}
        className={cx(
          'fixed right-6 bottom-6 z-40 hidden size-28 place-items-center rounded-full bg-marca-whatsapp text-white shadow-[0_12px_30px_-8px_rgb(0_0_0/0.5)] transition-[opacity,transform,background-color] duration-300 hover:bg-marca-whatsapp-forte motion-reduce:transition-none md:grid',
          FOCO_MARCA,
          noFim && 'pointer-events-none scale-90 opacity-0',
        )}
      >
        <svg viewBox="0 0 120 120" className="absolute inset-0 size-full [animation:letra3d-giro_18s_linear_infinite] motion-reduce:[animation:none]" aria-hidden="true">
          <defs>
            <path id="letra3d-selo-whatsapp" d="M14,60 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" />
          </defs>
          <text fill="currentColor" fontSize="9" fontWeight="700">
            <textPath href="#letra3d-selo-whatsapp" textLength="287" lengthAdjust="spacing">{TEXTO_SELO}</textPath>
          </text>
        </svg>
        <IconeWhatsapp className="relative size-10" />
      </a>
      <BarraFixa className={cx('transition-transform duration-300 motion-reduce:transition-none md:hidden', !barra && 'translate-y-[120%]')}>
        <a
          href={LINK}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={barra ? undefined : -1}
          aria-hidden={barra ? undefined : true}
          className={cx('inline-flex min-h-13 w-full items-center justify-center gap-2.5 rounded-marca-pilula bg-marca-whatsapp px-5 text-base font-extrabold text-white no-underline', FOCO_MARCA)}
        >
          <IconeWhatsapp className="size-6" />
          Pedir orçamento pelo WhatsApp
        </a>
      </BarraFixa>
    </>
  );
}
