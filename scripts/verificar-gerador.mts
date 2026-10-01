/**
 * Base de geradores e receitas do catalogo.
 *   npx tsx scripts/verificar-gerador.mts
 *
 * Toda receita: esquema coerente, pecas fechadas, volume analitico = volume da malha,
 * 3MF montado e de pecas soltas reimportaveis. Depois, o que cada familia promete.
 */
import fs from 'fs';
import type { Font } from 'opentype.js';
import { parseFont } from '../lib/text/glyphs';
import { diffRegion, intersectRegion, regionArea, regionBounds, type Region } from '../lib/geom/region';
import { malhaFechada } from '../lib/mesh/relevo';
import { lerTresMf } from '../lib/import/tresmf';
import { RECEITAS, receitaPorId } from '../lib/gerador/receitas';
import { valoresPadrao, type Receita, type Resultado, type Valores } from '../lib/gerador/tipos';
import { caixaDoItem, posicoesDaPeca, volumeDaPeca } from '../lib/gerador/malha';
import { blob3mfMontado, blob3mfSoltas, zipStl } from '../lib/gerador/exportar';
import { contornar } from '../lib/gerador/formas';
import JSZip from 'jszip';

let falhas = 0;
let total = 0;
const ok = (nome: string, cond: boolean, detalhe = '') => {
  total++;
  if (!cond) falhas++;
  console.log(`${cond ? '  ok  ' : ' FALHA'}  ${nome}${detalhe ? '  -> ' + detalhe : ''}`);
};
const perto = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

// Fontes do sistema no lugar das web (o teste nao baixa nada): script -> Segoe Script.
const arquivo = (id: string) => (['lobster', 'pacifico'].includes(id) ? 'segoescb.ttf' : id === 'archivo-black' ? 'ariblk.ttf' : 'arialbd.ttf');
const fontes = new Map<string, Font>();
const ctx = {
  fonte: (id: string) => {
    const f = arquivo(id);
    if (!fontes.has(f)) {
      const b = fs.readFileSync('C:/Windows/Fonts/' + f);
      fontes.set(f, parseFont(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer));
    }
    return fontes.get(f)!;
  },
};
const gerar = (r: Receita, mudar: Valores = {}) => r.gerar({ ...valoresPadrao(r), ...mudar }, ctx);
const volumeSopa = (s: Float32Array) => {
  let V = 0;
  for (let i = 0; i < s.length; i += 9) V += (s[i]! * (s[i + 4]! * s[i + 8]! - s[i + 5]! * s[i + 7]!) - s[i + 1]! * (s[i + 3]! * s[i + 8]! - s[i + 5]! * s[i + 6]!) + s[i + 2]! * (s[i + 3]! * s[i + 7]! - s[i + 4]! * s[i + 6]!)) / 6;
  return V;
};
const area = (r: Region) => regionArea(r);
const regiaoDe = (res: Resultado, item: number, peca: string, camada = 0) => res.itens[item]!.pecas.find((p) => p.nome === peca)!.camadas[camada]!.region;

console.log('\n== toda receita ==');
ok('ids unicos', new Set(RECEITAS.map((r) => r.id)).size === RECEITAS.length);
for (const r of RECEITAS) {
  const esquemaOk = r.parametros.every((p) =>
    p.tipo === 'numero' ? p.min <= p.padrao && p.padrao <= p.max : p.tipo === 'escolha' ? p.opcoes.some((o) => o.valor === p.padrao) : true
  ) && new Set(r.parametros.map((p) => p.id)).size === r.parametros.length;
  ok(`${r.id}: esquema (padroes dentro das faixas, ids unicos)`, esquemaOk);
  const res = gerar(r);
  const pecas = res.itens.flatMap((it) => it.pecas);
  ok(`${r.id}: gera com os padroes`, res.itens.length > 0 && pecas.length > 0 && pecas.every((p) => p.cor >= 0 && p.cor < res.cores.length), `${res.itens.length} itens, ${pecas.length} pecas ${res.avisos.join(' | ')}`);
  let fechadas = true, volumeOk = true;
  for (const p of pecas) {
    for (const c of p.camadas) if (!malhaFechada(posicoesDaPeca({ ...p, camadas: [c] }))) fechadas = false;
    if (!perto(volumeSopa(posicoesDaPeca(p)), volumeDaPeca(p), volumeDaPeca(p) * 0.005)) volumeOk = false;
  }
  ok(`${r.id}: cada camada e uma malha fechada`, fechadas);
  ok(`${r.id}: volume analitico = volume da malha`, volumeOk);

  const montado = await lerTresMf(await (await blob3mfMontado(res)).arrayBuffer(), r.id);
  const volMontado = montado.reduce((s, o) => s + volumeSopa(o.malha.posicoes), 0);
  const volPecas = pecas.reduce((s, p) => s + volumeDaPeca(p), 0);
  ok(`${r.id}: 3MF montado reabre com um objeto por item e o mesmo volume`, montado.length === res.itens.length && perto(volMontado, volPecas, volPecas * 0.005), `${montado.length} objetos, ${volMontado.toFixed(1)} de ${volPecas.toFixed(1)} mm3`);
  const soltas = await lerTresMf(await (await blob3mfSoltas(res)).arrayBuffer(), r.id);
  ok(`${r.id}: 3MF de pecas soltas reabre com uma peca por objeto`, soltas.length === pecas.length);
  const zip = await JSZip.loadAsync(await (await zipStl(res)).arrayBuffer());
  ok(`${r.id}: ZIP com um STL por peca`, Object.keys(zip.files).filter((f) => f.endsWith('.stl')).length === pecas.length);
}

console.log('\n== texto em camadas ==');
{
  const r = receitaPorId('palavra-camadas')!;
  const res = gerar(r, { linha1: 'Bolo', largura: 150 });
  const base = regiaoDe(res, 0, 'Base'), meio = regiaoDe(res, 0, 'Meio'), topo = regiaoDe(res, 0, 'Topo');
  ok('3 cores: Base, Meio, Topo', res.cores.join() === 'Base,Meio,Topo' && res.itens[0]!.pecas.length === 3);
  ok('largura total = a pedida', perto(regionBounds(base).w, 150, 0.05), `${regionBounds(base).w.toFixed(2)} mm`);
  ok('topo dentro do meio, meio dentro da base', area(diffRegion(topo, meio)) < 0.01 && area(diffRegion(meio, base)) < 0.01);
  ok('base sem miolo e numa peca so', base.length === 1 && base[0]!.holes.length === 0);
  ok('meio com o miolo tapado (padrao)', meio.every((p) => p.holes.length === 0));
  const comMiolo = regiaoDe(gerar(r, { linha1: 'Bolo', preencherMiolo: false }), 0, 'Meio');
  ok('desligando: o meio guarda o miolo do o', comMiolo.some((p) => p.holes.length > 0));
  const zs = res.itens[0]!.pecas.map((p) => [p.camadas[0]!.z0, p.camadas.at(-1)!.z1]);
  ok('empilhadas sem vao: base 0-3, meio 3-4,6, topo 4,6-6,2', perto(zs[0]![0]!, 0, 1e-9) && perto(zs[1]![0]!, 3, 1e-9) && perto(zs[2]![0]!, 4.6, 1e-9) && perto(zs[2]![1]!, 6.2, 1e-9));

  const duas = gerar(r, { cores: '2' });
  ok('2 cores: Base e Topo', duas.cores.join() === 'Base,Topo' && duas.itens[0]!.pecas.length === 2);

  const linhas = gerar(r, { linha1: 'Feliz', linha2: 'aniversario', largura: 200 });
  const bLinhas = regionBounds(regiaoDe(linhas, 0, 'Topo'));
  const bUma = regionBounds(regiaoDe(gerar(r, { linha1: 'Feliz', largura: 200 }), 0, 'Topo'));
  ok('segunda linha: o texto fica mais alto e cabe na largura', bLinhas.h > bUma.h && perto(regionBounds(regiaoDe(linhas, 0, 'Base')).w, 200, 0.05));

  const enc = gerar(r, { montagem: 'encaixe', profEncaixe: 0.6, folga: 0.2 });
  const [pb, pm, pt] = enc.itens[0]!.pecas;
  ok('encaixe: base e meio ganham rebaixo em cima', pb!.camadas.length === 2 && pm!.camadas.length === 2 && pt!.camadas.length === 1);
  ok('encaixe: meio afunda 0,6 mm na base', perto(pm!.camadas[0]!.z0, 3 - 0.6, 1e-9));
  const colisao = area(intersectRegion(pb!.camadas[1]!.region, pm!.camadas[0]!.region));
  ok('encaixe: o meio cabe no rebaixo (sem colisao com a base)', colisao < 0.01, `${colisao.toFixed(3)} mm2`);
  const folga = area(intersectRegion(pb!.camadas[1]!.region, contornar(pm!.camadas[0]!.region, 0.19)));
  const alem = area(intersectRegion(pb!.camadas[1]!.region, contornar(pm!.camadas[0]!.region, 0.25)));
  ok('encaixe: folga de 0,2 mm em volta (nem menos, nem mais)', folga < 0.01 && alem > 0.1, `${folga.toFixed(3)} mm2 a menos de 0,19 mm; ${alem.toFixed(2)} mm2 ate 0,25 mm`);
  ok('encaixe raso: sem aviso; fundo demais: avisa e limita', enc.avisos.length === 0 && gerar(r, { montagem: 'encaixe', profEncaixe: 3 }).avisos.some((a) => a.includes('Encaixe')));
  ok('contorno da base pequeno: avisa que a base partiu', gerar(r, { linha1: 'I I', contornoBase: 1, tracking: 10 }).avisos.some((a) => a.includes('mais de um pedaço')));
  ok('sem texto: avisa e nao gera', gerar(r, { linha1: '  ' }).itens.length === 0);
}
{
  const s = receitaPorId('social-camadas')!;
  const res = gerar(s, { usuario: '@@loja' });
  ok('@social: um @ so na frente', res.itens[0]!.nome === '@loja');
  const l = receitaPorId('letras-separadas')!;
  const lr = gerar(l, { linha1: 'CASA' });
  ok('letras separadas: um item por letra, cada um com base inteira', lr.itens.length === 4 && lr.itens.every((it) => it.pecas[0]!.camadas[0]!.region.length === 1), lr.itens.map((i) => i.nome).join(', '));
}

console.log('\n== chaveiros ==');
{
  const r = receitaPorId('chaveiro-nome')!;
  const res = gerar(r, { nomes: 'Ana, Pedro, Lu', furo: 4 });
  ok('lote: um item por nome', res.itens.length === 3, res.itens.map((i) => i.nome).join(', '));
  const caixas = res.itens.map(caixaDoItem);
  const sobrepoe = caixas.some((a, i) => caixas.some((b, j) => i < j && a.minX < b.maxX && b.minX < a.maxX && a.minY < b.maxY && b.minY < a.maxY));
  ok('lote: nenhum chaveiro sobre outro', !sobrepoe);
  const base = regiaoDe(res, 0, 'Base');
  const furos = base.flatMap((p) => p.holes);
  const bf = furos.length ? regionBounds([{ outer: furos[0]!, holes: [] }]) : null;
  ok('argola: base com um furo de 4 mm', base.length === 1 && furos.length === 1 && perto(bf!.w, 4, 0.05), bf ? `${bf.w.toFixed(2)} mm` : 'sem furo');
  const furo: Region = [{ outer: furos[0]!, holes: [] }];
  const perto3 = area(intersectRegion(contornar(furo, 2.9), regiaoDe(res, 0, 'Topo')));
  ok('argola: furo a um contorno inteiro (3 mm) das letras', perto3 < 0.01);
  const muitos = gerar(r, { nomes: 'a,b,c,d,e,f,g,h,i,j,k' });
  ok('mais de 9 nomes: fica com 9 e avisa', muitos.itens.length === 9 && muitos.avisos.some((a) => a.includes('9')));
  const duasLinhas = gerar(r, { nomes: 'Ana+Clara' });
  ok('"+" quebra a linha dentro do nome', regionBounds(regiaoDe(duasLinhas, 0, 'Topo')).h > regionBounds(regiaoDe(gerar(r, { nomes: 'Ana' }), 0, 'Topo')).h * 1.6);
  ok('prefixo entra no nome', regionBounds(regiaoDe(gerar(r, { nomes: 'Ana', prefixo: 'Tia ' }), 0, 'Topo')).w > regionBounds(regiaoDe(gerar(r, { nomes: 'Ana' }), 0, 'Topo')).w);
  const sem = gerar(r, { nomes: 'Ana', argola: 'nenhuma' });
  ok('sem argola: base sem furo', regiaoDe(sem, 0, 'Base').every((p) => p.holes.length === 0));
}
{
  const r = receitaPorId('chaveiro-retangular')!;
  const res = gerar(r, { nomes: 'Maria Eduarda Silva', largura: 75 });
  const placa = regiaoDe(res, 0, 'Placa'), nome = regiaoDe(res, 0, 'Nome');
  ok('placa com a largura pedida e um furo', perto(regionBounds(placa).w, 75, 0.01) && placa[0]!.holes.length === 1);
  ok('nome inteiro dentro da placa e fora do furo', area(diffRegion(nome, placa)) < 0.01);
  const curto = regionBounds(regiaoDe(gerar(r, { nomes: 'Lu' }), 0, 'Nome'));
  ok('nome curto nao passa da altura maxima (10 mm)', curto.h <= 10 * 1.4, `${curto.h.toFixed(1)} mm`);
  const longo = gerar(r, { nomes: 'Maria Eduarda dos Santos Albuquerque Ferreira', largura: 40 });
  ok('nome longo numa placa estreita: avisa que ficou pequeno', longo.avisos.some((a) => a.includes('pequeno')));
}

console.log(`\n${total - falhas}/${total} passaram\n`);
process.exit(falhas ? 1 : 0);
