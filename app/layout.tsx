import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Inter, JetBrains_Mono, Manrope } from 'next/font/google';
import './globals.css';
import { ProvedorDicas } from '@/components/ui';
import { DESCRICAO_SITE, IMAGEM_SOCIAL, NOME, SITE_URL } from '@/lib/seo';

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

const marca = Manrope({
  subsets: ['latin'],
  variable: '--fonte-marca',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${NOME} | Peças impressas em 3D sob medida`, template: `%s | ${NOME}` },
  description: DESCRICAO_SITE,
  applicationName: NOME,
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: { type: 'website', locale: 'pt_BR', siteName: NOME, images: [IMAGEM_SOCIAL] },
  twitter: { card: 'summary_large_image', images: [IMAGEM_SOCIAL.url] },
};

export const viewport: Viewport = { themeColor: '#2760A2' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${mono.variable} ${marca.variable}`}>
      <body className="antialiased">
        <ProvedorDicas>{children}</ProvedorDicas>
      </body>
    </html>
  );
}
