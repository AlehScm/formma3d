/**
 * Gera as imagens fixas de SEO em public/og/: a do compartilhamento (1200x630, usada no
 * Open Graph/Twitter de toda pagina sem foto propria) e o logo quadrado do JSON-LD.
 * Rodar de novo so quando a marca ou a frase mudar; os PNGs ficam no repositorio.
 *   npx tsx scripts/gerar-imagem-social.mts
 */
import fs from 'fs';
import opentype from 'opentype.js';
import { createElement as h, type CSSProperties, type ReactNode } from 'react';
import { ImageResponse } from 'next/og';

const dataUri = (svg: string | Buffer) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
const marca = (arquivo: string) => dataUri(fs.readFileSync(`public/marca/${arquivo}`));

// Texto vira contorno com opentype, glifo a glifo. Plus Jakarta (a mais proxima da Manrope
// entre as fontes locais) tem virgula e ponto com muito respiro a esquerda: aproximados.
const arq = fs.readFileSync('public/fontes/plus-jakarta-800.ttf');
const fonte = opentype.parse(arq.buffer.slice(arq.byteOffset, arq.byteOffset + arq.byteLength));
function texto(conteudo: string, tamanho: number, cor: string) {
  const escala = tamanho / fonte.unitsPerEm;
  const base = fonte.ascender * escala;
  const glifos = fonte.stringToGlyphs(conteudo);
  let x = 0;
  const partes = glifos.map((g, i) => {
    if (i > 0) x += fonte.getKerningValue(glifos[i - 1]!, g) * escala;
    if (g.unicode === 44 || g.unicode === 46) x -= 0.07 * tamanho;
    const d = g.getPath(x, base, tamanho).toPathData(2);
    x += g.advanceWidth! * escala;
    return d;
  });
  const largura = Math.ceil(x);
  const altura = Math.ceil((fonte.ascender - fonte.descender) * escala);
  return h('img', { src: dataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}"><path d="${partes.join('')}" fill="${cor}"/></svg>`), width: largura, height: altura });
}

const caixa = (style: CSSProperties, ...filhos: ReactNode[]) => h('div', { style: { display: 'flex', ...style } }, ...filhos);

async function salvar(resposta: ImageResponse, destino: string) {
  fs.writeFileSync(destino, Buffer.from(await resposta.arrayBuffer()));
  console.log(`${destino}: ${Math.round(fs.statSync(destino).size / 1024)} KB`);
}

fs.mkdirSync('public/og', { recursive: true });

await salvar(new ImageResponse(
  caixa({ width: '100%', height: '100%', flexDirection: 'column', justifyContent: 'space-between', background: '#F7F8FA', padding: '64px 80px 0' },
    h('img', { src: marca('scarprint-completo.svg'), width: 320, height: 160 }),
    caixa({ flexDirection: 'column', gap: 6 },
      texto('Peças impressas em 3D', 68, '#18212E'),
      texto('sob medida', 68, '#18212E'),
      caixa({ marginTop: 16 }, texto('Decoração, presentes com nome, letreiros e placas para empresas.', 30, '#5E6061')),
    ),
    caixa({ flexDirection: 'column', gap: 40 },
      texto('Personalize, veja em 3D e peça orçamento.', 28, '#2760A2'),
      caixa({ height: 14, margin: '0 -80px', background: '#2760A2' }),
    ),
  ),
  { width: 1200, height: 630 },
), 'public/og/scarprint.png');

await salvar(new ImageResponse(
  caixa({ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF' },
    h('img', { src: marca('scarprint-simbolo.svg'), width: 330, height: 384 }),
  ),
  { width: 512, height: 512 },
), 'public/og/scarprint-logo.png');
