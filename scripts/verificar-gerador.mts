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
import { FICHAS } from '../lib/gerador/receitas/fichas';
import { COBERTURA, markdownCobertura } from '../lib/gerador/cobertura';
import { valoresPadrao, type Receita, type Resultado, type Valores } from '../lib/gerador/tipos';
import { caixaDoItem, posicoesDaPeca, volumeDaPeca } from '../lib/gerador/malha';
import { blob3mfMontado, blob3mfSoltas, xml3mfMontado, zipStl } from '../lib/gerador/exportar';
import { corDe } from '../lib/gerador/malha';
import { contornar, retanguloArredondado } from '../lib/gerador/formas';
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
const arquivo = (id: string) =>
  id === 'noto-emoji' ? 'seguiemj.ttf' : ['lobster', 'pacifico'].includes(id) ? 'segoescb.ttf' : id === 'archivo-black' ? 'ariblk.ttf' : 'arialbd.ttf';
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

console.log('\n== cobertura dos 117 modelos ==');
{
  const auditoria = [...new Set([...fs.readFileSync('docs/mafagrafos-117.md', 'utf8').matchAll(/mafagrafos\.com\/models\/([a-z0-9-]+)\)/g)].map((m) => m[1]!))];
  const slugs = COBERTURA.map((c) => c.slug);
  const faltam = auditoria.filter((x) => !slugs.includes(x)), sobram = slugs.filter((x) => !auditoria.includes(x));
  ok('cobertura tem os 117 da auditoria, cada um uma vez', auditoria.length === 117 && slugs.length === 117 && new Set(slugs).size === 117 && !faltam.length && !sobram.length, [...faltam, ...sobram].join(', '));
  const semReceita = COBERTURA.filter((c) => c.receita && !receitaPorId(c.receita)).map((c) => c.slug);
  ok('toda receita citada existe', !semReceita.length, semReceita.join(', '));
  const prontoSem = COBERTURA.filter((c) => c.status === 'pronto' && (!c.receita || c.onda !== 0)).map((c) => c.slug);
  ok('pronto = tem receita e esta na onda 0', !prontoSem.length, prontoSem.join(', '));
  ok('docs/cobertura-117.md atualizado (npx tsx scripts/cobertura.mts)', fs.readFileSync('docs/cobertura-117.md', 'utf8') === markdownCobertura());
}

console.log('\n== vitrine do catalogo ==');
for (const f of FICHAS) {
  const r = receitaPorId(f.id);
  ok(`${f.id}: tem receita e destaques`, !!r && f.destaques.length >= 2);
  if (!r || !f.exemplo) continue;
  const ids = new Set(r.parametros.map((p) => p.id));
  const estranhos = Object.keys(f.exemplo).filter((k) => !ids.has(k));
  ok(`${f.id}: o exemplo da miniatura so usa campos do gerador`, !estranhos.length, estranhos.join(', '));
  const res = gerar(r, f.exemplo);
  ok(`${f.id}: o exemplo gera sem aviso`, res.itens.length > 0 && !res.avisos.length, res.avisos.join(' | '));
}

console.log('\n== texto em camadas ==');
{
  const r = receitaPorId('palavra-camadas')!;
  const fino = { espBase: 3, espMeio: 1.6, espTopo: 1.6, preencherBase: true };
  const res = gerar(r, { linha1: 'Bolo', largura: 150, ...fino });
  const base = regiaoDe(res, 0, 'Base'), meio = regiaoDe(res, 0, 'Meio'), topo = regiaoDe(res, 0, 'Topo');
  ok('3 cores: Base, Meio, Topo', res.cores.join() === 'Base,Meio,Topo' && res.itens[0]!.pecas.length === 3);
  ok('largura total = a pedida', perto(regionBounds(base).w, 150, 0.05), `${regionBounds(base).w.toFixed(2)} mm`);
  ok('topo dentro do meio, meio dentro da base', area(diffRegion(topo, meio)) < 0.01 && area(diffRegion(meio, base)) < 0.01);
  ok('base sem miolo e numa peca so', base.length === 1 && base[0]!.holes.length === 0);
  ok('meio com o miolo tapado (padrao)', meio.every((p) => p.holes.length === 0));
  const comMiolo = regiaoDe(gerar(r, { linha1: 'Bolo', preencherMiolo: false, ...fino }), 0, 'Meio');
  ok('desligando: o meio guarda o miolo do o', comMiolo.some((p) => p.holes.length > 0));
  const zs = res.itens[0]!.pecas.map((p) => [p.camadas[0]!.z0, p.camadas.at(-1)!.z1]);
  ok('empilhadas sem vao: base 0-3, meio 3-4,6, topo 4,6-6,2', perto(zs[0]![0]!, 0, 1e-9) && perto(zs[1]![0]!, 3, 1e-9) && perto(zs[2]![0]!, 4.6, 1e-9) && perto(zs[2]![1]!, 6.2, 1e-9));

  const duas = gerar(r, { cores: '2' });
  ok('2 cores: Base e Topo', duas.cores.join() === 'Base,Topo' && duas.itens[0]!.pecas.length === 2);

  const linhas = gerar(r, { linha1: 'Feliz', linha2: 'aniversario', largura: 200 });
  const bLinhas = regionBounds(regiaoDe(linhas, 0, 'Topo'));
  const bUma = regionBounds(regiaoDe(gerar(r, { linha1: 'Feliz', largura: 200 }), 0, 'Topo'));
  ok('segunda linha: o texto fica mais alto e cabe na largura', bLinhas.h > bUma.h && perto(regionBounds(regiaoDe(linhas, 0, 'Base')).w, 200, 0.05));

  const enc = gerar(r, { montagem: 'encaixe', profEncaixe: 0.6, folga: 0.2, ...fino });
  const [pb, pm, pt] = enc.itens[0]!.pecas;
  ok('encaixe: base e meio ganham rebaixo em cima', pb!.camadas.length === 2 && pm!.camadas.length === 2 && pt!.camadas.length === 1);
  ok('encaixe: meio afunda 0,6 mm na base', perto(pm!.camadas[0]!.z0, 3 - 0.6, 1e-9));
  const colisao = area(intersectRegion(pb!.camadas[1]!.region, pm!.camadas[0]!.region));
  ok('encaixe: o meio cabe no rebaixo (sem colisao com a base)', colisao < 0.01, `${colisao.toFixed(3)} mm2`);
  const folga = area(intersectRegion(pb!.camadas[1]!.region, contornar(pm!.camadas[0]!.region, 0.19)));
  const alem = area(intersectRegion(pb!.camadas[1]!.region, contornar(pm!.camadas[0]!.region, 0.25)));
  ok('encaixe: folga de 0,2 mm em volta (nem menos, nem mais)', folga < 0.01 && alem > 0.1, `${folga.toFixed(3)} mm2 a menos de 0,19 mm; ${alem.toFixed(2)} mm2 ate 0,25 mm`);
  ok('encaixe raso: sem aviso; fundo demais: avisa e limita', enc.avisos.length === 0 && gerar(r, { montagem: 'encaixe', profEncaixe: 3, ...fino }).avisos.some((a) => a.includes('Encaixe')));
  ok('contorno da base pequeno: avisa que a base partiu', gerar(r, { linha1: 'I I', contornoBase: 1, espacamento: 200 }).avisos.some((a) => a.includes('mais de um pedaço')));
  ok('sem texto: avisa e nao gera', gerar(r, { linha1: '  ' }).itens.length === 0);

  // Opcoes que o gerador de referencia tem: base em retangulo, engrossar o topo, miolo da base.
  const ret = gerar(r, { linha1: 'Bolo', largura: 200, formaBase: 'retangulo', margemLateral: 12, margemVertical: 8, raioBase: 8 });
  const bRet = regionBounds(regiaoDe(ret, 0, 'Base')), bTxt = regionBounds(regiaoDe(ret, 0, 'Topo'));
  ok('base em retangulo: largura pedida, margens de 12 e 8 mm', perto(bRet.w, 200, 0.05) && perto(bRet.h, bTxt.h + 16, 0.05) && regiaoDe(ret, 0, 'Base').length === 1, `${bRet.w.toFixed(1)} x ${bRet.h.toFixed(1)} mm`);
  const grosso = gerar(r, { linha1: 'Bolo', contornoTopo: 0.8 });
  const topoGrosso = regiaoDe(grosso, 0, 'Topo'), topoFino = regiaoDe(gerar(r, { linha1: 'Bolo' }), 0, 'Topo');
  ok('engrossar o texto: topo maior e ainda dentro do meio', area(topoGrosso) > area(topoFino) && area(diffRegion(topoGrosso, regiaoDe(grosso, 0, 'Meio'))) < 0.01);
  ok('topo engrossado alem do meio: avisa', gerar(r, { contornoTopo: 2, contornoMeio: 1.5 }).avisos.some((a) => a.includes('engrossado')));
  const miolo = (pb: boolean) => regiaoDe(gerar(r, { linha1: 'OBO', contornoBase: 1, preencherBase: pb }), 0, 'Base').some((p) => p.holes.length > 0);
  ok('miolo da base: aberto por padrao, tapado quando pedido', miolo(false) && !miolo(true));
}
{
  const s = receitaPorId('social-camadas')!;
  const res = gerar(s, { usuario: '@@loja' });
  ok('@social: um @ so na frente', res.itens[0]!.nome === '@loja');
  const l = receitaPorId('letras-separadas')!;
  const lr = gerar(l, { linha1: 'CASA' });
  ok('letras separadas: um item por letra, cada um com base inteira', lr.itens.length === 4 && lr.itens.every((it) => it.pecas[0]!.camadas[0]!.region.length === 1), lr.itens.map((i) => i.nome).join(', '));
}

console.log('\n== emoji, adornos e cores ==');
{
  const r = receitaPorId('palavra-camadas')!;
  ok('fonte de emoji so quando o texto tem emoji', r.fontes!({ ...valoresPadrao(r), linha1: 'Ana🐾' }).join() === 'noto-emoji' && r.fontes!({ ...valoresPadrao(r), linha1: 'Ana' }).length === 0);
  const sem = gerar(r, { linha1: 'Ana', largura: 150 }), com = gerar(r, { linha1: 'Ana🐾', largura: 150 });
  const nSem = regiaoDe(sem, 0, 'Topo').length, nCom = regiaoDe(com, 0, 'Topo').length;
  ok('emoji que a fonte nao tem vem da fonte de emoji', nCom > nSem, `${nSem} -> ${nCom} contornos`);
  // Mesma linha, altura fixa: o emoji (a direita do H) fica na altura das maiusculas.
  const hp = regiaoDe(gerar(receitaPorId('chaveiro-nome')!, { nomes: 'H🐾', altura: 14 }), 0, 'Topo');
  const bH = regionBounds([hp.reduce((a, b) => (regionBounds([b]).minX < regionBounds([a]).minX ? b : a))]);
  const bEmoji = regionBounds(hp.filter((p) => regionBounds([p]).minX > bH.maxX));
  ok('emoji na altura das maiusculas (0,7 a 1,4 x o H)', bEmoji.h > bH.h * 0.7 && bEmoji.h < bH.h * 1.4, `emoji ${bEmoji.h.toFixed(1)} mm, H ${bH.h.toFixed(1)} mm`);
  ok('seletor de variacao (❤️) nao quebra', gerar(r, { linha1: 'Mãe❤️' }).itens.length === 1);

  const cor = gerar(r, { linha1: 'Mom', largura: 200, adorno: 'coracao', larguraAdorno: 40 });
  const base = regiaoDe(cor, 0, 'Base'), topo = regiaoDe(cor, 0, 'Topo');
  ok('coracao: largura total continua a pedida', perto(regionBounds(base).w, 200, 0.1), `${regionBounds(base).w.toFixed(1)} mm`);
  const caixas = topo.map((p) => regionBounds([p]));
  const ilha = caixas.find((b) => perto(b.w, 40, 0.05));
  const textoCom = caixas.filter((b) => b !== ilha);
  const fimTexto = Math.max(...textoCom.map((b) => b.maxX));
  ok('coracao: 40 mm, 4 mm a direita do texto, tudo numa base so', !!ilha && perto(ilha.minX - fimTexto, 4, 0.05) && base.length === 1, ilha ? `${ilha.w.toFixed(2)} mm, vao ${(ilha.minX - fimTexto).toFixed(2)} mm` : 'sem coracao');
  const esq = regionBounds(regiaoDe(gerar(r, { linha1: 'Mom', adorno: 'estrela', ladoAdorno: 'esquerda' }), 0, 'Topo'));
  ok('estrela a esquerda: gera e a peca fica centrada', esq.w > 0 && Math.abs(esq.minX + esq.maxX) < 1);
  const quadrado: Region = [{ outer: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }], holes: [] }];
  const des = gerar(r, { linha1: 'Mom', adorno: 'desenho', desenho: JSON.stringify({ nome: 'q.svg', regiao: quadrado }), larguraAdorno: 30 });
  const ilhaQuadrada = regiaoDe(des, 0, 'Topo').some((p) => { const b = regionBounds([p]); return perto(b.w, 30, 0.01) && perto(b.h, 30, 0.01); });
  ok('desenho SVG: entra na largura pedida (30 mm)', ilhaQuadrada);
  ok('desenho sem arquivo: avisa', gerar(r, { adorno: 'desenho', desenho: '' }).avisos.some((a) => a.includes('SVG')));

  const pint = gerar(r, { corBase: '#112233', corMeio: '#445566', corTopo: '#778899' });
  ok('cores escolhidas vao para o resultado', pint.hex!.join() === '#112233,#445566,#778899');
  const xml = xml3mfMontado(pint);
  ok('e para o 3MF (materiais com a cor)', xml.includes('displaycolor="#112233FF"') && xml.includes('displaycolor="#778899FF"'));
  ok('2 cores: base e topo', gerar(r, { cores: '2', corBase: '#112233', corTopo: '#778899' }).hex!.join() === '#112233,#778899');
  ok('cor invalida cai na paleta', corDe({ hex: ['xyz'] }, 0) !== 'xyz' && corDe({ hex: ['#ABCDEF'] }, 0) === '#ABCDEF');
  const ch = receitaPorId('chaveiro-nome')!;
  ok('chaveiro: nome com emoji', gerar(ch, { nomes: '♥Lu🐾' }).itens.length === 1 && ch.fontes!({ ...valoresPadrao(ch), nomes: 'Lu🐾' }).includes('noto-emoji'));
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
  const perto3 = area(intersectRegion(contornar(furo, 2.7), regiaoDe(res, 0, 'Topo')));
  ok('argola: furo a um contorno inteiro (2,8 mm) das letras', perto3 < 0.01);
  const muitos = gerar(r, { nomes: 'a,b,c,d,e,f,g,h,i,j,k' });
  ok('mais de 9 nomes: fica com 9 e avisa', muitos.itens.length === 9 && muitos.avisos.some((a) => a.includes('9')));
  const duasLinhas = gerar(r, { nomes: 'Ana+Clara' });
  ok('"+" quebra a linha dentro do nome', regionBounds(regiaoDe(duasLinhas, 0, 'Topo')).h > regionBounds(regiaoDe(gerar(r, { nomes: 'Ana' }), 0, 'Topo')).h * 1.6);
  ok('prefixo entra no nome', regionBounds(regiaoDe(gerar(r, { nomes: 'Ana', prefixo: 'Tia ' }), 0, 'Topo')).w > regionBounds(regiaoDe(gerar(r, { nomes: 'Ana' }), 0, 'Topo')).w);
  const sem = gerar(r, { nomes: 'Ana', argola: 'nenhuma' });
  const larg = (e: number) => regionBounds(regiaoDe(gerar(r, { nomes: 'Banana', espacamento: e, argola: 'nenhuma' }), 0, 'Topo')).w;
  const w100 = larg(100), w150 = larg(150), w80 = larg(80);
  ok('espacamento em %: 150% abre, 80% fecha, mesma altura', w150 > w100 * 1.25 && w80 < w100 * 0.95, `${w80.toFixed(1)} / ${w100.toFixed(1)} / ${w150.toFixed(1)} mm`);
  ok('sem argola: base sem furo', regiaoDe(sem, 0, 'Base').every((p) => p.holes.length === 0));
}
{
  const r = receitaPorId('chaveiro-retangular')!;
  const res = gerar(r, { nomes: 'Aline+Borges', largura: 75, altura: 30, borda: 1.2, contornoNome: 1.2, argola: false });
  const placa = regiaoDe(res, 0, 'Placa'), contorno = regiaoDe(res, 0, 'Contorno'), nome = regiaoDe(res, 0, 'Nome');
  const bp = regionBounds(placa);
  ok('3 cores: Placa, Contorno, Nome', res.cores.join() === 'Placa,Contorno,Nome');
  ok('placa com a largura e a altura pedidas', perto(bp.w, 75, 0.01) && perto(bp.h, 30, 0.01), `${bp.w.toFixed(2)} x ${bp.h.toFixed(2)}`);
  const miolo = contornar(placa, -1.2);
  ok('borda elevada: anel de 1,2 mm em volta, acima da placa', perto(area(res.itens[0]!.pecas[0]!.camadas[1]!.region), area(placa) - area(miolo), 0.5) && res.itens[0]!.pecas[0]!.camadas[1]!.z0 === 3);
  ok('nome e contorno dentro da borda', area(diffRegion(contorno, miolo)) < 0.01 && area(diffRegion(nome, contorno)) < 0.01);
  const zs = res.itens[0]!.pecas.map((p) => [p.camadas[0]!.z0, p.camadas[0]!.z1]);
  ok('empilhado: placa 0-3, contorno 3-3,4, nome 3,4-4,2', perto(zs[1]![0]!, 3, 1e-9) && perto(zs[1]![1]!, 3.4, 1e-9) && perto(zs[2]![1]!, 4.2, 1e-9));
  const larguraUtil = 75 - 2 * 6 - 2 * 1.2;
  ok('a linha mais larga enche a largura util (ou a altura limita)', perto(regionBounds(contorno).w, larguraUtil, 0.1) || perto(regionBounds(contorno).h, 30 - 2 * 6 - 2 * 1.2, 0.1), `${regionBounds(contorno).w.toFixed(1)} x ${regionBounds(contorno).h.toFixed(1)} mm`);
  const comAba = gerar(r, { nomes: 'Ana', argola: true, furo: 2.5, externo: 6 });
  const pa = regiaoDe(comAba, 0, 'Placa');
  const furos = pa.flatMap((p) => p.holes);
  const ret = retanguloArredondado(0, 0, 75, 30, 5);
  const furoFora = furos.length === 1 && area(intersectRegion([{ outer: furos[0]!, holes: [] }], ret)) < 0.05;
  ok('argola em aba: um furo de 2,5 mm, todo fora da placa', furoFora && perto(regionBounds([{ outer: furos[0]!, holes: [] }]).w, 2.5, 0.05) && pa.length === 1);
  const longo = gerar(r, { nomes: 'Maria Eduarda dos Santos Albuquerque Ferreira', largura: 60, altura: 20 });
  ok('nome longo numa placa pequena: avisa que ficou pequeno', longo.itens.length === 1 && longo.avisos.some((a) => a.includes('pequeno')), longo.avisos.join(' | '));
  const minusculo = gerar(r, { nomes: 'Maria Eduarda dos Santos Albuquerque Ferreira da Silva Souza', largura: 25, altura: 20, margemH: 2 });
  ok('letra abaixo de 1 mm: nao gera, explica', minusculo.itens.length === 0 && minusculo.avisos.some((a) => a.includes('pequeno demais')), minusculo.avisos.join(' | '));
  const semEspaco = gerar(r, { nomes: 'Ana', largura: 20, margemH: 30 });
  ok('margem maior que a placa: nao gera, explica', semEspaco.itens.length === 0 && semEspaco.avisos.some((a) => a.includes('margens')));
  ok('sem contorno do nome: 2 cores', gerar(r, { contornoNome: 0 }).cores.join() === 'Placa,Nome');
}

console.log(`\n${total - falhas}/${total} passaram\n`);
process.exit(falhas ? 1 : 0);
