import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter, JetBrains_Mono } from 'next/font/google';
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

export const metadata: Metadata = {
  title: 'formma3d',
  description: 'Letra caixa e peças para impressão 3D: modela, gera o corte da chapa e calcula o preço.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${mono.variable}`}>
      <body className="antialiased">
        <ProvedorDicas>{children}</ProvedorDicas>
      </body>
    </html>
  );
}
