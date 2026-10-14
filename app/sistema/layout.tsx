import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { naoIndexar } from '@/lib/seo';

// Guia interno do design system: a pagina e cliente, entao o noindex mora aqui.
export const metadata: Metadata = naoIndexar('Design system');

export default function SistemaLayout({ children }: { children: ReactNode }) {
  return children;
}
