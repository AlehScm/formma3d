'use client';

/**
 * Barra presa embaixo da tela com a acao principal da pagina (adicionar, pedir). Aparece so
 * enquanto o botao principal ainda esta abaixo da tela; depois que a pessoa passa por ele,
 * some, para nao cobrir o rodape.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cx } from '@/components/ui/cx';

export function useAbaixoDaTela<T extends Element>() {
  const ref = useRef<T>(null);
  const [abaixo, setAbaixo] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setAbaixo(!!e && !e.isIntersecting && e.boundingClientRect.top > 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, abaixo] as const;
}

export function BarraFixa({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('fixed inset-x-0 bottom-0 z-30 border-t border-marca-linha bg-marca-branco/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-marca-2 backdrop-blur', className)}>
      <div className="mx-auto flex max-w-[1600px] items-center gap-4">{children}</div>
    </div>
  );
}
