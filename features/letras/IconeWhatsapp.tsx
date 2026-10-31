/** Balao com telefone (o que o olho reconhece como WhatsApp), na cor do texto. */
export function IconeWhatsapp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9.2 7.6c.4-.5 1-.5 1.3 0l.9 1.5c.2.4.2.9-.2 1.2l-.6.5c.6 1.2 1.5 2.1 2.7 2.7l.5-.6c.3-.4.8-.4 1.2-.2l1.5.9c.5.3.5.9 0 1.3-.9.8-2.2 1-3.4.4-1.8-.9-3.2-2.3-4.1-4.1-.6-1.2-.4-2.5.2-3.6Z" fill="currentColor" />
    </svg>
  );
}
