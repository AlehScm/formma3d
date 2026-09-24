/**
 * Regressao das combinacoes de peca.
 *   npx tsx scripts/verificar-pecas.mts
 *
 * A tabela REFERENCIA foi medida com os 5 modos fechados que existiam antes de as
 * escolhas virarem soltas. Cada preset tem que reproduzir exatamente aquilo: se um
 * volume ou uma faixa de Z mudar, o redesign quebrou geometria que ja funcionava.
 */
import fs from 'fs';
import { parseFont, textToLetters } from '../lib/text/glyphs';
import { buildPart, PRESETS, type Params, type PresetId } from '../lib/geom/modes';
import { partToGeometry } from '../lib/geom/extrude';
import { geometryToSTL } from '../lib/export/stl';
import { minThickness, regionBounds } from '../lib/geom/region';

let falhas = 0;
let total = 0;
const ok = (nome: string, cond: boolean, detalhe = '') => {
  total++;
  if (!cond) falhas++;
  console.log(`${cond ? '  ok  ' : ' FALHA'}  ${nome}${detalhe ? '  -> ' + detalhe : ''}`);
};

/** Volume pela malha: so bate com o analitico se a peca for um solido fechado. */
function volumeDaMalha(buf: ArrayBuffer): number {
  const dv = new DataView(buf);
  const tris = dv.getUint32(80, true);
  let vol = 0;
  let off = 84;
  for (let t = 0; t < tris; t++) {
    off += 12;
    const p: number[][] = [];
    for (let v = 0; v < 3; v++) {
      p.push([dv.getFloat32(off, true), dv.getFloat32(off + 4, true), dv.getFloat32(off + 8, true)]);
      off += 12;
    }
    const [a, c, d] = p as [number[], number[], number[]];
    vol += (a[0]! * (c[1]! * d[2]! - c[2]! * d[1]!) - a[1]! * (c[0]! * d[2]! - c[2]! * d[0]!) + a[2]! * (c[0]! * d[1]! - c[1]! * d[0]!)) / 6;
    off += 2;
  }
  return Math.abs(vol);
}

const b = fs.readFileSync('C:/Windows/Fonts/arialbd.ttf');
const font = parseFont(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
const O = textToLetters(font, 'O', { altura: 150 })[0]!;
const espO = minThickness(O.region);

const camadasDe = (p: ReturnType<typeof buildPart>) =>
  p.layers.map((l) => `${l.role}[${l.z0.toFixed(1)}-${l.z1.toFixed(1)}]`).join(' ');

/**
 * Medido com os modos antigos, letra "O" de 150mm, profundidade 40, parede 2.4,
 * traseira 2, face 2, chapa ACM 3, face translucida 2, batente 2.5, furo 6.
 */
const REFERENCIA: Record<PresetId, { cm3: number; camadas: string; extra?: 'cut' | 'stl' }> = {
  macica: { cm3: 454.9, camadas: 'corpo[0.0-40.0]' },
  oca: { cm3: 94.0, camadas: 'face[0.0-2.0] parede[2.0-40.0]' },
  moldura_acm: { cm3: 162.4, camadas: 'traseira[0.0-2.0] corpo[2.0-37.0] bolsao[37.0-40.0]', extra: 'cut' },
  frontlit: { cm3: 164.3, camadas: 'traseira[0.0-2.0] corpo[2.0-38.0] bolsao[38.0-40.0]', extra: 'stl' },
  backlit: {
    cm3: 95.3,
    camadas: 'face[0.0-2.0] parede[2.0-40.0] espacador[40.0-55.0] espacador[40.0-55.0] espacador[40.0-55.0]',
  },
};

console.log('\n== os presets reproduzem os modos antigos ==');
for (const id of Object.keys(REFERENCIA) as PresetId[]) {
  const ref = REFERENCIA[id];
  const part = buildPart(O.region, PRESETS[id].params, espO);
  const cm3 = part.volume / 1000;
  const cam = camadasDe(part);
  const extra = part.extras[0]?.kind;

  ok(`${id.padEnd(12)} volume`, Math.abs(cm3 - ref.cm3) < 0.15, `${cm3.toFixed(1)} vs ${ref.cm3} cm3`);
  ok(`${id.padEnd(12)} camadas`, cam === ref.camadas, cam === ref.camadas ? '' : `\n         obtido:   ${cam}\n         esperado: ${ref.camadas}`);
  if (ref.extra) ok(`${id.padEnd(12)} extra ${ref.extra}`, extra === ref.extra, `${extra ?? 'nenhum'}`);
}

console.log('\n== toda combinacao gera solido fechado ==');
{
  const fechamentos = ['aberta', 'impressa', 'chapa'] as const;
  const apoios = ['dentro', 'fora', 'dois'] as const;
  let testadas = 0;
  let piorErro = 0;
  let pior = '';
  const vazias: string[] = [];

  for (const frente of fechamentos) {
    for (const traseira of fechamentos) {
      for (const apoio of apoios) {
        // O apoio so muda alguma coisa quando ha chapa em algum lado.
        if (frente !== 'chapa' && traseira !== 'chapa' && apoio !== 'dentro') continue;
        const p: Partial<Params> = { macica: false, frente, traseira, apoio, profundidade: 40, parede: 2.4 };
        const part = buildPart(O.region, p, espO);
        const nome = `${frente}/${traseira}/${apoio}`;
        if (!part.layers.length) { vazias.push(nome); continue; }
        const geo = partToGeometry(part);
        if (!geo) { vazias.push(nome); continue; }
        const erro = (Math.abs(volumeDaMalha(geometryToSTL(geo, 'O')) - part.volume) / part.volume) * 100;
        if (erro > piorErro) { piorErro = erro; pior = nome; }
        testadas++;
      }
    }
  }
  ok(`${testadas} combinacoes com malha fechada`, piorErro < 0.001, `pior erro ${piorErro.toFixed(5)}% em ${pior}`);
  ok('nenhuma combinacao saiu vazia', vazias.length === 0, vazias.length ? vazias.join(', ') : '');
}

console.log('\n== nada fica em voladico: z=0 e sempre face fechada ou solido ==');
{
  const casos: [string, Partial<Params>][] = [
    ['frente chapa / fundo impresso', { frente: 'chapa', traseira: 'impressa' }],
    ['frente impressa / fundo aberto', { frente: 'impressa', traseira: 'aberta' }],
    ['frente aberta / fundo impresso', { frente: 'aberta', traseira: 'impressa' }],
    ['chapa dos dois lados', { frente: 'chapa', traseira: 'chapa' }],
    ['aberta dos dois lados', { frente: 'aberta', traseira: 'aberta' }],
    ['com borda para fora', { frente: 'chapa', traseira: 'impressa', apoio: 'fora', borda: 3 }],
  ];
  for (const [nome, p] of casos) {
    const part = buildPart(O.region, { ...p, macica: false, profundidade: 40 }, espO);
    const naMesa = part.layers.filter((l) => l.z0 < 0.001);
    const areaBase = naMesa.reduce((a, l) => a + regionBounds(l.region).w, 0);
    ok(`${nome.padEnd(30)} tem base`, naMesa.length > 0 && areaBase > 0,
       naMesa.map((l) => l.role).join('+') || '*** NADA EM Z=0 ***');
  }
}

console.log('\n== combinacoes impossiveis degradam com aviso ==');
{
  const macChapa = buildPart(O.region, { macica: true, frente: 'chapa' }, espO);
  ok('macica + chapa avisa', macChapa.avisos.some((a) => /macic|chapa/i.test(a)),
     macChapa.avisos[0] ?? 'SEM AVISO');

  const rasa = buildPart(O.region, { macica: false, frente: 'chapa', traseira: 'impressa', profundidade: 3 }, espO);
  ok('profundidade insuficiente avisa', rasa.avisos.length > 0, rasa.avisos[0] ?? 'SEM AVISO');
}

console.log(`\n${total - falhas}/${total} passaram\n`);
process.exit(falhas ? 1 : 0);
