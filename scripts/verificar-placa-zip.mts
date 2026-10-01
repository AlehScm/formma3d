import fs from 'fs';
import JSZip from 'jszip';
import { parseFont } from '../lib/text/glyphs';
import { criarPlaca3D } from '../lib/geom/placa';
import { prepararTextoPlaca } from '../lib/geom/placa-texto';
import { gerarZipPlaca3D } from '../lib/export/placa-zip';
import { lerStl, volumeMalha } from '../lib/import/stl';

let total = 0;
let falhas = 0;
function ok(nome: string, condicao: boolean): void {
  total++;
  if (!condicao) falhas++;
  console.log(`${condicao ? '  ok  ' : ' FALHA'}  ${nome}`);
}

function minimoBruto(buf: ArrayBuffer): [number, number, number] {
  const view = new DataView(buf);
  const minimo: [number, number, number] = [Infinity, Infinity, Infinity];
  const triangulos = view.getUint32(80, true);
  for (let i = 0; i < triangulos; i++) {
    const inicio = 84 + i * 50 + 12;
    for (let vertice = 0; vertice < 3; vertice++) {
      for (let eixo = 0; eixo < 3; eixo++) minimo[eixo] = Math.min(minimo[eixo], view.getFloat32(inicio + vertice * 12 + eixo * 4, true));
    }
  }
  return minimo;
}

const bytes = fs.readFileSync('C:/Windows/Fonts/arialbd.ttf');
const fonte = parseFont(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
const placa = criarPlaca3D({ largura: 120, altura: 60, espessura: 4, raio: 8, margem: 5 });
const texto = prepararTextoPlaca(placa, fonte, 'AOB', 24, 1, 3);
const zipBlob = await gerarZipPlaca3D(placa, texto);
const zip = await JSZip.loadAsync(await zipBlob.arrayBuffer());
const nomes = Object.keys(zip.files).filter((nome) => !zip.files[nome]!.dir).sort();
ok('ZIP contem base, mapa e um STL por letra', nomes.length === 5 && nomes.includes('placa-base.stl') && nomes.includes('mapa-montagem.json'));

const mapa = JSON.parse(await zip.file('mapa-montagem.json')!.async('string')) as {
  versao: number;
  unidade: string;
  base: { arquivo: string; largura: number; altura: number; espessura: number };
  letras: Array<{ arquivo: string; caractere: string; posicaoMontagem: { x: number; y: number; z: number } }>;
};
ok('mapa registra unidade, base e tres letras em ordem', mapa.versao === 1 && mapa.unidade === 'mm' && mapa.base.arquivo === 'placa-base.stl' && mapa.letras.map((letra) => letra.caractere).join('') === 'AOB');
ok('mapa preserva as dimensoes da base', mapa.base.largura === 120 && mapa.base.altura === 60 && mapa.base.espessura === 4);

const base = lerStl(await zip.file('placa-base.stl')!.async('arraybuffer'));
ok('base STL reimporta nas dimensoes corretas', Math.abs(base.max[0] - base.min[0] - 120) < 0.01 && Math.abs(base.max[1] - base.min[1] - 60) < 0.01 && Math.abs(base.max[2] - 4) < 0.01);
ok('base STL conserva volume', Math.abs(volumeMalha(base.posicoes) - placa.volume) / placa.volume < 0.001);

for (const [indice, letra] of texto.letras.entries()) {
  const item = mapa.letras[indice]!;
  const arquivo = await zip.file(item.arquivo)!.async('arraybuffer');
  const stl = lerStl(arquivo);
  ok(`letra ${indice + 1} reimporta como malha 3D`, stl.triangulos > 0 && stl.max[2] >= 2.999 && stl.max[2] <= 3.001);
  ok(`letra ${indice + 1} STL tem origem local em zero`, minimoBruto(arquivo).every((valor) => Math.abs(valor) < 0.001));
  ok(`letra ${indice + 1} conserva posicao de montagem no mapa`,
    Math.abs(item.posicaoMontagem.x - letra.boundsMontagem.minX) < 0.001 &&
    Math.abs(item.posicaoMontagem.y - letra.boundsMontagem.minY) < 0.001 &&
    item.posicaoMontagem.z === 4);
}

placa.geometry.dispose();
texto.letras.forEach((letra) => letra.geometry.dispose());
console.log(`\n${total - falhas}/${total} passaram\n`);
process.exit(falhas ? 1 : 0);
