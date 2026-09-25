import type { ReactNode } from 'react';

/** Tecla de atalho. */
export function Tecla({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-sm border border-borda-forte bg-superficie-2 px-1 font-mono text-micro leading-none text-texto-2">
      {children}
    </kbd>
  );
}
