import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Bricolage_Grotesque, Inter, JetBrains_Mono, Jost } from 'next/font/google';
import './globals.css';
import { ProvedorDicas } from '@/components/ui';

// next/font faz self-hosting no build: nenhuma requisicao externa em runtime, entao
// o app continua abrindo sem internet -- mesma razao pela qual o HDRI de CDN saiu do 3D.
const inter = Inter({
  subsets: ['latin'],
  variable: '--fonte-ui',
  display: 'swap',
});

// Medidas e preco em mono com algarismos de largura fixa, para a coluna nao
// dancar enquanto o slider anda.
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--fonte-mono',
  display: 'swap',
});

// Fonte da marca (loja e catalogo): uma familia so, com tamanho otico (opsz) e largura
// (wdth) variaveis -- display apertado e corpo legivel saem da mesma fonte.
const marca = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--fonte-marca',
  axes: ['opsz', 'wdth'],
  display: 'swap',
});

// Geometrica fina para os titulos da secao Casa (caixa alta, bem espacada).
const fina = Jost({
  subsets: ['latin'],
  variable: '--fonte-fina',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Scarprint | Formma3D',
  description: 'Catálogo de moldes Scarprint com editor 3D de letreiros e composição 2D de placas.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${mono.variable} ${marca.variable} ${fina.variable}`}>
      <body className="antialiased">
        <ProvedorDicas>{children}</ProvedorDicas>
      </body>
    </html>
  );
}
