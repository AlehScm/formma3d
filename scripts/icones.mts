// Gera favicon, apple-icon e icones do manifest a partir do simbolo da marca. Rodar a mao: npx tsx scripts/icones.mts
import fs from 'node:fs';
import sharp from 'sharp';

const simbolo = fs.readFileSync('public/marca/scarprint-simbolo.svg');

/** Quadrado branco com o simbolo centralizado e ~12% de respiro (o Google exige favicon quadrado). */
async function quadrado(lado: number): Promise<Buffer> {
  const miolo = Math.round(lado * 0.76);
  const arte = await sharp(simbolo, { density: Math.ceil((72 * miolo * 4) / 146) }).resize(miolo, miolo, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toBuffer();
  return sharp({ create: { width: lado, height: lado, channels: 4, background: '#ffffff' } }).composite([{ input: arte, gravity: 'center' }]).png().toBuffer();
}

/** Container ICO com entradas PNG: cabecalho de 6 bytes, 16 por imagem, depois os PNGs. */
function montarIco(imagens: { lado: number; png: Buffer }[]): Buffer {
  const cab = Buffer.alloc(6);
  cab.writeUInt16LE(1, 2);
  cab.writeUInt16LE(imagens.length, 4);
  let deslocamento = 6 + 16 * imagens.length;
  const dir = imagens.map(({ lado, png }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(lado, 0);
    e.writeUInt8(lado, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(deslocamento, 12);
    deslocamento += png.length;
    return e;
  });
  return Buffer.concat([cab, ...dir, ...imagens.map((i) => i.png)]);
}

const ico = montarIco(await Promise.all([16, 32, 48].map(async (lado) => ({ lado, png: await quadrado(lado) }))));
fs.writeFileSync('app/favicon.ico', ico);
fs.writeFileSync('app/apple-icon.png', await quadrado(180));
fs.writeFileSync('public/icone-192.png', await quadrado(192));
fs.writeFileSync('public/icone-512.png', await quadrado(512));
console.log('icones gerados');
