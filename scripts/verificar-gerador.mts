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
import { diffRegion, intersectRegion, pointInContour, regionArea, regionBounds, scaleRegion, type Region } from '../lib/geom/region';
import { malhaFechada } from '../lib/mesh/relevo';
import { lerTresMf } from '../lib/import/tresmf';
import { RECEITAS, receitaPorId } from '../lib/gerador/receitas';
import { FICHAS } from '../lib/gerador/receitas/fichas';
import { COBERTURA, markdownCobertura } from '../lib/gerador/cobertura';
import { valoresPadrao, type Peca, type Receita, type Resultado, type Valores } from '../lib/gerador/tipos';
import { caixaDoItem, posicoesDaPeca, volumeDaPeca } from '../lib/gerador/malha';
import { fatiasDaPlanta, limitesDaPeca } from '../lib/gerador/planta';
import { blob3mfMontado, blob3mfSoltas, xml3mfMontado, zipStl } from '../lib/gerador/exportar';
import { corDe } from '../lib/gerador/malha';
import { circulo, contornar, retanguloArredondado, textoEmArco, unir } from '../lib/gerador/formas';
import JSZip from 'jszip';
import { payloadWifi, payloadWhatsapp } from '../lib/gerador/payloads';
import { crc16Ccitt } from '../lib/gerador/pix';
import jsQR from 'jsqr';
import { gerarPixEstatico } from '../lib/gerador/pix';
import { payloadUrl } from '../lib/gerador/payloads';
import { cartaoTecido, cartaoVisita, listaQrVertical, listaQrHorizontal, listaQrCamadas, placaGoogleReview, placaPixLogo, placaPixTexto, placaQrLogo, placaQrSocial, socialComQr, urlDoPerfil } from '../lib/gerador/receitas/qrplacas';
import QRCode from 'qrcode';
import { poteRosqueado } from '../lib/gerador/receitas/potes';
import { cilindroComRelevo } from '../lib/gerador/cilindro';
import { pixelsParaCores, pixelsParaRegiao } from '../lib/import/imagem';
import { pecasDeQuebraCabeca } from '../lib/gerador/receitas/imagens';
import { espelharX, textura } from '../lib/gerador/figuras';

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
const gerar = (r: Receita, mudar: Valores = {}) => {
  const exemploFicha = ['placa-qr-wifi', 'placa-pix-simples', 'placa-pix-logo', 'placa-pix-texto'].includes(r.id) ? FICHAS.find((f) => f.id === r.id)?.exemplo : undefined;
  return r.gerar({ ...valoresPadrao(r), ...exemploFicha, ...mudar }, ctx);
};
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
  const avisos = res.avisos.filter((a) => !a.startsWith('Usando um desenho de exemplo'));
  ok(`${f.id}: o exemplo gera sem aviso (fora o de desenho de exemplo)`, res.itens.length > 0 && !avisos.length, avisos.join(' | '));
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
  ok('desenho sem arquivo: avisa', gerar(r, { adorno: 'desenho', desenho: '' }).avisos.some((a) => a.includes('imagem')));

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

console.log('\n== onda 1: medidas de cada familia ==');
{
  const camada = (res: Resultado, item: number, peca: string, i = 0) => res.itens[item]!.pecas.find((p) => p.nome === peca)!.camadas[i]!;
  // Plaquinha pet: verso embutido e espelhado, nome dentro da borda, furo, NFC.
  const pet = receitaPorId('plaquinha-pet')!;
  const rp = gerar(pet, { nomes: 'Luna', versos: 'Ana+41 9999-1111', forma: 'oval' });
  const versoDet = camada(rp, 0, 'Detalhes', 0), versoPlaca = camada(rp, 0, 'Placa', 0);
  ok('pet: verso embutido rente a face de baixo (0 a 0,4 mm)', versoDet.z0 === 0 && versoDet.z1 === 0.4 && versoPlaca.z1 === 0.4);
  ok('pet: o verso ocupa exatamente o vazio da placa', area(intersectRegion(versoDet.region, versoPlaca.region)) < 0.01);
  // "L" espelhado: a haste vai para a direita, entao a metade direita tem mais area.
  const rl = gerar(pet, { nomes: 'X', versos: 'L', forma: 'oval' });
  const vl = camada(rl, 0, 'Detalhes', 0).region, vb = regionBounds(vl), meioX = (vb.minX + vb.maxX) / 2;
  const metade = (dir: boolean) => area(intersectRegion(vl, [{ outer: dir ? [{ x: meioX, y: -999 }, { x: 999, y: -999 }, { x: 999, y: 999 }, { x: meioX, y: 999 }] : [{ x: -999, y: -999 }, { x: meioX, y: -999 }, { x: meioX, y: 999 }, { x: -999, y: 999 }], holes: [] }]));
  ok('pet: verso espelhado (le-se por baixo)', metade(true) > metade(false) * 1.2, `${metade(false).toFixed(1)} | ${metade(true).toFixed(1)} mm2`);
  const comFuro = gerar(pet, { nomes: 'Luna', forma: 'osso', suporte: 'furo', furo: 3 });
  const placaFuro = camada(comFuro, 0, 'Placa', comFuro.itens[0]!.pecas[0]!.camadas.length - 1).region;
  ok('pet: furo de 3 mm dentro da placa', placaFuro.some((q) => q.holes.some((h) => perto(regionBounds([{ outer: h, holes: [] }]).w, 3, 0.05))));
  const nfc = gerar(pet, { nomes: 'Luna', tamanho: 60, nfc: true });
  ok('pet: NFC com bolsao de 25,6 mm e instrucao de pausa', nfc.itens[0]!.pecas[0]!.camadas.some((c) => c.region.some((q) => q.holes.some((h) => perto(regionBounds([{ outer: h, holes: [] }]).w, 25.6, 0.1)))) && !!nfc.notas?.some((n) => n.includes('pause')));
  ok('pet: plaquinha pequena demais para NFC avisa', gerar(pet, { nomes: 'Luna', tamanho: 30, nfc: true }).avisos.some((a) => a.includes('NFC')));
  for (const forma of ['ondulada', 'peixe', 'osso']) {
    const r = gerar(pet, { nomes: 'Bob', forma });
    const placa = r.itens[0]!.pecas[0]!.camadas.at(-1)!.region, nome = r.itens[0]!.pecas[1]!.camadas.at(-1)!.region;
    ok(`pet ${forma}: placa inteira e nome dentro dela`, placa.length === 1 && area(diffRegion(nome, placa)) < 0.01);
  }
  // Pingente: dois furos por peca, uma peca por nome + titulo.
  const pin = gerar(receitaPorId('pingente-familia')!, { titulo: 'Família', nomes: 'Ana, Leo', cachorros: 'Rex', gatos: '', outros: '' });
  ok('pingente: titulo + 3 nomes = 4 pecas, cada uma com 2 furos', pin.itens.length === 4 && pin.itens.every((it) => it.pecas[0]!.camadas[0]!.region[0]!.holes.length === 2));
  // Chaveiro desenho encaixado: o desenho cabe no rebaixo.
  const cd = gerar(receitaPorId('chaveiro-desenho')!, { estilo: 'sobreposto', folga: 0.15, borda: false });
  const fundoRebaixo = camada(cd, 0, 'Base', 1).region, des = camada(cd, 0, 'Desenho', 0).region;
  ok('chaveiro encaixado: desenho cabe no rebaixo, sem colisao', area(intersectRegion(fundoRebaixo, des)) < 0.01);
  // Chaveiro com logo e nome: 4 cores e o logo do lado pedido.
  const cl = gerar(receitaPorId('chaveiro-logo-nome')!, { nomes: 'ANA', ladoLogo: 'esquerda' });
  const lb = regionBounds(camada(cl, 0, 'Logo', 0).region), tb = regionBounds(camada(cl, 0, 'Nome', 0).region);
  ok('chaveiro logo+nome: 4 cores, logo a esquerda do nome', cl.cores.length === 4 && lb.maxX < tb.minX);
  // Letreiro sobreposto: o nome sai numa peca e cabe no rebaixo.
  const ls = gerar(receitaPorId('letreiro-sobreposto')!, {});
  const nomeLs = camada(ls, 0, 'Nome', 0).region;
  ok('sobreposto: nome numa peca so, sem colidir com a palavra', nomeLs.length === 1 && area(intersectRegion(camada(ls, 0, 'Palavra', 1).region, nomeLs)) < 0.01);
  // Topo de bolo: hastes descem do comprimento pedido.
  const tb2 = gerar(receitaPorId('topo-bolo')!, { haste: 60 });
  const baseTb = regionBounds(camada(tb2, 0, 'Base', 0).region), textoTb = regionBounds(camada(tb2, 0, 'Topo', 0).region);
  ok('topo de bolo: hastes descem ~60 mm abaixo do texto', baseTb.minY < textoTb.minY - 55, `${(textoTb.minY - baseTb.minY).toFixed(1)} mm`);
  // Topo circular: aro com o diametro pedido e aba por dentro.
  const tc = gerar(receitaPorId('topo-bolo-circular')!, { diametro: 140, haste: 0 });
  ok('topo circular: aro de 140 mm', perto(regionBounds(camada(tc, 0, 'Tampa', 0).region).w, 140, 0.2));
  // Marcador: nome mais grosso que a aba, aba com o comprimento pedido.
  const mk = gerar(receitaPorId('marcador-pagina')!, { comprimento: 60 });
  const aba = regionBounds(camada(mk, 0, 'Aba', 0).region);
  ok('marcador: aba de ~60 mm e nome de 2 mm sobre aba de 1,4', aba.h > 58 && aba.h < 66 && camada(mk, 0, 'Nome', 0).z1 === 2 && camada(mk, 0, 'Aba', 0).z1 === 1.4, `aba ${aba.h.toFixed(1)} mm`);
  ok('marcador: padrao grade vaza a aba', camada(mk, 0, 'Aba', 0).region.some((q) => q.holes.length > 5));
  // Raspadinha: um quadrado por numero.
  const rs = gerar(receitaPorId('contador-raspadinha')!, { contador: 30, passo: 1, colunas: 10, titulo: '' });
  ok('raspadinha: 30 quadrados (furos na grade)', camada(rs, 0, 'Grade', 0).region.reduce((n, q) => n + q.holes.length, 0) >= 30);
  ok('raspadinha: quadrado pequeno demais nao gera', gerar(receitaPorId('contador-raspadinha')!, { contador: 400, colunas: 20, maxW: 60, maxH: 60 }).itens.length === 0);
  // Guia: cada pedaco cabe na mesa; uma peca por letra.
  const gg = gerar(receitaPorId('texto-com-guia')!, { texto: 'CASA', tamanho: 700, mesa: 230 });
  const guias = gg.itens.filter((it) => it.nome.startsWith('Guia'));
  ok('guia: 4 letras + pedacos de guia que cabem na mesa de 230', gg.itens.length - guias.length === 4 && guias.length >= 3 && guias.every((g) => { const b = regionBounds(g.pecas[0]!.camadas[0]!.region); return b.w <= 230 && b.h <= 230; }), `${guias.length} pedacos`);
  // Porta-canetas: medidas externas e celulas.
  const pc = gerar(receitaPorId('porta-canetas-grade')!, { celula: 14, colunas: 3, linhas: 2, paredeInterna: 1, paredeExterna: 1.2 });
  const pcb = regionBounds(camada(pc, 0, 'Porta-canetas', 1).region);
  ok('porta-canetas: 3x2 celulas de 14 mm, paredes 1 e 1,2', perto(pcb.w, 3 * 14 + 2 + 2.4, 0.01) && perto(pcb.h, 2 * 14 + 1 + 2.4, 0.01) && camada(pc, 0, 'Porta-canetas', 1).region[0]!.holes.length === 6);
  // Palitos: furo do palito com folga.
  const sp = gerar(receitaPorId('suporte-palitos')!, { palito: 6, folga: 0.3 });
  const furoP = camada(sp, 0, 'Suporte', 0).region[0]!.holes[0]!;
  ok('palitos: furo de 6,6 mm (palito 6 + folga)', perto(regionBounds([{ outer: furoP, holes: [] }]).w, 6.6, 0.05));
  // Suporte de foto: fenda com a largura da foto + folga, no meio da profundidade.
  const sf = gerar(receitaPorId('suporte-foto')!, { fenda: 1, folga: 0.2, profundidade: 21 });
  const meio = camada(sf, 0, 'Base', 1);
  ok('suporte de foto: fenda de 1,4 mm no meio da base', perto(meio.z1 - meio.z0, 1.4, 1e-9) && perto((meio.z0 + meio.z1) / 2, 10.5, 1e-9));
  // Floco: argola e nome no centro.
  const fl = gerar(receitaPorId('floco-neve')!, { nomes: 'Ana, Leo' });
  ok('floco: um enfeite por nome, corpo inteiro', fl.itens.length === 2 && fl.itens.every((it) => it.pecas[0]!.camadas[0]!.region.length === 1));
}

console.log('\n== onda 2: imagem, cortadores e carimbos ==');
{
  const largura = (r: Region) => regionBounds(r).w;
  const furos = (r: Region) => r.reduce((n, q) => n + q.holes.length, 0);
  const pecaDe = (res: Resultado, item: string, peca: string) => res.itens.find((it) => it.nome.startsWith(item))!.pecas.find((p) => p.nome === peca)!;
  // Imagem -> contorno: anel escuro em fundo claro, claro em fundo escuro e por transparencia.
  const px = (f: (x: number, y: number) => [number, number, number, number]) => {
    const d = new Uint8ClampedArray(200 * 200 * 4);
    for (let y = 0; y < 200; y++) for (let x = 0; x < 200; x++) d.set(f(x + 0.5, y + 0.5), (y * 200 + x) * 4);
    return { largura: 200, altura: 200, dados: d };
  };
  const noAnel = (x: number, y: number) => { const r = Math.hypot(x - 100, y - 100); return r < 80 && r > 40; };
  const esperado = Math.PI * (80 ** 2 - 40 ** 2);
  const escuro = pixelsParaRegiao(px((x, y) => (noAnel(x, y) ? [20, 20, 20, 255] : [250, 250, 250, 255])));
  ok('imagem: anel escuro vira 1 ilha com 1 furo, area a 1%', escuro.length === 1 && escuro[0]!.holes.length === 1 && perto(regionArea(escuro), esperado, esperado * 0.01), `${regionArea(escuro).toFixed(0)} de ${esperado.toFixed(0)} px2`);
  const claro = pixelsParaRegiao(px((x, y) => (noAnel(x, y) ? [250, 250, 250, 255] : [10, 10, 10, 255])));
  ok('imagem: fundo escuro detectado (o desenho e o claro)', perto(regionArea(claro), esperado, esperado * 0.01));
  const alfa = pixelsParaRegiao(px((x, y) => (noAnel(x, y) ? [200, 30, 30, 255] : [0, 0, 0, 0])));
  ok('imagem: PNG transparente usa o alfa', perto(regionArea(alfa), esperado, esperado * 0.01));
  ok('imagem: contorno simplificado (poucos pontos)', alfa[0]!.outer.length < 150, `${alfa[0]!.outer.length} pontos`);

  // Cortador de biscoito em circulo: medidas da parede, aba, lamina e carimbo.
  const cb = gerar(receitaPorId('cortador-biscoito')!, { forma: 'circulo', tamanho: 60, deslocamento: 5, espessura: 1.6, aba: 3.4, folga: 0.5, lamina: true, marca: 'LU' });
  const cort = pecaDe(cb, 'Cortador', 'Cortador').camadas;
  ok('cortador: aba de 80 mm (70 + 2 x (1,6 + 3,4))', perto(largura(cort[0]!.region), 80, 0.1), largura(cort[0]!.region).toFixed(2));
  ok('cortador: parede por fora de 73,2 mm', perto(largura(cort[1]!.region), 73.2, 0.1));
  ok('cortador: lamina afina ate 0,5 mm no topo', perto(largura(cort.at(-1)!.region), 71, 0.1) && cort.at(-1)!.z1 === 12);
  const placa = pecaDe(cb, 'Carimbo', 'Placa').camadas;
  ok('carimbo: placa de 69 mm (70 - 2 x folga 0,5)', perto(largura(placa.at(-1)!.region), 69, 0.1));
  ok('carimbo: furo cego do pegador (10,3 mm) so embaixo', placa[0]!.region.some((q) => q.holes.some((h) => perto(regionBounds([{ outer: h, holes: [] }]).w, 10.3, 0.05))) && furos(placa.at(-1)!.region) === 0);
  const marca = pecaDe(cb, 'Carimbo', 'Marca').camadas[0]!;
  ok('carimbo: marca embutida 0 a 0,6 mm, fora do vazio da placa', marca.z0 === 0 && marca.z1 === 0.6 && regionArea(intersectRegion(marca.region, placa[0]!.region)) < 0.01);
  ok('carimbo: pegador separado', cb.itens.some((it) => it.nome.startsWith('Pegador')) && !!cb.notas?.some((n) => n.includes('folga')));
  const semCarimbo = gerar(receitaPorId('cortador-biscoito')!, { carimbo: false });
  ok('cortador: sem carimbo sai so o cortador', semCarimbo.itens.length === 1);

  // Ejetor: arredondar tira as pontas do contorno (quadrado vira cantos redondos).
  const quadrado: Region = [{ outer: [{ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 30 }, { x: 0, y: 30 }], holes: [] }];
  const sq = JSON.stringify({ nome: 'q.svg', regiao: quadrado });
  const reto = gerar(receitaPorId('ejetor-brigadeiro')!, { desenho: sq, tamanho: 30, arredondar: 0 });
  const redondo = gerar(receitaPorId('ejetor-brigadeiro')!, { desenho: sq, tamanho: 30, arredondar: 4 });
  const aParede = (r: Resultado) => regionArea(pecaDe(r, 'Cortador', 'Cortador').camadas[1]!.region);
  ok('ejetor: cantos arredondados encurtam a parede (raio 4)', aParede(redondo) < aParede(reto) - 1, `${aParede(reto).toFixed(1)} -> ${aParede(redondo).toFixed(1)} mm2`);
  ok('ejetor: quadrado de 30 mm, parede a partir do desenho', perto(largura(pecaDe(reto, 'Cortador', 'Cortador').camadas[1]!.region), 33.2, 0.05));

  // Grade: medidas externas, celulas e saia.
  const gr = gerar(receitaPorId('cortadores-grade')!, { largura: 40, altura: 25, linhas: 2, colunas: 3, parede: 1.2, saia: 4, raio: 0, marca: '' });
  const [baseG, paredeG] = gr.itens[0]!.pecas[0]!.camadas;
  ok('grade: 3 x 40 + 4 x 1,2 = 124,8 mm', perto(largura(paredeG!.region), 124.8, 0.01) && perto(regionBounds(paredeG!.region).h, 2 * 25 + 3 * 1.2, 0.01));
  ok('grade: 6 retangulos, saia de 4 mm na base', furos(paredeG!.region) === 6 && paredeG!.region[0]!.holes.every((h) => perto(regionBounds([{ outer: h, holes: [] }]).w, 40, 0.01)) && baseG!.region[0]!.holes.every((h) => perto(regionBounds([{ outer: h, holes: [] }]).w, 32, 0.01)));
  const grm = gerar(receitaPorId('cortadores-grade')!, { largura: 40, altura: 25, linhas: 2, colunas: 3, marca: '@ana' });
  ok('grade: marca em relevo nas duas abas', grm.itens[0]!.pecas[1]!.nome === 'Marca' && largura(grm.itens[0]!.pecas[0]!.camadas[0]!.region) > 124.8 + 20);

  // Carimbo de molde: invertido = vazio no lugar do desenho; polegar atras.
  const mo = gerar(receitaPorId('carimbo-molde')!, { texto: 'OI', tamanho: 60, deslocamento: 3, inverter: false });
  const mi = gerar(receitaPorId('carimbo-molde')!, { texto: 'OI', tamanho: 60, deslocamento: 3, inverter: true });
  const bloco = pecaDe(mo, 'OI', 'Bloco').camadas, aBloco = regionArea(bloco.at(-1)!.region);
  const aDes = regionArea(pecaDe(mo, 'OI', 'Desenho').camadas[0]!.region), aInv = regionArea(pecaDe(mi, 'OI', 'Desenho').camadas[0]!.region);
  ok('molde: invertido = bloco menos o desenho', perto(aInv, aBloco - aDes, 0.5), `${aInv.toFixed(1)} vs ${(aBloco - aDes).toFixed(1)}`);
  ok('molde: rebaixo do polegar so na face de baixo', furos(bloco[0]!.region) >= furos(bloco.at(-1)!.region) + 1 && bloco[0]!.z0 === 0);
  ok('molde: lado maior 60 mm + margens', perto(Math.max(largura(bloco.at(-1)!.region), regionBounds(bloco.at(-1)!.region).h), 66, 0.3));

  // Carimbo circular: corpo abre de 40 para 60 mm.
  const cc = gerar(receitaPorId('carimbo-circular')!, { dBase: 40, dTopo: 60, alturaCorpo: 28 });
  const corpo = cc.itens[0]!.pecas[0]!.camadas;
  ok('circular: corpo de 40 mm embaixo a 60 mm em cima, 28 de altura', largura(corpo[0]!.region) < 41 && perto(largura(corpo.at(-1)!.region), 60, 0.4) && corpo.at(-1)!.z1 === 28);
  ok('circular: degraus subindo sem balanco (cada um <= 0,3 mm para fora)', corpo.every((c, i) => !i || largura(c.region) - largura(corpo[i - 1]!.region) <= 0.6 + 1e-6));

  // Doces: um por letra, desenho em cima do corpo.
  const cl = gerar(receitaPorId('carimbo-letras')!, { textos: 'A, 7, B', alturaCorpo: 25, profundidade: 4 });
  ok('letras: 3 carimbos, letra de 25 a 29 mm', cl.itens.length === 3 && cl.itens.every((it) => it.pecas.find((p) => p.nome === 'Desenho')!.camadas[0]!.z1 === 29));
  const ci = gerar(receitaPorId('carimbo-imagem')!, { desenho: sq, desenho2: sq, tamanho: 14, tamanho2: 14, preencher: true });
  ok('doce com imagem: 2 imagens = 2 carimbos', ci.itens.length === 2 && !ci.avisos.length, ci.avisos.join(' | '));
  const corpoDoce = cl.itens[0]!.pecas[0]!.camadas;
  const passos = corpoDoce.map((c, i) => (i ? (largura(c.region) - largura(corpoDoce[i - 1]!.region)) / 2 / (c.z0 - corpoDoce[i - 1]!.z0) : 0));
  ok('doce: o topo abre no maximo ~40 graus', Math.max(...passos) <= Math.tan((41 * Math.PI) / 180) * 1.5, Math.max(...passos).toFixed(2));
}

console.log('\n== onda 2: colorir, resina, multipartes, quebra-cabeca, NFC, arco, bases ==');
{
  const largura = (r: Region) => regionBounds(r).w;
  const furos = (r: Region) => r.reduce((n, q) => n + q.holes.length, 0);
  const pecaDe = (res: Resultado, item: string, peca: string) => res.itens.find((it) => it.nome.startsWith(item))!.pecas.find((p) => p.nome === peca)!;
  const quadrado = (l: number): Region => [{ outer: [{ x: 0, y: 0 }, { x: l, y: 0 }, { x: l, y: l }, { x: 0, y: l }], holes: [] }];
  // Moldura quadrada com uma cruz: 4 areas fechadas.
  const grade: Region = diffRegion(quadrado(40), [
    { outer: [{ x: 2, y: 2 }, { x: 19, y: 2 }, { x: 19, y: 19 }, { x: 2, y: 19 }], holes: [] }, { outer: [{ x: 21, y: 2 }, { x: 38, y: 2 }, { x: 38, y: 19 }, { x: 21, y: 19 }], holes: [] },
    { outer: [{ x: 2, y: 21 }, { x: 19, y: 21 }, { x: 19, y: 38 }, { x: 2, y: 38 }], holes: [] }, { outer: [{ x: 21, y: 21 }, { x: 38, y: 21 }, { x: 38, y: 38 }, { x: 21, y: 38 }], holes: [] },
  ]);
  const gradeJ = JSON.stringify({ nome: 'grade.svg', regiao: grade });

  // Texto em arco: o pe das letras no raio pedido.
  const arco = textoEmArco({ texto: 'ABCDE', fonte: ctx.fonte('bebas-neue'), altura: 5 }, 20, 300);
  const dists = arco.regiao.flatMap((p) => p.outer).map((q) => Math.hypot(q.x, q.y));
  ok('arco: letras entre o raio 20 e 20 + altura', Math.min(...dists) > 19.5 && Math.max(...dists) < 26.5, `${Math.min(...dists).toFixed(2)} a ${Math.max(...dists).toFixed(2)}`);
  ok('arco: angulo = largura / raio', arco.graus > 30 && arco.graus < 90, arco.graus.toFixed(1));

  // Colorir.
  const rel = gerar(receitaPorId('colorir')!, { desenho: gradeJ, tamanho: 40, modo: 'relevo', margem: 0 });
  ok('colorir relevo: linhas 1 mm sobre base 1,8', pecaDe(rel, 'grade', 'Linhas').camadas[0]!.z0 === 1.8 && pecaDe(rel, 'grade', 'Linhas').camadas[0]!.z1 === 2.8);
  const af = gerar(receitaPorId('colorir')!, { desenho: gradeJ, tamanho: 40, modo: 'afundado', espBase: 2, profundidade: 0.6 });
  const topoAf = pecaDe(af, 'grade', 'Topo').camadas[0]!;
  ok('colorir afundado: topo = fundo menos as linhas, de 1,4 a 2', perto(topoAf.z0, 1.4, 1e-9) && perto(regionArea(topoAf.region), 4 * 17 * 17, 0.5), regionArea(topoAf.region).toFixed(1));
  const duas = gerar(receitaPorId('colorir')!, { desenho: gradeJ, tamanho: 40, modo: 'duas', espBase: 1.8, espLinhas: 1, folga: 0.2 });
  const linhasD = duas.itens.find((it) => it.nome.endsWith('linhas'))!.pecas[0]!.camadas[0]!;
  ok('colorir 2 partes: linhas soltas com 1 + rebaixo de altura', perto(linhasD.z1, 1 + 1, 1e-9) && duas.itens.length === 2);
  ok('colorir 2 partes: rebaixo da base com folga de 0,2', perto(regionArea(pecaDe(duas, 'grade base', 'Base').camadas.at(-1)!.region), 4 * 16.6 * 16.6, 2));
  const circ = gerar(receitaPorId('colorir')!, { desenho: gradeJ, forma: 'circulo', tamanho: 100, escala: 50 });
  ok('colorir em circulo: fundo de 100 mm', perto(largura(pecaDe(circ, 'grade', 'Base').camadas[0]!.region), 100, 0.1));

  // Resina: bordas mais altas que o desenho.
  const rs = gerar(receitaPorId('chaveiro-resina')!, { desenho: gradeJ, tamanho: 40, bordaExterna: true, bordaInterna: true, altBorda: 1.4, altDesenho: 0.6 });
  ok('resina: bordas 1,4 e desenho 0,6 sobre a base', pecaDe(rs, 'grade', 'Bordas').camadas[0]!.z1 === 1.8 + 1.4 && pecaDe(rs, 'grade', 'Desenho').camadas[0]!.z1 === 1.8 + 0.6);
  ok('resina: argola com furo', furos(pecaDe(rs, 'grade', 'Base').camadas[0]!.region) >= 1);

  // Multipartes: 4 pecas que cabem nas 4 areas com folga.
  const mp = gerar(receitaPorId('imagem-multipartes')!, { desenho: gradeJ, tamanho: 40, folga: 0.22 });
  const pcs = mp.itens.find((it) => it.nome.startsWith('Peças'))!.pecas[0]!.camadas[0]!.region;
  ok('multipartes: 4 pecas de 17 - 2 x 0,22 mm', pcs.length === 4 && pcs.every((p) => perto(regionBounds([p]).w, 17 - 0.44, 0.02)), pcs.map((p) => regionBounds([p]).w.toFixed(2)).join(' '));

  // Quebra-cabeca: n^2 pecas sem sobrepor, cada uma do tamanho da celula em media.
  const pz = pecasDeQuebraCabeca(4, 100, 0.2);
  const somaPz = pz.reduce((s, p) => s + regionArea(p), 0), uniao = regionArea(pz.flat().length ? unir(pz) : []);
  ok('quebra-cabeca: 16 pecas inteiras (uma ilha cada)', pz.length === 16 && pz.every((p) => p.length === 1));
  ok('quebra-cabeca: pecas nao se sobrepoem', perto(somaPz, uniao, 0.01), `${somaPz.toFixed(1)} vs ${uniao.toFixed(1)}`);
  ok('quebra-cabeca: area total = lado^2 menos a folga', somaPz < 100 * 100 && somaPz > 100 * 100 * 0.97, somaPz.toFixed(0));
  ok('quebra-cabeca: abas variam entre as pecas', new Set(pz.map((p) => regionArea(p).toFixed(0))).size > 2);

  // Chaveiro NFC: bolsao fechado de 26 mm, argola mais fina.
  const nf = gerar(receitaPorId('chaveiro-nfc')!, { forma: 'quadrado', largura: 32, altura: 32, espessura: 4, dNfc: 26, espNfc: 0.6, argola: 'cantoDir', espArgola: 2 });
  const corpoNf = pecaDe(nf, 'Chaveiro', 'Chaveiro').camadas;
  const comBolsao = corpoNf.filter((c) => c.region.some((q) => q.holes.some((h) => perto(regionBounds([{ outer: h, holes: [] }]).w, 26, 0.05))));
  ok('NFC: bolsao de 26 mm entre 2,4 e 3 mm (1 mm de tampa)', comBolsao.length === 1 && perto(comBolsao[0]!.z0, 2.4, 1e-9) && perto(comBolsao[0]!.z1, 3, 1e-9));
  ok('NFC: nota da pausa na altura certa', !!nf.notas?.some((n) => n.includes('3 mm')));
  ok('NFC: argola so ate 2 mm', largura(corpoNf.find((c) => c.z0 >= 2)!.region) < largura(corpoNf[0]!.region) - 1);
  ok('NFC: simbolo embutido embaixo', pecaDe(nf, 'Chaveiro', 'Embaixo').camadas[0]!.z0 === 0);
  ok('NFC: etiqueta que nao cabe avisa', gerar(receitaPorId('chaveiro-nfc')!, { largura: 24, altura: 24, dNfc: 30 }).avisos.some((a) => a.includes('NFC')));

  // Carretel: o fio forma ondas de meio fio.
  const cr = gerar(receitaPorId('chaveiro-carretel')!, { diametro: 32, fio: 1.2 });
  const fil = pecaDe(cr, 'Carretel', 'Filamento').camadas.map((c) => largura(c.region) / 2);
  ok('carretel: fio enrolado (sulcos de 0,2 a 0,6 mm em degraus de 0,2)', Math.max(...fil) - Math.min(...fil) >= 0.2 && Math.max(...fil) - Math.min(...fil) <= 0.6, `${Math.min(...fil).toFixed(2)} a ${Math.max(...fil).toFixed(2)}`);
  ok('carretel: tampa com pino que entra no cubo', cr.itens.length === 2 && pecaDe(cr, 'Tampa', 'Tampa').camadas.length === 2);

  // Abridor: tunel aberto na camada do meio.
  const ab = gerar(receitaPorId('abridor-latas')!, { alturaInicial: 0.8, alturaTunel: 2.6, alivio: false, argola: false });
  const cab = pecaDe(ab, 'Abridor', 'Corpo').camadas;
  const tun = cab.find((c) => perto(c.z0, 0.8, 1e-9))!;
  ok('abridor: tunel de 2,6 mm a partir de 0,8', !!tun && perto(tun.z1, 3.4, 1e-9) && regionArea(tun.region) < regionArea(cab[0]!.region) - 200);

  // Espelho: rebaixo do espelho e furo no vao da frase.
  const es = gerar(receitaPorId('chaveiro-espelho')!, { texto: 'MAE', dEspelho: 30 });
  const rebaixo = pecaDe(es, 'Chaveiro', 'Chaveiro').camadas.at(-1)!;
  ok('espelho: rebaixo de 30,4 mm ate o topo', rebaixo.region.some((q) => q.holes.some((h) => perto(regionBounds([{ outer: h, holes: [] }]).w, 30.4, 0.05))) && !es.avisos.length, es.avisos.join(' | '));

  // Rosa scrunchie: furo do meio.
  const sc = gerar(receitaPorId('rosa-texto')!, { uso: 'scrunchie', furoCentral: 20, tamanho: 60 });
  ok('rosa scrunchie: furo de 20 mm no meio da base', pecaDe(sc, 'Rosa', 'Base').camadas[0]!.region.some((q) => q.holes.some((h) => perto(regionBounds([{ outer: h, holes: [] }]).w, 20, 0.05))));

  // Base com fenda: fenda = aba + folgas.
  const pb = gerar(receitaPorId('placa-com-base')!, { desenho: gradeJ, tamanho: 40, espPeca: 3, tolH: 0.2, tolV: 0.24, encaixe: 10, profBase: 26, chanfro: 8, larguraBase: 120 });
  const cb2 = pecaDe(pb, 'Base', 'Base').camadas;
  const fenda = cb2.find((c) => c.region.length === 1 && regionArea(c.region) < 120 * 30 - 1)!;
  ok('base: fenda com a espessura da peca + 2 x 0,2', !!fenda && perto(fenda.z1 - fenda.z0, 3.4, 1e-9));
  ok('base: chanfro em degraus ate a frente', cb2.at(-1)!.z1 === 26 && regionBounds(cb2.at(-1)!.region).h < 30 - 7);
  const tf = gerar(receitaPorId('trofeu')!, { fundoImagem: true });
  ok('trofeu: base, imagem, palavra e placa', tf.itens.length === 4);
}

console.log('\n== lacunas dos parciais ==');
{
  const largura = (r: Region) => regionBounds(r).w;
  const furos = (r: Region) => r.reduce((n, q) => n + q.holes.length, 0);
  const pecaDe = (res: Resultado, item: number, peca: string) => res.itens[item]!.pecas.find((p) => p.nome === peca)!;
  const centroX = (r: Region) => (regionBounds(r).minX + regionBounds(r).maxX) / 2;
  const sq = JSON.stringify({ nome: 'q.svg', regiao: [{ outer: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }], holes: [] }] });

  const pet = receitaPorId('plaquinha-pet')!;
  const p0 = gerar(pet, { nomes: 'Bob', versos: '', forma: 'oval', tamanho: 60 }), p1 = gerar(pet, { nomes: 'Bob', versos: '', forma: 'oval', tamanho: 60, xNome: 4, escala: 60 });
  const nomeDe = (r: Resultado) => pecaDe(r, 0, 'Detalhes').camadas.at(-1)!.region;
  ok('pet: mover o nome 4 mm para a direita', centroX(nomeDe(p1)) - centroX(gerar(pet, { nomes: 'Bob', versos: '', forma: 'oval', tamanho: 60, escala: 60 }).itens[0]!.pecas[1]!.camadas.at(-1)!.region) > 3.9 && !!p0);
  const pv = gerar(pet, { nomes: 'Luna', versos: 'Ana+41 99999-1111+Rua das Flores 123', forma: 'osso' });
  ok('pet: verso encolhe ate caber no osso', !pv.avisos.some((a) => a.includes('verso')), pv.avisos.join(' | '));

  const mk = gerar(receitaPorId('marcador-pagina')!, { padrao: 'floral', acabamento: 'cor', espAba: 1.4 });
  const pad = mk.itens[0]!.pecas.find((p) => p.nome === 'Padrão')!.camadas;
  ok('marcador: padrao em cor nas duas faces (0-0,4 e 1-1,4)', pad.length === 2 && pad[0]!.z0 === 0 && perto(pad[0]!.z1, 0.4, 1e-9) && perto(pad[1]!.z0, 1, 1e-9) && perto(pad[1]!.z1, 1.4, 1e-9));
  ok('marcador: miolo da aba inteiro (sem vazado)', furos(pecaDe(mk, 0, 'Aba').camadas[1]!.region) <= 1);

  const gg = gerar(receitaPorId('texto-com-guia')!, { texto: 'A', tamanho: 500, mesa: 230 });
  const letras = gg.itens.filter((it) => !it.nome.startsWith('Guia'));
  ok('guia: letra de 500 mm sai em pedacos que cabem na mesa', letras.length > 1 && letras.every((it) => { const b = regionBounds(it.pecas[0]!.camadas[0]!.region); return b.w <= 230 && b.h <= 230; }), `${letras.length} pedaços`);
  const guiasG = gg.itens.filter((it) => it.nome.startsWith('Guia'));
  ok('guia: a guia alta tambem e cortada na horizontal', guiasG.every((it) => { const b = regionBounds(it.pecas[0]!.camadas[0]!.region); return b.w <= 230 && b.h <= 230; }));

  const fl = gerar(receitaPorId('floco-neve')!, { nomes: 'Ana', desenho: sq, tamanho: 60 });
  ok('floco: desenho proprio no lugar do floco', perto(largura(fl.itens[0]!.pecas[0]!.camadas[0]!.region), 60, 1));

  const pg = gerar(receitaPorId('pingente-familia')!, { titulo: '', nomes: 'Ana', cachorros: '', gatos: '', outros: '', formaPeca: 'desenho', desenhoPeca: JSON.stringify({ nome: 'r.svg', regiao: [{ outer: [{ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 60, y: 20 }, { x: 0, y: 20 }], holes: [] }] }), borda: 1 });
  ok('pingente: formato do desenho, 2 furos e borda (3 cores)', pg.itens[0]!.pecas[0]!.camadas[0]!.region[0]!.holes.length === 2 && pg.cores.length === 3);

  const sp = gerar(receitaPorId('suporte-palitos')!, { base: 'espessa', espBaseGrossa: 8 });
  ok('palitos: base espessa com cavidade fechada e nota de pausa', sp.itens[0]!.pecas[0]!.camadas.some((c) => c.z0 === 1.2 && furos(c.region) >= 1) && !!sp.notas?.length);
  const al = sp.itens[0]!.pecas[0]!.camadas.filter((c) => c.z0 >= 8 && c.region.length > 1);
  ok('palitos: aletas curvas encolhem para dentro (sem balanco)', al.every((c, i) => !i || largura(c.region) <= largura(al[i - 1]!.region) + 1e-6) && largura(al[0]!.region) > largura(al.at(-1)!.region) + 20);

  const pc = receitaPorId('palavra-camadas')!;
  const l0 = gerar(pc, { linha1: 'Bolos', linha2: 'Vovo', moverLinha2: 0, cores: '2' }), l1 = gerar(pc, { linha1: 'Bolos', linha2: 'Vovo', moverLinha2: 20, cores: '2' });
  ok('palavra: mover a segunda linha muda o desenho', Math.abs(regionArea(l0.itens[0]!.pecas[1]!.camadas[0]!.region) - regionArea(l1.itens[0]!.pecas[1]!.camadas[0]!.region)) > 1 || largura(l1.itens[0]!.pecas[1]!.camadas[0]!.region) !== largura(l0.itens[0]!.pecas[1]!.camadas[0]!.region));

  const cd = gerar(receitaPorId('chaveiro-desenho')!, { desenho: sq, face: 'baixo', espBase: 2.6, espDesenho: 1 });
  ok('chaveiro: face para baixo, desenho embutido de 0 a 1 mm', pecaDe(cd, 0, 'Desenho').camadas[0]!.z0 === 0 && pecaDe(cd, 0, 'Desenho').camadas[0]!.z1 === 1);
  const ct = gerar(receitaPorId('chaveiro-desenho')!, { origem: 'texto', texto: 'Ana', tamanho: 40 });
  ok('chaveiro: texto no lugar do desenho', perto(largura(pecaDe(ct, 0, 'Desenho').camadas[0]!.region), 40, 0.5) && ct.itens[0]!.nome === 'Ana');

  const cc = gerar(receitaPorId('carimbo-circular')!, { desenho: sq, desenho2: sq, tamanho: 20, dBase: 30, dTopo: 30, argola: true });
  ok('circular: 2 imagens = 2 carimbos, argola na base', cc.itens.length === 2 && cc.itens.every((it) => furos(it.pecas[0]!.camadas[0]!.region) === 1));
  const ci = gerar(receitaPorId('carimbo-imagem')!, { desenho: sq, desenho2: sq, desenho3: sq, tamanho: 12, tamanho2: 12, tamanho3: 8, x3: 3 });
  ok('doce: 3 imagens com tamanho proprio', ci.itens.length === 3 && !ci.avisos.length, ci.avisos.join(' | '));
  const cm = gerar(receitaPorId('carimbo-letras')!, { textos: 'A', marcaDesenho: sq, tamanhoMarca: 8 });
  ok('marca: logo em imagem embutido embaixo', cm.itens[0]!.pecas.some((p) => p.nome === 'Marca' && p.camadas[0]!.z0 === 0));

  const so = gerar(receitaPorId('social-camadas')!, { formaBase: 'retangulo', textura: 'hilbert', relevoTextura: 0.4, cores: '2' });
  const baseSo = so.itens[0]!.pecas[0]!.camadas;
  ok('social: textura de Hilbert em relevo na base retangular', baseSo.length === 2 && perto(baseSo[1]!.z1 - baseSo[1]!.z0, 0.4, 1e-9) && regionArea(baseSo[1]!.region) > 100);
  const hb = textura('hilbert', { minX: 0, minY: 0, maxX: 60, maxY: 60 }, 4, 1);
  ok('textura: curva de Hilbert e uma linha so', hb.length === 1, `${hb.length} ilhas`);

  const ls0 = gerar(receitaPorId('letreiro-sobreposto')!, {}), ls1 = gerar(receitaPorId('letreiro-sobreposto')!, { adornoNome: 'coracao' });
  const nomeLs = (r: Resultado) => r.itens[0]!.pecas.find((p) => p.nome === 'Nome')!.camadas[0]!.region;
  ok('letreiro: coracoes nas pontas alargam o nome, ainda uma peca', largura(nomeLs(ls1)) > largura(nomeLs(ls0)) + 10 && nomeLs(ls1).length === 1);
}

console.log('\n== onda 3: cilindros e cupulas ==');
{
  const largura = (r: Region) => regionBounds(r).w;
  const pecaDe = (res: Resultado, item: number, peca: string) => res.itens[item]!.pecas.find((p) => p.nome === peca)!;
  const sq = JSON.stringify({ nome: 'q.svg', regiao: [{ outer: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }], holes: [] }] });
  // Relevo em volta: um quadrado desenrolado vira um ressalto de h mm so naquelas camadas.
  const desenroladoQ: Region = [{ outer: [{ x: 10, y: 5 }, { x: 20, y: 5 }, { x: 20, y: 15 }, { x: 10, y: 15 }], holes: [] }];
  const cil = cilindroComRelevo({ R: 10, desenho: desenroladoQ, h: 1, z0: 0, z1: 20 });
  const raioMax = (r: Region) => Math.max(...r.flatMap((p) => p.outer).map((q) => Math.hypot(q.x, q.y)));
  const comRelevo = cil.filter((c) => raioMax(c.region) > 10.5);
  ok('cilindro: relevo de 1 mm so entre z 5 e 15', comRelevo.length > 0 && comRelevo.every((c) => c.z0 >= 5 - 1e-9 && c.z1 <= 15 + 1e-9) && perto(raioMax(comRelevo[0]!.region), 11, 0.01));
  const arco = comRelevo[0]!.region.flatMap((p) => p.outer).filter((q) => Math.hypot(q.x, q.y) > 10.5).map((q) => Math.atan2(q.y, q.x));
  ok('cilindro: o ressalto cobre 10 mm de arco (1 rad em R = 10)', perto(Math.max(...arco) - Math.min(...arco), 1, 0.02), (Math.max(...arco) - Math.min(...arco)).toFixed(3));

  const rolo = gerar(receitaPorId('rolo-textura')!, { desenho: sq, diametro: 30, altura: 60, furo: 8, relevo: 0.8, positiva: true, nU: 6, nZ: 4 });
  const tex = pecaDe(rolo, 0, 'Textura').camadas;
  ok('rolo: textura sai 0,8 mm do rolo de 30', tex.length > 0 && perto(Math.max(...tex.map((c) => raioMax(c.region))), 15.8, 0.02));
  ok('rolo: furo de 8 mm no meio', pecaDe(rolo, 0, 'Rolo').camadas[0]!.region[0]!.holes.some((h) => perto(regionBounds([{ outer: h, holes: [] }]).w, 8, 0.05)));
  const neg = gerar(receitaPorId('rolo-textura')!, { desenho: sq, diametro: 30, positiva: false, relevo: 0.8 });
  ok('rolo: textura para dentro numa peca so', neg.itens[0]!.pecas.length === 1 && neg.itens[0]!.pecas[0]!.camadas.some((c) => Math.min(...c.region[0]!.outer.map((q) => Math.hypot(q.x, q.y))) < 14.3));

  const eb = gerar(receitaPorId('estojo-batom')!, { modo: 'liso', diametroBatom: 16, folga: 1.4, parede: 2.8, alturaBatom: 67, paraFora: 12, fundo: 2, furo: 3.4 });
  const tubo = pecaDe(eb, 0, 'Estojo').camadas.find((c) => c.z0 >= 2 && c.region[0]!.holes.length)!;
  ok('batom: furo interno de 18,8 mm (16 + 2 x 1,4)', perto(regionBounds([{ outer: tubo.region[0]!.holes[0]!, holes: [] }]).w, 18.8, 0.05));
  const topoTubo = Math.max(...pecaDe(eb, 0, 'Estojo').camadas.filter((c) => c.region.some((q) => q.holes.length)).map((c) => c.z1));
  ok('batom: tubo de 57 mm (67 - 12 + fundo 2)', perto(topoTubo, 57, 0.01));
  ok('batom: aba com furo acima da borda', pecaDe(eb, 0, 'Estojo').camadas.some((c) => c.z0 > 57 && c.region.length === 2));

  const ej = gerar(receitaPorId('ejetor-cupula')!, { desenho: sq, tamanho: 30, profundidade: 10, alturaEjetor: 35, folga: 0.4, espCasca: 1.2 });
  const emb = ej.itens.find((it) => it.nome === 'Êmbolo')!.pecas[0]!.camadas;
  ok('ejetor: cupula de 10 mm cavada no topo do embolo de 35', perto(emb[0]!.z1, 25, 1e-9) && emb.at(-1)!.z1 === 35 && emb.at(-1)!.region[0]!.holes.length === 1);
  const furoCav = (c: { region: Region }) => regionArea([{ outer: c.region[0]!.holes[0] ?? [], holes: [] }]);
  ok('ejetor: a cavidade abre subindo (sem balanco)', emb.slice(1).every((c, i) => !i || furoCav(c) >= furoCav(emb[i]!) - 1e-6));
  ok('ejetor: casca 0,4 mm por fora da forma', perto(regionBounds([{ outer: ej.itens[0]!.pecas[0]!.camadas[0]!.region[0]!.holes[0]!, holes: [] }]).w, 30.8, 0.05));

  const cb = gerar(receitaPorId('cumbuca')!, { desenho: sq, tamanho: 120, altura: 40, casca: 1.6 });
  const cc = pecaDe(cb, 0, 'Cumbuca').camadas;
  ok('cumbuca: boca de 120 mm e fundo menor', perto(largura(cc.at(-1)!.region), 120, 0.2) && largura(cc[0]!.region) < 100);
  ok('cumbuca: a parede abre no maximo 50 graus por camada', cc.every((c, i) => !i || (largura(c.region) - largura(cc[i - 1]!.region)) / 2 <= (c.z1 - c.z0) * Math.tan((50.5 * Math.PI) / 180) + 1e-6));

  const sb = gerar(receitaPorId('suporte-bolo')!, { diametroBase: 170, diametroFinal: 50, altura: 100 });
  const pe = sb.itens.find((it) => it.nome === 'Pé')!.pecas[0]!.camadas;
  ok('suporte de bolo: pe de 170 embaixo a 50 em cima, oco', perto(largura(pe[0]!.region), 170, 1) && perto(largura(pe.at(-1)!.region), 50, 1) && pe.every((c) => c.region[0]!.holes.length === 1));
  ok('suporte de bolo: o pe afina subindo (sem balanco)', pe.every((c, i) => !i || largura(c.region) <= largura(pe[i - 1]!.region) + 1e-6));
}

console.log('\n== onda 3: potes, caixas e quadros ==');
{
  const largura = (r: Region) => regionBounds(r).w;
  const furos = (r: Region) => r.reduce((n, q) => n + q.holes.length, 0);
  const sq = JSON.stringify({ nome: 'q.svg', regiao: [{ outer: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }], holes: [] }] });
  // Rosca: a tampa (desvirada) nao encosta no gargalo e a crista entra no sulco.
  const pote = poteRosqueado({ ri: 8, hi: 40, fundo: 2, passo: 2.5, prof: 1, folga: 0.3, rosca: 8, topoTampa: 2 });
  let colide = 0, encaixa = 0;
  for (const c of pote.corpo.filter((k) => k.z0 >= 42 - 8 - 1e-9)) {
    const zc = (c.z0 + c.z1) / 2, h = 2 + (42 + 0.2 - zc);
    const t = pote.tampa.find((k) => k.z0 <= h && k.z1 >= h);
    if (!t) continue;
    const tampaMontada = scaleRegion(t.region, 1, -1);
    colide += regionArea(intersectRegion(tampaMontada, c.region));
    // Sem folga e sem rosca na tampa, o gargalo encostaria: a crista passa do furo liso.
    encaixa += regionArea(intersectRegion(diffRegion(circulo(0, 0, pote.R, 120), circulo(0, 0, 8 + 1.2 + 0.3, 120)), c.region)) > 0 ? 1 : 0;
  }
  ok('pote: a rosca da tampa casa com a do gargalo (sem colisao)', colide < 0.05, `${colide.toFixed(3)} mm2`);
  ok('pote: a crista do gargalo entra no sulco da tampa', encaixa > 10);
  const pp = gerar(receitaPorId('porta-pente')!, { diametroInterno: 16, alturaInterna: 90, argola: 'tampa' });
  ok('porta-pente: argola na tampa (furo rente a mesa)', furos(pp.itens.find((it) => it.nome === 'Tampa')!.pecas[0]!.camadas[0]!.region) === 1);
  const cm = gerar(receitaPorId('carimbos-massinha')!, { frente: sq, verso: sq, frente2: sq, diametro: 40, espessura: 8 });
  ok('massinha: 2 carimbos + pote + tampa; verso afundado', cm.itens.length === 4 && cm.itens[0]!.pecas[0]!.camadas[0]!.region[0]!.holes.length === 1);
  const potM = cm.itens.find((it) => it.nome === 'Pote')!.pecas[0]!.camadas.find((c) => c.z0 >= 2 && c.region[0]!.holes.length)!;
  ok('massinha: os carimbos cabem no pote (furo 41,6 > 40)', regionBounds([{ outer: potM.region[0]!.holes[0]!, holes: [] }]).w > 40.5);

  const cf = gerar(receitaPorId('caixa-figurinhas')!, { larguraFig: 49, alturaFig: 65, folgaFig: 1.2, caixas: 2, parede: 1.2, corte: 0 });
  const paredeC = cf.itens[0]!.pecas.find((p) => p.nome === 'Caixa')!.camadas.at(-1)!;
  ok('caixa: 2 celulas de 51,4 x 67,4', paredeC.region[0]!.holes.length === 2 && paredeC.region[0]!.holes.every((h) => perto(regionBounds([{ outer: h, holes: [] }]).w, 51.4, 0.05) && perto(regionBounds([{ outer: h, holes: [] }]).h, 67.4, 0.05)));
  const aroT = cf.itens[1]!.pecas[0]!.camadas.at(-1)!.region;
  ok('caixa: aro da tampa entra por dentro da parede com folga', perto(largura(aroT), 2 * 51.4 + 3 * 1.2 - 2 * 1.2 - 2 * 0.23, 0.05), largura(aroT).toFixed(2));

  const pc = gerar(receitaPorId('porta-canetas-design')!, { lado: 55, parede: 2.4, rebaixo: 0.8, margem: 5 });
  ok('porta-canetas: rebaixo de 0,8 na frente e painel de 0,8', pc.itens[0]!.pecas[0]!.camadas.some((c) => perto(regionBounds(c.region).minY, -27.5, 0.01) && regionArea(c.region) < regionArea(pc.itens[0]!.pecas[0]!.camadas[1]!.region) - 10) && pc.itens[1]!.pecas[0]!.camadas[0]!.z1 === 0.8);

  const qt = gerar(receitaPorId('quadro-tecido')!, { pausa: 0.6, espDesenho: 5, espCor: 0.2 });
  const desQ = qt.itens[0]!.pecas.find((p) => p.nome === 'Desenho')!.camadas[0]!;
  ok('quadro: o desenho comeca na pausa (em cima do tecido)', desQ.z0 === 0.6 && !!qt.notas?.some((n) => n.includes('0,6')));
  const pr = gerar(receitaPorId('porta-retrato')!, { tamanho: '10x15' });
  ok('porta-retrato: duas partes com furos dos pinos e pinos soltos', pr.itens.length >= 3 && pr.itens.some((it) => it.nome === 'Pinos'));
  const tunel = pr.itens[0]!.pecas[0]!.camadas.filter((c) => c.region.length > 1);
  ok('porta-retrato: furo do fio atravessa a moldura de cima', tunel.length > 0);
  const du = gerar(receitaPorId('display-unhas')!, { diametro: 90, mao: 'direita' });
  ok('display: encaixe do dedo do lado direito', regionArea(intersectRegion(du.itens[0]!.pecas[0]!.camadas.at(-1)!.region, circulo(42, -15.75, 2, 24))) < 0.01 && regionArea(intersectRegion(du.itens[0]!.pecas[0]!.camadas.at(-1)!.region, circulo(-42, -15.75, 2, 24))) > 1);
  const mic = gerar(receitaPorId('mini-microfone')!, { larguraMic: 22, espessuraMic: 14, folga: 0.3, profundidadeMic: 28 });
  const furoMic = mic.itens[0]!.pecas[0]!.camadas[0]!.region[0]!.holes[0]!;
  ok('microfone: furo de 22,6 x 14,6 por 28 mm', perto(regionBounds([{ outer: furoMic, holes: [] }]).w, 22.6, 0.05) && perto(mic.itens[0]!.pecas[0]!.camadas[0]!.z1, 28, 1e-9));
}

console.log('\n== parciais fechados (onda 3) ==');
{
  const sq = JSON.stringify({ nome: 'q.svg', regiao: [{ outer: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }], holes: [] }] });
  const vol = (r: Resultado, nome: string) => r.itens.find((it) => it.nome === nome)!.pecas[0]!.camadas.reduce((s, c) => s + regionArea(c.region) * (c.z1 - c.z0), 0);
  const ej0 = gerar(receitaPorId('ejetor-cupula')!, { mostrarDesenho: false }), ej1 = gerar(receitaPorId('ejetor-cupula')!, { mostrarDesenho: true, larguraLinhas: 1.2, altLinhas: 1.2 });
  ok('ejetor: frisos do desenho somam volume dentro da cupula', vol(ej1, 'Êmbolo') > vol(ej0, 'Êmbolo') + 5, `${(vol(ej1, 'Êmbolo') - vol(ej0, 'Êmbolo')).toFixed(1)} mm3`);
  const cf = gerar(receitaPorId('caixa-figurinhas')!, { caixas: 3, suporte: true });
  ok('caixa: um suporte por compartimento', cf.itens.filter((it) => it.nome.startsWith('Suporte')).length === 3);
  const qt = gerar(receitaPorId('quadro-tecido')!, { tampaFrente: 4 });
  ok('quadro: moldura da frente de 4 mm', qt.itens.some((it) => it.nome === 'Moldura da frente' && it.pecas[0]!.camadas[0]!.z1 === 4));
  const pr = gerar(receitaPorId('porta-retrato')!, { tamanho: '10x15', face: 'baixo' });
  const baixo = pr.itens.find((it) => it.nome === 'Moldura de baixo')!;
  ok('porta-retrato: face para baixo, desenho embutido rente', baixo.pecas.some((p) => p.nome === 'Desenho' && p.camadas[0]!.z0 === 0 && p.camadas[0]!.z1 === 0.6) && !pr.itens.some((it) => it.nome === 'Desenho'));
  const co = gerar(receitaPorId('colorir')!, { desenho: sq, desenho2: sq, desenho3: sq, tamanho: 40 });
  ok('colorir: 3 desenhos = 3 paginas', co.itens.length === 3);
}

console.log('\n== imagem colorida e ultimos parciais ==');
{
  // Dois quadrados de cores diferentes em fundo branco: duas regioes, cada uma na sua cor.
  const W = 120, H = 60, dados = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const verm = x >= 10 && x < 50 && y >= 10 && y < 50, azul = x >= 70 && x < 110 && y >= 10 && y < 50;
    dados.set(verm ? [220, 30, 30, 255] : azul ? [30, 60, 220, 255] : [255, 255, 255, 255], i);
  }
  const cs = pixelsParaCores({ largura: W, altura: H, dados }, 4);
  ok('cores: 2 regioes sem o fundo branco', cs.length === 2, cs.map((c) => c.hex).join(' '));
  const vermelha = cs.find((c) => parseInt(c.hex.slice(1, 3), 16) > 150);
  ok('cores: o quadrado vermelho com 40 x 40 px e cor certa', !!vermelha && perto(regionArea(vermelha.regiao), 1600, 80) && perto(regionBounds(vermelha.regiao).minX, 10, 1), vermelha ? `${regionArea(vermelha.regiao).toFixed(0)} px2` : '');
  // Quebra-cabeca com imagem colorida: uma cor de topo por cor da imagem.
  const regiao: Region = [...cs[0]!.regiao, ...cs[1]!.regiao];
  const des = JSON.stringify({ nome: 'c.png', regiao, cores: cs });
  const qc = gerar(receitaPorId('quebra-cabeca')!, { desenho: des, lado: 100, pecas: 4 });
  ok('quebra-cabeca: imagem de 2 cores vira 2 cores no topo', qc.itens[0]!.pecas.filter((p) => p.nome.startsWith('Cor')).length === 2 && qc.cores.length === 4, qc.cores.join(', '));
  ok('quebra-cabeca: as cores do topo vem da imagem', !!qc.hex && cs.every((c) => qc.hex!.includes(c.hex)));

  const tc = gerar(receitaPorId('topo-bolo-circular')!, { janela: 'coracao', diametro: 140, borda: 9, nome: '', numero: '' });
  const aro = tc.itens[0]!.pecas[0]!.camadas.at(-1)!.region;
  ok('topo circular: janela em coracao (o furo nao e redondo)', aro.some((q) => q.holes.some((h) => { const b = regionBounds([{ outer: h, holes: [] }]); return Math.abs(b.w - b.h) > 3; })));

  const lg0 = gerar(receitaPorId('letra-grande')!, { estilo: 'textura', engrossar: 6, texturaElevada: false, nome: '' });
  const lg1 = gerar(receitaPorId('letra-grande')!, { estilo: 'textura', engrossar: 6, texturaElevada: true, nome: '' });
  const topo = (r: Resultado) => Math.max(...r.itens[0]!.pecas.find((p) => p.nome === 'Textura')!.camadas.map((c) => c.z1));
  ok('letra grande: textura rente (22) ou em relevo (22,6)', perto(topo(lg0), 22, 1e-9) && perto(topo(lg1), 22.6, 1e-9));
  const sqN = JSON.stringify({ nome: 'n.svg', regiao: [{ outer: [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 10 }, { x: 0, y: 10 }], holes: [] }] });
  const lgN = gerar(receitaPorId('letra-grande')!, { nome: '', desenhoNome: sqN });
  ok('letra grande: nome por imagem (peca propria, deitada)', lgN.itens.some((it) => it.nome === 'Nome' && it.pecas[0]!.camadas[0]!.z0 === 0));
}

console.log('\n== cores da imagem em NFC e porta-retrato ==');
{
  const quadrado = (x: number, y: number, l: number): Region => [{ outer: [{ x, y }, { x: x + l, y }, { x: x + l, y: y + l }, { x, y: y + l }], holes: [] }];
  const a = quadrado(0, 0, 10), b = quadrado(12, 0, 10);
  const des = JSON.stringify({ nome: 'c.png', regiao: [...a, ...b], cores: [{ regiao: a, hex: '#ff0000' }, { regiao: b, hex: '#0000ff' }] });
  const nf = gerar(receitaPorId('chaveiro-nfc')!, { desenho: des, tamDesenho: 20 });
  ok('NFC: arte colorida sai em 2 partes com as cores da imagem', nf.itens[0]!.pecas.filter((p) => p.nome.startsWith('Cor')).length === 2 && !!nf.hex?.includes('#ff0000') && !!nf.hex?.includes('#0000ff'));
  const pr = gerar(receitaPorId('porta-retrato')!, { tamanho: '25x15', origem: 'imagem', desenho: des, face: 'camadas', alturaCor: 0.7, espDesenho: 3 });
  const dz = pr.itens.find((it) => it.nome === 'Desenho')!.pecas;
  const topoCor2 = dz.find((p) => p.nome === 'Cor 2')!.camadas[0]!;
  ok('porta-retrato: uma cor por camada (cor 2 na faixa de cima)', dz.length === 3 && perto(topoCor2.z1 - topoCor2.z0, 0.7, 1e-9) && perto(topoCor2.z1, 3, 1e-9));
}

console.log('\n== luminarias e string art (revisao do ChatGPT) ==');
{
  const lum = gerar(receitaPorId('luminaria-letra')!, { letra: 'A', engrossar: 4, nome: '', espTotal: 32, fundo: 4, paredeLed: 14, tampa: 1 });
  const base = lum.itens.find((it) => it.nome === 'Base')!.pecas[0]!.camadas, tampa = lum.itens.find((it) => it.nome === 'Frente')!.pecas[0]!.camadas;
  const topoBase = Math.max(...base.map((c) => c.z1));
  const alturaTampa = tampa[1]!.z1; // frente + parede (o aro entra na base)
  ok('luminaria: base 18 + tampa 14 = espessura total 32', perto(topoBase + alturaTampa, 32, 1e-9), `${topoBase} + ${alturaTampa}`);
  ok('luminaria: o aro da tampa cabe por dentro da parede da base', regionArea(intersectRegion(tampa[2]!.region, base.at(-1)!.region)) < 0.01);
  ok('luminaria: A engrossado mantem o vazado interno', base[0]!.region.some((p) => p.holes.length > 0));
  const parede = base.filter((c) => c.z0 >= 4);
  ok('luminaria: a saida do cabo corta a parede', parede.length >= 2 && regionArea(parede[0]!.region) < regionArea(parede.at(-1)!.region) - 1);
  const fora = gerar(receitaPorId('luminaria-social')!, { largura: 120, xCabo: -90 });
  ok('luminaria social: furo do cabo fora da base nao gera', fora.itens.length === 0 && fora.avisos.some((a) => a.includes('furo do cabo')));
  const brilho = gerar(receitaPorId('letra-grande')!, { estilo: 'brilho', nome: '' });
  ok('letra grande: moldura do glitter apoia o acetato por padrao', !brilho.avisos.some((a) => a.includes('acetato')));
  const sa = gerar(receitaPorId('string-art')!, { base: true, capa: true, profundidade: 10 });
  ok('string art: base com fenda e capa de envio', sa.itens.some((it) => it.nome === 'Base') && sa.itens.some((it) => it.nome === 'Capa de envio'));
  const fendaSa = sa.itens.find((it) => it.nome === 'Base')!.pecas[0]!.camadas.find((c) => c.region.length === 1 && c.region[0]!.holes.length === 0 && regionArea(c.region) < regionArea(sa.itens.find((it) => it.nome === 'Base')!.pecas[0]!.camadas[0]!.region) - 1);
  ok('string art: fenda da base com a espessura da moldura + folgas', !!fendaSa && perto(fendaSa.z1 - fendaSa.z0, 10.4, 1e-9));
}


console.log('\n== placas e listas de QR, cartoes ==');
{
  const dentroDe = (r: Region, p: { x: number; y: number }) => r.some((q) => pointInContour(q.outer, p) && !q.holes.some((h) => pointInContour(h, p)));
  /** Le o QR em relevo modulo a modulo (centro de cada modulo) e compara com a matriz do conteudo; devolve a fracao de modulos errados. */
  const errosDoQr = (r: Region, payload: string, nivel: 'M' | 'H' = 'M') => {
    const m = QRCode.create(payload, { errorCorrectionLevel: nivel }).modules, n = m.size, b = regionBounds(r), lado = b.w / n;
    let erros = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (dentroDe(r, { x: b.minX + (j + 0.5) * lado, y: b.maxY - (i + 0.5) * lado }) !== !!m.get(i, j)) erros++;
    return erros / (n * n);
  };
  const qrDa = (res: Resultado, item = 0, nome = 'QR Code') => res.itens[item]!.pecas.find((p) => p.nome === nome)!.camadas[0]!.region;
  const google = gerar(placaGoogleReview, { link: 'https://g.page/r/teste/review' });
  ok('google: QR em relevo le o link (modulo a modulo)', errosDoQr(qrDa(google), 'https://g.page/r/teste/review') === 0);
  ok('google: estrelas (logo) e texto em pecas proprias', google.itens[0]!.pecas.some((p) => p.nome === 'Logo') && google.itens[0]!.pecas.some((p) => p.nome === 'Texto'));
  const zTopo = Math.max(...google.itens[0]!.pecas.filter((p) => p.nome !== 'Base').map((p) => p.camadas[0]!.z0));
  ok('google: relevos apoiados na placa', zTopo === 3);
  const social = gerar(placaQrSocial, { rede: 'tiktok', handle: '@scarprint' });
  ok('social: @ vira o endereco do perfil', urlDoPerfil('tiktok', '@scarprint') === 'https://www.tiktok.com/@scarprint' && errosDoQr(qrDa(social), 'https://www.tiktok.com/@scarprint') === 0);
  ok('social: outra rede pede URL completa', /URL completa/.test(gerar(placaQrSocial, { rede: 'outra', handle: '@x' }).avisos.join()));
  const svg = JSON.stringify({ nome: 'c.svg', regiao: circulo(0, 0, 5, 64) });
  const comLogo = gerar(placaQrLogo, { desenho: svg, posLogo: 'centro', link: 'https://scarprint.com.br' });
  const errosLogo = errosDoQr(qrDa(comLogo), payloadUrl('https://scarprint.com.br'), 'H');
  ok('qr com logo no meio: modulos tirados cabem na correcao H (< 15%)', errosLogo > 0.02 && errosLogo < 0.15, `${(errosLogo * 100).toFixed(1)}%`);
  const lb = regionBounds(comLogo.itens[0]!.pecas.find((p) => p.nome === 'Logo')!.camadas[0]!.region), qb = regionBounds(qrDa(comLogo));
  ok('qr com logo no meio: logo centrado no QR', perto((lb.minX + lb.maxX) / 2, (qb.minX + qb.maxX) / 2, 0.05) && perto((lb.minY + lb.maxY) / 2, (qb.minY + qb.maxY) / 2, 0.05));
  const logoMenor = gerar(placaQrLogo, { desenho: svg, posLogo: 'centro', altLogo: 8, link: 'https://scarprint.com.br' });
  ok('qr com logo no meio: altura do logo altera a peca', regionArea(logoMenor.itens[0]!.pecas.find((p) => p.nome === 'Logo')!.camadas[0]!.region) < regionArea(comLogo.itens[0]!.pecas.find((p) => p.nome === 'Logo')!.camadas[0]!.region));
  ok('qr com logo acima: QR com correcao normal sem erro', errosDoQr(qrDa(gerar(placaQrLogo, { desenho: svg, link: 'https://scarprint.com.br' })), payloadUrl('https://scarprint.com.br')) === 0);
  const pixV = { chavePix: '123e4567-e12b-12d1-a456-426655440000', nomePix: 'Fulano de Tal', cidadePix: 'BRASILIA' };
  const pixPayload = gerarPixEstatico({ chave: pixV.chavePix, nome: pixV.nomePix, cidade: pixV.cidadePix });
  ok('pix logo: QR le o BR Code oficial', errosDoQr(qrDa(gerar(placaPixLogo, pixV)), pixPayload) === 0);
  const pixT = gerar(placaPixTexto, { ...pixV, linha3: 'OBRIGADO' });
  ok('pix texto: QR le o BR Code e as linhas ficam acima', errosDoQr(qrDa(pixT), pixPayload) === 0 && regionBounds(pixT.itens[0]!.pecas.find((p) => p.nome === 'Texto')!.camadas[0]!.region).maxY > regionBounds(qrDa(pixT)).maxY);
  ok('pix sem chave nao gera', placaPixLogo.gerar(valoresPadrao(placaPixLogo), ctx).itens.length === 0 && placaPixTexto.gerar(valoresPadrao(placaPixTexto), ctx).itens.length === 0);
  const svgLogo = JSON.stringify({ nome: 'q.svg', regiao: [{ outer: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }], holes: [] }] });
  const todosQr = { usar_link2: true, usar_wifi: true, senhaWifi: 'abc12345', usar_tiktok: true, usar_youtube: true, usar_pix: true, ...pixV, usar_google: true };
  const vert = gerar(listaQrVertical, { usar_wifi: true, senhaWifi: 'abc12345' }), hor = gerar(listaQrHorizontal, { usar_wifi: true, senhaWifi: 'abc12345' });
  const bv = regionBounds(regiaoDe(vert, 0, 'Placa')), bh = regionBounds(regiaoDe(hor, 0, 'Placa'));
  ok('lista: URLs proprias, vertical alta e horizontal larga', listaQrVertical.id !== listaQrHorizontal.id && bv.h > bv.w && bh.w > bh.h, `${bv.w.toFixed(0)}x${bv.h.toFixed(0)} / ${bh.w.toFixed(0)}x${bh.h.toFixed(0)}`);
  ok('lista: placa + suporte, icones em peca e cor proprias', vert.itens.length === 2 && vert.itens[0]!.pecas.some((p) => p.nome === 'Ícones e nome') && vert.cores.includes('Suporte'));
  const qrsV = regiaoDe(vert, 0, 'QR Code'), icV = regiaoDe(vert, 0, 'Ícones e nome');
  ok('lista: icones nao invadem o QR', regionArea(intersectRegion(icV, contornar(qrsV, 0.5))) < 0.01);
  const comLogoWifi = gerar(listaQrVertical, { usar_wifi: true, senhaWifi: 'abc12345', logo_wifi: svgLogo });
  ok('lista: logo proprio no lugar do icone de um QR', Math.abs(regionArea(regiaoDe(comLogoWifi, 0, 'Ícones e nome')) - regionArea(icV)) > 1);
  const maior = gerar(listaQrVertical, { usar_wifi: true, senhaWifi: 'abc12345', tamIcone_wifi: 34 });
  ok('lista: tamanho do icone por QR', regionArea(regiaoDe(maior, 0, 'Ícones e nome')) > regionArea(icV));
  ok('lista: nome escrito no lugar do icone', regionArea(regiaoDe(gerar(listaQrVertical, { marca: 'nome' }), 0, 'Ícones e nome')) > 1);
  ok('lista: 9 QR ligados geram sem aviso', gerar(listaQrVertical, todosQr).avisos.length === 0, gerar(listaQrVertical, todosQr).avisos.join(' | '));
  const pixPequeno = gerar(listaQrVertical, { usar_pix: true, ...pixV, tamQr: 30 });
  ok('lista: QR pequeno demais para o Pix bloqueia exportacao e diz qual', pixPequeno.itens.length === 0 && /Pix: .*módulos/.test(pixPequeno.avisos.join()));
  const notaFenda = (r: Resultado) => Number((r.notas ?? []).join(' ').match(/Fenda do suporte: ([\d,]+) mm/)?.[1]?.replace(',', '.'));
  ok('lista: fenda do suporte = placa + relevo da borda + 0,5 mm', perto(notaFenda(vert), 2.8 + 0.6 + 0.5, 0.001), String(notaFenda(vert)));
  const zMaxQr = Math.min(...vert.itens[0]!.pecas.filter((p) => p.nome === 'QR Code' || p.nome === 'Ícones e nome').map((p) => regionBounds(p.camadas[0]!.region).minY));
  ok('lista: nada impresso dentro da fenda do suporte', zMaxQr - bv.minY >= 10, (zMaxQr - bv.minY).toFixed(1));
  const cam = gerar(listaQrCamadas, { usar_pix: true, ...pixV });
  ok('lista em camadas: tabua, placa dos QR e suporte, cada um com cor propria', cam.itens.length === 3 && cam.cores.length === 7, `${cam.itens.map((i) => i.nome).join(', ')} / ${cam.cores.join(', ')}`);
  const tab = cam.itens.find((i) => i.nome === 'Tábua de fundo')!, pq = cam.itens.find((i) => i.nome === 'Placa dos QR')!;
  ok('lista em camadas: nome na tabua, icones e QR na placa', tab.pecas.some((p) => p.nome === 'Nome da tábua') && pq.pecas.some((p) => p.nome === 'Ícones') && pq.pecas.some((p) => p.nome === 'QR Code'));
  ok('lista em camadas: fenda pega tabua + placa + borda', perto(notaFenda(cam), 2 + 2 + 0.6 + 0.5, 0.001), String(notaFenda(cam)));
  const corDe = (r: Resultado, peca: string) => r.hex![r.itens.flatMap((i) => i.pecas).find((p) => p.nome === peca)!.cor];
  const outraCor = gerar(listaQrCamadas, { usar_pix: true, ...pixV, corFundo: '#123456', corLogo: '#00ff00' });
  ok('lista em camadas: cor da tabua e dos icones mudam sozinhas', corDe(outraCor, 'Tábua de fundo') === '#123456' && corDe(outraCor, 'Ícones') === '#00ff00' && corDe(outraCor, 'QR Code') === '#4a1f2e');
  const socialTres = gerar(placaQrSocial, { perfil2: true, perfil3: true });
  ok('social: tres perfis, tres placas', socialTres.itens.filter((i) => i.nome.startsWith('Placa')).length === 3);
  const socialPes = gerar(placaQrSocial, { montagem: 'suporte' });
  ok('social: pes de mesa', socialPes.itens.filter((i) => i.nome.startsWith('Pé')).length === 2);
  const logoPes = gerar(placaQrLogo, { desenho: svg, montagem: 'suporteFuro' });
  const pe = logoPes.itens.find((i) => i.nome.startsWith('Pé'))!.pecas[0]!.camadas[0]!.region;
  ok('qr com logo: pes com furo de fixacao', logoPes.itens.length === 3 && regionArea(pe) < 45 * 50 - 24 * 4 - 20);
  const fendaPe = (logoPes.notas ?? []).join(' ').match(/A fenda tem ([\d,]+) mm/)?.[1];
  ok('qr com logo: fenda dos pes conta a borda em relevo', fendaPe === (3 + 0.6 + 0.5).toLocaleString('pt-BR'), fendaPe);
  ok('cores: pouco contraste entre QR e base avisa', /contraste/.test(gerar(placaGoogleReview, { corQr: '#4a1f2e', corBase: '#5a2f3e' }).avisos.join()));
  const soc = gerar(socialComQr);
  const baseSoc = regiaoDe(soc, 0, 'Base');
  ok('@social com QR: base inteira e QR dentro dela', baseSoc.length === 1 && regionArea(diffRegion(regiaoDe(soc, 0, 'Topo e QR'), baseSoc)) < 0.01 && !soc.avisos.length, soc.avisos.join());
  ok('@social com QR: largura alvo', perto(regionBounds(baseSoc).w, 190, 2), regionBounds(baseSoc).w.toFixed(1));
  const enc = gerar(socialComQr, { montagem: 'encaixe' });
  ok('@social com QR encaixado: rebaixo com folga na base', enc.itens[0]!.pecas[0]!.camadas.length > 1);
  const cv = gerar(cartaoVisita), cb = regionBounds(regiaoDe(cv, 0, 'Cartão'));
  ok('cartao: 90x50 com porta-cartoes', perto(cb.w, 90, 0.01) && perto(cb.h, 50, 0.01) && cv.itens.length === 2);
  const frente = regiaoDe(cv, 0, 'Frente');
  ok('cartao: frente dentro do cartao', regionArea(diffRegion(frente, regiaoDe(cv, 0, 'Cartão'))) < 0.01);
  const baixo = gerar(cartaoVisita, { face: 'baixo' });
  const fb = baixo.itens[0]!.pecas.find((p) => p.nome === 'Frente')!.camadas[0]!;
  ok('cartao face para baixo: frente na mesa, com a mesma area', fb.z0 === 0 && perto(regionArea(fb.region), regionArea(frente), 1));
  const ct = gerar(cartaoTecido, { nfc: true });
  const capa = ct.itens[0]!.pecas.find((p) => p.nome === 'Capa do NFC');
  ok('cartao com tecido: pausa para o tecido e para o NFC', (ct.notas ?? []).length >= 2 && !!capa && !ct.avisos.length, ct.avisos.join());
  ok('cartao com tecido: NFC no lugar do QR, sem tocar o texto', regionArea(intersectRegion(capa!.camadas[0]!.region, contornar(ct.itens[0]!.pecas.find((p) => p.nome === 'Texto e QR')!.camadas[0]!.region, 0.3))) < 0.01);
  console.log('\n== leitura real dos QR (vista de cima nas cores das pecas + decodificador) ==');
  const luzDe = (hex: string) => { const n = parseInt(hex.replace('#', ''), 16); return Math.round(0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)); };
  /** Pinta uma regiao na imagem (preenchimento par-impar por linha). */
  const pintar = (img: Uint8ClampedArray, W: number, H: number, x0: number, y1: number, s: number, r: Region, cinza: number) => {
    const arestas: number[][] = [];
    for (const p of r) for (const c of [p.outer, ...p.holes]) for (let i = 0; i < c.length; i++) { const a = c[i]!, b = c[(i + 1) % c.length]!; arestas.push([a.x, a.y, b.x, b.y]); }
    for (let row = 0; row < H; row++) {
      const y = y1 - (row + 0.5) / s, xs: number[] = [];
      for (const [ax, ay, bx, by] of arestas) if ((ay! <= y) !== (by! <= y)) xs.push(ax! + ((y - ay!) / (by! - ay!)) * (bx! - ax!));
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const c0 = Math.max(0, Math.ceil((xs[k]! - x0) * s - 0.5)), c1 = Math.min(W - 1, Math.floor((xs[k + 1]! - x0) * s - 0.5));
        for (let c = c0; c <= c1; c++) { const o = (row * W + c) * 4; img[o] = img[o + 1] = img[o + 2] = cinza; }
      }
    }
  };
  /** Le todos os QR de um item: acha cada QR (grupos da peca de QR) e decodifica a vista de cima em volta dele. */
  const lerItem = (res: Resultado, item: number, opc: { espelhar?: boolean; soPecas?: string[]; nomeQr?: string } = {}) => {
    const it = res.itens[item]!;
    const espelha = (r: Region) => (opc.espelhar ? espelharX(r) : r);
    const qrPeca = it.pecas.find((p) => p.nome === (opc.nomeQr ?? 'QR Code'))!;
    const polis = espelha(qrPeca.camadas.map((c) => c.region).flat());
    // Agrupa os pedacos do QR pelo tamanho do modulo (o menor pedaco solto e um modulo): ate 3 modulos de vao = mesmo codigo.
    const caixas = polis.map((p) => regionBounds([p]));
    const mod = Math.min(...caixas.map((c) => Math.max(c.w, c.h))), d = 1.5 * mod;
    const grupo = caixas.map((_, i) => i);
    const raiz = (i: number): number => (grupo[i] === i ? i : (grupo[i] = raiz(grupo[i]!)));
    for (let i = 0; i < caixas.length; i++) for (let j = i + 1; j < caixas.length; j++) {
      const a = caixas[i]!, b = caixas[j]!;
      if (a.minX - d < b.maxX + d && b.minX - d < a.maxX + d && a.minY - d < b.maxY + d && b.minY - d < a.maxY + d) grupo[raiz(i)] = raiz(j);
    }
    const lidos: string[] = [];
    const pecas = [...it.pecas].filter((p) => !opc.soPecas || opc.soPecas.includes(p.nome)).sort((a, b) => Math.max(...a.camadas.map((c) => c.z1)) - Math.max(...b.camadas.map((c) => c.z1)));
    const frente = (p: Peca) => (opc.espelhar ? p.camadas.filter((c) => c.z0 === Math.min(...p.camadas.map((d) => d.z0))) : p.camadas);
    for (const g of new Set(caixas.map((_, i) => raiz(i)))) {
      const b = regionBounds(polis.filter((_, i) => raiz(i) === g));
      const m = 6, s = 8, x0 = b.minX - m, y1 = b.maxY + m, W = Math.ceil((b.w + 2 * m) * s), H = Math.ceil((b.h + 2 * m) * s);
      const img = new Uint8ClampedArray(W * H * 4).fill(255);
      const ordem = opc.espelhar ? [...pecas].reverse() : pecas;
      for (const p of ordem) for (const c of frente(p)) pintar(img, W, H, x0, y1, s, espelha(c.region), luzDe(res.hex![p.cor]!));
      // Como a camera do celular: tenta normal e invertido (QR claro em fundo escuro).
      const inv = new Uint8ClampedArray(img.length);
      for (let k = 0; k < img.length; k += 4) { inv[k] = inv[k + 1] = inv[k + 2] = 255 - img[k]!; inv[k + 3] = 255; }
      const r = jsQR(img, W, H, { inversionAttempts: 'dontInvert' }) ?? jsQR(inv, W, H, { inversionAttempts: 'dontInvert' });
      if (r) lidos.push(r.data);
    }
    return lidos;
  };
  const confere = (nome: string, lidos: string[], esperados: string[]) =>
    ok(`leitura: ${nome}`, lidos.length === esperados.length && [...lidos].sort().join('\n') === [...esperados].sort().join('\n'), `leu ${lidos.length}/${esperados.length}: ${lidos.map((l) => l.slice(0, 40)).join(' | ')}`);
  const exemplo = (r: Receita) => FICHAS.find((f) => f.id === r.id)!.exemplo!;
  const g = gerar(placaGoogleReview, exemplo(placaGoogleReview));
  confere('avaliacao Google (QR claro em fundo escuro)', lerItem(g, 0), [payloadUrl(String(exemplo(placaGoogleReview).link))]);
  const so = gerar(placaQrSocial, exemplo(placaQrSocial));
  confere('social, 3 placas', [0, 1, 2].flatMap((i) => lerItem(so, i)), ['instagram', 'tiktok', 'youtube'].map((r) => urlDoPerfil(r, '@scarprint')));
  confere('QR com logo acima', lerItem(gerar(placaQrLogo, { desenho: svg }), 0), [payloadUrl('https://scarprint.com.br')]);
  confere('QR com logo no meio, logo da cor do QR', lerItem(gerar(placaQrLogo, { desenho: svg, posLogo: 'centro' }), 0), [payloadUrl('https://scarprint.com.br')]);
  confere('QR com logo no meio, logo de outra cor', lerItem(gerar(placaQrLogo, { desenho: svg, posLogo: 'centro', corLogo: '#ff0000' }), 0), [payloadUrl('https://scarprint.com.br')]);
  const pl = lerItem(gerar(placaPixLogo, pixV), 0);
  confere('Pix com logo = BR Code oficial', pl, [pixPayload]);
  ok('leitura: Pix lido tem CRC valido', pl.length === 1 && pl[0]!.endsWith(crc16Ccitt(pl[0]!.slice(0, -4))));
  const logoGrande = gerar(placaQrLogo, { desenho: svg, posLogo: 'centro', altLogo: 150 });
  confere('logo no meio pedido enorme: reduzido e ainda le', lerItem(logoGrande, 0), [payloadUrl('https://scarprint.com.br')]);
  ok('logo no meio pedido enorme: avisa a reducao', /reduzido/.test(logoGrande.avisos.join()));
  let menor = 70;
  while (menor > 30 && gerar(listaQrVertical, { usar_link1: false, usar_whatsapp: false, usar_instagram: false, usar_pix: true, ...pixV, tamQr: menor - 1 }).itens.length) menor--;
  confere(`Pix no menor QR aceito (${menor} mm)`, lerItem(gerar(listaQrVertical, { usar_link1: false, usar_whatsapp: false, usar_instagram: false, usar_pix: true, ...pixV, tamQr: menor }), 0), [pixPayload]);
  confere('Pix com texto', lerItem(gerar(placaPixTexto, { ...pixV, linha3: 'OBRIGADO' }), 0), [pixPayload]);
  const todos = { usar_link2: true, usar_wifi: true, senhaWifi: 'abc12345', usar_tiktok: true, usar_youtube: true, usar_pix: true, ...pixV, usar_google: true };
  const esperadosLista = [
    payloadUrl('https://scarprint.com.br'), payloadUrl('https://scarprint.com.br/pecas'), payloadWifi('Minha rede', 'abc12345', 'WPA'), payloadWhatsapp('+5511999999999', ''),
    ...['instagram', 'tiktok', 'youtube'].map((r) => urlDoPerfil(r, '@scarprint')), pixPayload, payloadUrl('https://g.page/r/SEU-CODIGO/review'),
  ];
  confere('lista vertical com os 9 QR', lerItem(gerar(listaQrVertical, todos), 0), esperadosLista);
  confere('lista horizontal com os 9 QR', lerItem(gerar(listaQrHorizontal, todos), 0), esperadosLista);
  const camR = gerar(listaQrCamadas, todos);
  confere('lista em camadas com os 9 QR', lerItem(camR, camR.itens.findIndex((i) => i.nome === 'Placa dos QR')), esperadosLista);
  confere('Wi-Fi de rede oculta', lerItem(gerar(listaQrVertical, { usar_link1: false, usar_whatsapp: false, usar_instagram: false, usar_wifi: true, senhaWifi: 'abc12345', wifiOculta: true }), 0), [payloadWifi('Minha rede', 'abc12345', 'WPA').replace(/;;$/, ';H:true;;')]);
  confere('@social de 2 cores com QR', lerItem(gerar(socialComQr), 0, { nomeQr: 'Topo e QR' }), [payloadUrl('https://instagram.com/scarprint')]);
  confere('cartao de visita (QR de 0,6 mm por modulo)', lerItem(gerar(cartaoVisita), 0, { nomeQr: 'Frente' }), [payloadUrl('https://scarprint.com.br')]);
  confere('cartao face para baixo, visto pela face da mesa', lerItem(gerar(cartaoVisita, { face: 'baixo' }), 0, { nomeQr: 'Frente', espelhar: true }), [payloadUrl('https://scarprint.com.br')]);
  confere('cartao com tecido (tecido branco)', lerItem(gerar(cartaoTecido), 0, { nomeQr: 'Texto e QR', soPecas: ['Texto e QR'] }), [payloadUrl('https://scarprint.com.br')]);
}

console.log('\n== planta 2D (vista de cima) ==');
{
  const lote = gerar(receitaPorId('chaveiro-nome')!, { nomes: 'Ana, Pedro, Lu' });
  const { fatias, limites } = fatiasDaPlanta(lote);
  const nome = (f: (typeof fatias)[number]) => lote.itens[f.item]!.pecas[f.peca]!.nome;
  ok('planta: fatias de baixo para cima', fatias.every((f, i) => !i || fatias[i - 1]!.z1 <= f.z1));
  ok('planta: a base é pintada primeiro e o topo por último', nome(fatias[0]!) === 'Base' && nome(fatias.at(-1)!) === 'Topo', `${nome(fatias[0]!)} … ${nome(fatias.at(-1)!)}`);
  const cs = lote.itens.map(caixaDoItem);
  const junto = { minX: Math.min(...cs.map((c) => c.minX)), minY: Math.min(...cs.map((c) => c.minY)), maxX: Math.max(...cs.map((c) => c.maxX)), maxY: Math.max(...cs.map((c) => c.maxY)) };
  ok('planta: limites = os três chaveiros juntos', perto(limites.minX, junto.minX, 1e-6) && perto(limites.minY, junto.minY, 1e-6) && perto(limites.maxX, junto.maxX, 1e-6) && perto(limites.maxY, junto.maxY, 1e-6));
  const topo = lote.itens[1]!.pecas.findIndex((p) => p.nome === 'Topo');
  ok('planta: medida de uma peça só', perto(limitesDaPeca(lote, 1, topo).w, regionBounds(regiaoDe(lote, 1, 'Topo')).w, 1e-6));
  const cortador = gerar(receitaPorId('cortador-biscoito')!, { forma: 'circulo', tamanho: 60 });
  const camadas = cortador.itens.reduce((n, it) => n + it.pecas.reduce((m, p) => m + p.camadas.filter((c) => c.region.length).length, 0), 0);
  ok('planta: peça em degraus entra com todas as camadas', fatiasDaPlanta(cortador).fatias.length === camadas && camadas > 2, `${camadas} camadas`);
}

console.log('\n== peca montada (vitrine da loja) ==');
{
  const zs = (r: Resultado, peca: string) => r.itens[0]!.pecas.find((p) => p.nome === peca)!.camadas.map((c) => [c.z0, c.z1]);
  const topoDe = (r: Resultado, peca: string) => Math.max(...zs(r, peca).map((z) => z[1]!));
  const baseDe = (r: Resultado, peca: string) => Math.min(...zs(r, peca).map((z) => z[0]!));
  const lg = receitaPorId('letra-grande')!;
  for (const estilo of ['nome', 'resina', 'textura', 'material', 'brilho']) {
    const mesa = gerar(lg, { estilo }), pronta = gerar(lg, { estilo, montado: true });
    const pecas = pronta.itens[0]?.pecas.map((p) => p.nome) ?? [];
    ok(`letra grande (${estilo}): mesa com itens soltos, montada num item só e sem molde`, mesa.itens.length > 1 && pronta.itens.length === 1 && !pecas.includes('Molde') && pecas.includes('Nome'), `${mesa.itens.length} -> ${pronta.itens.length}: ${pecas.join(', ')}`);
  }
  const nome = gerar(lg, { montado: true }), E = Number(valoresPadrao(lg).espLetra), p = Number(valoresPadrao(lg).rebaixo);
  ok('letra grande montada: o nome assenta no rebaixo', perto(baseDe(nome, 'Nome'), E - p, 1e-6), `${baseDe(nome, 'Nome')} (rebaixo em ${E - p})`);
  const brilho = gerar(lg, { estilo: 'brilho', montado: true });
  ok('letra grande com glitter montada: a moldura da frente fecha o topo da letra', perto(topoDe(brilho, 'Moldura da frente'), E, 1e-6) && perto(baseDe(brilho, 'Nome'), E, 1e-6));
  const lum = receitaPorId('luminaria-letra')!, vl = valoresPadrao(lum);
  const lm = gerar(lum, { montado: true }), H = Number(vl.espTotal), topoBase = Number(vl.fundo) + Number(vl.paredeLed);
  ok('luminária montada: um item, tampa virada com a face no topo e o nome colado nela', lm.itens.length === 1 && perto(topoDe(lm, 'Frente'), H, 1e-6) && perto(baseDe(lm, 'Nome'), H, 1e-6), `frente até ${topoDe(lm, 'Frente')}, nome de ${baseDe(lm, 'Nome')}`);
  ok('luminária montada: a parede da tampa assenta na parede da base e o aro entra nela', zs(lm, 'Frente').some((z) => perto(z[0]!, topoBase, 1e-6)) && baseDe(lm, 'Frente') < topoBase);
  ok('luminária sem montar continua com as peças soltas para imprimir', gerar(lum).itens.length >= 2);
  const soc = receitaPorId('luminaria-social')!, vs = valoresPadrao(soc);
  const sm = gerar(soc, { montado: true });
  ok('luminária @social montada: a frente entra no topo da parede de fora', sm.itens.length === 1 && perto(topoDe(sm, 'Frente'), Number(vs.profundidade), 1e-6) && perto(topoDe(sm, 'Letras'), Number(vs.profundidade), 1e-6));
  const guia = receitaPorId('texto-com-guia')!;
  const comGuia = gerar(guia), naParede = gerar(guia, { montado: true });
  ok('letras de parede montadas: só as letras, no lugar da palavra (a guia sai)', comGuia.itens.some((i) => i.nome.startsWith('Guia')) && naParede.itens.length > 0 && !naParede.itens.some((i) => i.nome.startsWith('Guia')) && naParede.itens.length === comGuia.itens.filter((i) => !i.nome.startsWith('Guia')).length);
}

console.log('\n== cofrinho com nome ==');
{
  const cf = receitaPorId('cofrinho-nome')!, vc = valoresPadrao(cf);
  const parede = Number(vc.parede), folga = Number(vc.folga);
  const mesa = gerar(cf), pronto = gerar(cf, { montado: true }), lisa = gerar(cf, { textura: 'lisa' });
  const peca = (r: Resultado, nome: string) => r.itens.flatMap((i) => i.pecas).find((p) => p.nome === nome)!;
  ok('cofrinho: na mesa sai corpo, costas, letras e tampinha soltos; montado num item só', mesa.itens.map((i) => i.nome).join(',') === 'Corpo,Costas,Letras,Tampinha' && pronto.itens.length === 1 && pronto.itens[0]!.pecas.length === 4);
  // Na mesa o corpo sai espelhado (imprime de frente e depois é virado): os encaixes se conferem com ele desvirado.
  const corpo = peca(mesa, 'Corpo').camadas.map((c) => ({ ...c, region: scaleRegion(c.region, -1, 1) })), H = Math.max(...corpo.map((c) => c.z1));
  ok('cofrinho: na mesa o corpo sai espelhado, para a frente ficar certa quando ele for virado', regionArea(diffRegion(peca(mesa, 'Corpo').camadas[0]!.region, corpo[0]!.region)) > 10 && perto(regionArea(peca(mesa, 'Corpo').camadas[0]!.region), regionArea(corpo[0]!.region), 0.01));
  const S = corpo[1]!.region, bS = regionBounds(S);
  const furosNaParede = corpo.slice(2).map((c) => ({ meio: (c.z0 + c.z1) / 2, furos: c.region.reduce((s, q) => s + q.holes.length, 0) }));
  const zF0 = 2.4 + (H - 2.4 - 4) / 2, zF1 = zF0 + 4;
  const naFenda = furosNaParede.filter((f) => f.meio > zF0 && f.meio < zF1);
  ok('cofrinho: a fenda atravessa a parede de cima no meio da profundidade (o anel abre)', naFenda.length > 0 && naFenda.every((f) => f.furos === 0) && furosNaParede.filter((f) => f.meio < zF0 || f.meio > zF1).every((f) => f.furos === 1), naFenda.map((f) => f.furos).join(','));
  const aba = peca(mesa, 'Costas').camadas[2]!.region, bA = regionBounds(aba);
  ok('cofrinho: a aba das costas entra na parede com a folga', perto(bS.w - bA.w, 2 * (parede + folga), 0.05), `${(bS.w - bA.w).toFixed(3)} mm de ${2 * (parede + folga)}`);
  const larguras = new Set(corpo.slice(2).map((c) => regionBounds(c.region).w.toFixed(2)));
  ok('cofrinho: a parede canelada alterna dois contornos; a lisa tem um só', larguras.size === 2 && new Set(peca(lisa, 'Corpo').camadas.slice(2).map((c) => regionBounds(c.region).w.toFixed(2))).size === 1, [...larguras].join(' / '));
  const zP = (nome: string) => pronto.itens[0]!.pecas.find((p) => p.nome === nome)!.camadas;
  ok('cofrinho montado: letras no rebaixo da frente, costas fechando atrás e a tampinha no furo delas', perto(Math.min(...zP('Letras').map((c) => c.z0)), H - 1, 1e-6) && perto(Math.min(...zP('Costas').map((c) => c.z0)), -1.6, 1e-6) && perto(Math.min(...zP('Tampinha').map((c) => c.z0)), -3.2, 1e-6) && perto(Math.max(...zP('Corpo').map((c) => c.z1)), H, 1e-6));
  const furoCostas = zP('Costas')[1]!.region.flatMap((q) => q.holes).map((h) => regionBounds([{ outer: h, holes: [] }]));
  const pino = regionBounds(zP('Tampinha')[1]!.region);
  ok('cofrinho: a moeda passa no furo das costas e o pino da tampinha entra nele com a folga', furoCostas.length === 1 && furoCostas[0]!.w >= 29 && perto(furoCostas[0]!.w - pino.w, 2 * folga, 0.05), furoCostas.map((b) => b.w.toFixed(2)).join(', ') + ` / pino ${pino.w.toFixed(2)}`);
  ok('cofrinho: o furo não corta a aba das costas', regionArea(intersectRegion(zP('Costas')[2]!.region, zP('Tampinha')[1]!.region)) < 0.01);
  const letras = zP('Letras')[0]!.region, rebaixo = peca(pronto, 'Corpo').camadas[0]!.region;
  ok('cofrinho: as letras cabem no rebaixo com folga', regionArea(diffRegion(letras, diffRegion(S, rebaixo))) < 0.5 && regionArea(intersectRegion(letras, rebaixo)) < 0.5);
  const faixaX = (x0: number, x1: number): Region => [{ outer: [{ x: x0, y: bS.minY - 1 }, { x: x1, y: bS.minY - 1 }, { x: x1, y: bS.maxY + 1 }, { x: x0, y: bS.maxY + 1 }], holes: [] }];
  const apoioDe = zP('Letras')[0]!.region.map((q) => { const b = regionBounds([q]); return regionBounds(intersectRegion(S, faixaX(b.minX, b.maxX))).minY - bS.minY; });
  const contato = S.flatMap((q) => q.outer).filter((pt) => pt.y < bS.minY + 0.3).map((pt) => pt.x);
  ok('cofrinho: todas as letras apoiam na mesma linha e os apoios abrem mais de 60% da largura (fica em pé)', apoioDe.every((d) => d < 0.3) && Math.max(...contato) - Math.min(...contato) > bS.w * 0.6, apoioDe.map((d) => d.toFixed(2)).join(' / '));
  const longo = gerar(cf, { nome: 'Maria Eduarda' });
  ok('cofrinho: nome comprido diminui para caber na largura e avisa', regionBounds(peca(longo, 'Corpo').camadas[1]!.region).w <= Number(vc.largura) + 0.5 && longo.avisos.some((a) => /não cabe/.test(a)));
}

console.log('\n== ima com nome ==');
{
  const im = receitaPorId('ima-nome')!, vi = valoresPadrao(im);
  const furosDe = (r: Resultado, i: number) => {
    const base = r.itens[i]!.pecas.find((p) => p.nome === 'Base')!.camadas;
    return { abaixo: base[0]!.region.flatMap((q) => q.holes), acima: base[1]?.region.flatMap((q) => q.holes) ?? [], prof: base[0]!.z1, topo: Math.max(...base.map((c) => c.z1)) };
  };
  const padrao = gerar(im);
  const f = furosDe(padrao, 0), diam = regionBounds([{ outer: f.abaixo[0] ?? [], holes: [] }]).w;
  ok('ímã: cada nome sai com a cavidade aberta por baixo, no diâmetro do ímã com folga', padrao.itens.length === 2 && f.abaixo.length >= 1 && f.acima.length === 0 && perto(diam, Number(vi.imaDiametro) + 0.4, 0.05), `${f.abaixo.length} cavidade(s), ${diam.toFixed(2)} mm`);
  ok('ímã: a cavidade tem a espessura do ímã e sobra chão por cima', perto(f.prof, Number(vi.imaEspessura) + 0.2, 1e-6) && f.topo - f.prof >= 0.6, `${f.prof} de ${f.topo} mm`);
  const curto = furosDe(gerar(im, { nomes: 'Ana' }), 0).abaixo.length, longo = furosDe(gerar(im, { nomes: 'Maria Eduarda' }), 0).abaixo.length;
  ok('ímã: nome curto leva 1 ímã e nome comprido leva mais', curto === 1 && longo >= 2, `${curto} / ${longo}`);
  ok('ímã: base fina demais avisa', gerar(im, { espBase: 2 }).avisos.some((a) => /fina para o ímã/.test(a)));
}

console.log('\n== etiqueta de planta ==');
{
  const ep = receitaPorId('etiqueta-planta')!, ve = valoresPadrao(ep);
  const r = gerar(ep), it = r.itens[0]!;
  const espeto = it.pecas.find((p) => p.nome === 'Espeto')!.camadas[0]!, letras = it.pecas.find((p) => p.nome === 'Letras')!.camadas[0]!;
  const bE = regionBounds(espeto.region), bL = regionBounds(letras.region);
  ok('etiqueta de planta: um por nome, espeto e letras em 2 cores', r.itens.length === 2 && it.pecas.length === 2 && r.cores.length === 2);
  ok('etiqueta de planta: o espeto desce o comprimento pedido abaixo das letras', bL.minY - bE.minY >= Number(ve.comprimento) && bE.minY < bL.minY, `${(bL.minY - bE.minY).toFixed(1)} mm`);
  const ponta = espeto.region.flatMap((q) => q.outer).filter((pt) => pt.y < bE.minY + 0.5);
  ok('etiqueta de planta: o espeto termina em ponta', ponta.length >= 1 && Math.max(...ponta.map((pt) => pt.x)) - Math.min(...ponta.map((pt) => pt.x)) < 1);
  ok('etiqueta de planta: as letras apoiam na travessa (encostam) e são mais altas que ela', regionArea(intersectRegion(contornar(letras.region, 0.05), espeto.region)) > 1 && letras.z1 > espeto.z1);
}

console.log('\n== marcador de taca ==');
{
  const mt = receitaPorId('marcador-taca')!, vm = valoresPadrao(mt);
  const r = gerar(mt), base = r.itens[0]!.pecas.find((p) => p.nome === 'Base')!.camadas[0]!.region, topo = r.itens[0]!.pecas.find((p) => p.nome === 'Topo')!.camadas[0]!.region;
  const bB = regionBounds(base), bT = regionBounds(topo);
  ok('marcador de taça: um por nome, o nome de cima para baixo (mais alto que largo)', r.itens.length === 3 && bT.h > bT.w * 2, `${bT.w.toFixed(1)} x ${bT.h.toFixed(1)} mm`);
  const xHaste = bT.minX - 1.2 + Number(vm.larguraGancho) / 2;
  const naHaste = regionArea(intersectRegion(base, [{ outer: [{ x: xHaste - 0.5, y: bT.minY }, { x: xHaste + 0.5, y: bT.minY }, { x: xHaste + 0.5, y: bT.maxY }, { x: xHaste - 0.5, y: bT.maxY }], holes: [] }]));
  ok('marcador de taça: a haste corre pelo pé de todas as letras, do lado do vidro', perto(naHaste, bT.h, bT.h * 0.01), `${naHaste.toFixed(1)} de ${bT.h.toFixed(1)}`);
  ok('marcador de taça: a base é uma peça só (letras unidas) e o gancho sobe acima das letras', base.length === 1 && bB.maxY > bT.maxY + Number(vm.alturaGancho) * 0.8);
  const yPerna = bB.maxY - Number(vm.larguraGancho) - Number(vm.abertura) / 2 - 2;
  const fatia = intersectRegion(base, [{ outer: [{ x: bB.minX - 1, y: yPerna - 0.1 }, { x: bB.maxX + 1, y: yPerna - 0.1 }, { x: bB.maxX + 1, y: yPerna + 0.1 }, { x: bB.minX - 1, y: yPerna + 0.1 }], holes: [] }]);
  const partes = fatia.map((q) => regionBounds([q])).sort((a, b) => a.minX - b.minX);
  const vao = partes.length === 2 ? partes[1]!.minX - partes[0]!.maxX : -1;
  ok('marcador de taça: o gancho abre na espessura do vidro', perto(vao, Number(vm.abertura), 0.1), `${vao.toFixed(2)} mm`);
}

console.log('\n== tiara com nome ==');
{
  const ti = receitaPorId('tiara-nome')!, vt = valoresPadrao(ti);
  const r = gerar(ti), tiara = r.itens[0]!.pecas.find((p) => p.nome === 'Tiara')!.camadas[0]!, letras = r.itens[0]!.pecas.find((p) => p.nome === 'Letras')!.camadas[0]!;
  const bT = regionBounds(tiara.region), bL = regionBounds(letras.region), R = Number(vt.raio);
  ok('tiara: uma peça de 2 cores, tiara inteira (arco, haste e faixa unidos) e cabe na mesa', r.itens.length === 1 && tiara.region.length === 1 && bT.w <= 256 && bT.h <= 256 && !r.avisos.length, `${bT.w.toFixed(0)} x ${bT.h.toFixed(0)} mm`);
  ok('tiara: o vão por dentro tem o raio pedido (dentinhos encostando nele)', perto(-bT.minY, R + Number(vt.largura) / 2, R * 0.6) && bT.w > 2 * R, `${bT.w.toFixed(0)} mm de largura`);
  const perto0 = Math.min(...letras.region.flatMap((p) => p.outer.map((q) => Math.hypot(q.x, q.y))));
  ok('tiara: o nome fica no alto, longe do arco, e as letras são mais altas que a tiara', bL.minY > 0 && perto0 > R + Number(vt.largura) + 1 && letras.z1 > tiara.z1, `${(perto0 - R - Number(vt.largura)).toFixed(1)} mm do arco`);
  ok('tiara: as letras ficam inteiras em cima do contorno da tiara', letras.z0 === tiara.z1 && regionArea(diffRegion(letras.region, tiara.region)) < 0.5);
}

console.log('\n== palavra de parede ==');
{
  // A Pacifico de verdade (a fonte da peça): na Segoe Script, mais fina, os furos não ficam nivelados.
  const ap = receitaPorId('arte-parede')!, pacifico = parseFont(fs.readFileSync('public/fontes/pacifico.ttf').buffer as ArrayBuffer);
  const gerarAp = (mudar: Valores = {}) => ap.gerar({ ...valoresPadrao(ap), ...mudar }, { ...ctx, fonte: (id: string) => (id === 'pacifico' ? pacifico : ctx.fonte(id)) });
  const r = gerarAp(), cam = r.itens[0]!.pecas[0]!.camadas, topo = cam.at(-1)!.region, b = regionBounds(topo);
  ok('parede: peça única de uma cor na largura pedida, com furos de prego atrás', r.itens[0]!.pecas.length === 1 && topo.length === 1 && perto(b.w, 240, 0.5) && cam.length === 3 && !r.avisos.length, `${b.w.toFixed(0)} x ${b.h.toFixed(0)} mm`);
  const boca = diffRegion(topo, cam[0]!.region), canal = diffRegion(topo, cam[1]!.region);
  const bocas = boca.map((p) => regionBounds([p]));
  ok('parede: 2 furos na mesma altura, longe um do outro', bocas.length === 2 && perto(bocas[0]!.minY, bocas[1]!.minY, 0.01) && Math.abs(bocas[0]!.minX - bocas[1]!.minX) > 60, bocas.map((x) => `(${x.minX.toFixed(0)}, ${x.minY.toFixed(0)})`).join(' '));
  ok('parede: o canal da cabeça do prego é maior que a boca e fica escondido dentro da letra', regionArea(canal) > regionArea(boca) + 1 && regionArea(diffRegion(boca, canal)) < 0.01 && cam[1]!.region.length === 1 && cam[0]!.z1 === cam[1]!.z0 && cam[1]!.z1 < cam[2]!.z0 + 0.01);
  const ligada = gerarAp({ texto: 'Família' });
  ok('parede: acento e letras soltas viram uma peça só (com ligação)', ligada.itens[0]!.pecas[0]!.camadas.at(-1)!.region.length === 1 && ligada.notas!.some((n) => n.includes('ligação')));
  const fita = gerarAp({ fixacao: 'fita', largura: 100 });
  ok('parede: sem furo é uma camada inteira; palavra estreita cabe', fita.itens[0]!.pecas[0]!.camadas.length === 1 && perto(regionBounds(fita.itens[0]!.pecas[0]!.camadas[0]!.region).w, 100, 0.5));
  const fina = gerarAp({ espessura: 3 });
  ok('parede: peça fina demais para o furo avisa e sai sem furo', fina.avisos.some((a) => a.includes('fina')) && fina.itens[0]!.pecas[0]!.camadas.length === 1);
}

console.log('\n== placa de nome em pe ==');
{
  const pn = receitaPorId('placa-nome')!, vp = valoresPadrao(pn);
  const r = gerar(pn), [base, letras] = r.itens[0]!.pecas;
  const bBase = regionBounds(base!.camadas[0]!.region), zL = letras!.camadas.map((c) => [c.z0, c.z1]).flat();
  const bL = regionBounds(letras!.camadas.flatMap((c) => c.region));
  ok('placa: base fina e as letras de pé em cima dela, na altura pedida', base!.camadas.length === 1 && Math.min(...zL) === Number(vp.espBase) && perto(Math.max(...zL) - Number(vp.espBase), Number(vp.altura), 2), `${(Math.max(...zL) - Number(vp.espBase)).toFixed(1)} mm`);
  ok('placa: as letras têm a profundidade pedida e não passam da base', perto(bL.h, Number(vp.profundidade), 0.01) && bL.minX >= bBase.minX && bL.maxX <= bBase.maxX && bL.minY >= bBase.minY && bL.maxY <= bBase.maxY);
  const reto = gerar(pn, { nomes: 'HI' }).itens[0]!.pecas[1]!.camadas;
  ok('placa: as fatias emendam, e fatias seguidas iguais viram uma camada só', letras!.camadas.every((c, i, cs) => !i || cs[i - 1]!.z1 === c.z0) && reto.length <= 3, `HI: ${reto.length} camada(s)`);
  ok('placa: um por nome no lote', gerar(pn, { nomes: 'Ana, Bia' }).itens.length === 2);
}

console.log('\n== etiqueta de cabo ==');
{
  const ec = receitaPorId('etiqueta-cabo')!, ve = valoresPadrao(ec);
  const r = gerar(ec), pecas = r.itens[0]!.pecas, todas = pecas.flatMap((p) => p.camadas);
  const fatia = (z: number) => todas.find((c) => c.z0 <= z && c.z1 > z)!.region;
  const faixa = (reg: Region, y0: number, y1: number) => { const b = regionBounds(reg); return intersectRegion(reg, [{ outer: [{ x: b.minX - 1, y: y0 }, { x: b.maxX + 1, y: y0 }, { x: b.maxX + 1, y: y1 }, { x: b.minX - 1, y: y1 }], holes: [] }]); };
  const rc = Number(ve.cabo) / 2 + Number(ve.folga), zc = 1.6 + rc, meiaFenda = (Number(ve.cabo) * Number(ve.fenda)) / 200;
  const bTudo = regionBounds(todas.flatMap((c) => c.region));
  const noCanal = fatia(zc), frenteCanal = faixa(noCanal, rc + 0.05, 99);
  ok('cabo: o canal atravessa o nome inteiro, fechado na frente e atrás', regionArea(faixa(noCanal, -rc + 0.05, rc - 0.05)) < 1e-6 && frenteCanal.length === 1 && perto(regionBounds(frenteCanal).w, bTudo.w, 1), `${regionBounds(frenteCanal).w.toFixed(1)} de ${bTudo.w.toFixed(1)} mm`);
  ok('cabo: fenda por baixo mais estreita que o cabo', regionArea(faixa(fatia(0.1), -meiaFenda + 0.05, meiaFenda - 0.05)) < 1e-6 && regionArea(faixa(fatia(0.1), meiaFenda + 0.05, rc - 0.05)) > 1 && meiaFenda < Number(ve.cabo) / 2);
  ok('cabo: teto do canal em gota (imprime em pé sem suporte)', regionArea(faixa(fatia(zc + rc * 1.2), -0.05, 0.05)) < 1e-6 && regionArea(faixa(fatia(zc + rc * 1.5), -0.05, 0.05)) > 0);
  const H = Math.max(...pecas[1]!.camadas.map((c) => c.z1)), zTroca = Math.max(...pecas[0]!.camadas.map((c) => c.z1));
  ok('cabo: a cor troca na altura pedida', pecas.length === 2 && perto(zTroca, (H * Number(ve.troca)) / 100, 0.01) && Math.min(...pecas[1]!.camadas.map((c) => c.z0)) === zTroca, `${zTroca.toFixed(2)} de ${H.toFixed(1)} mm`);
}

console.log('\n== porta-canetas com nome ==');
{
  const pc = receitaPorId('porta-canetas-nome')!, vc = valoresPadrao(pc);
  const r = gerar(pc), [corpo, letras] = r.itens[0]!.pecas, prof = Number(vc.profundidade), raio = Number(vc.furo) / 2;
  const fatia = (z: number) => corpo!.camadas.find((c) => c.z0 <= z && c.z1 > z)!.region;
  const cheio = regionArea(fatia(0.1)), nFuros = Number(/(\d+) furo/.exec(r.notas!.join(' '))?.[1] ?? 0);
  ok('porta-canetas: furos de caneta no topo, e o corpo continua uma peça só', nFuros >= 3 && fatia(prof / 2).length === 1 && regionArea(fatia(prof / 2)) < cheio - nFuros * 2 * raio * 10, `${nFuros} furos`);
  ok('porta-canetas: costas e frente fechadas (o furo fica no meio da profundidade)', perto(regionArea(fatia(prof - 0.1)), cheio, 0.01) && perto(regionArea(fatia(prof / 2 - raio - 0.1)), cheio, 0.01));
  ok('porta-canetas: teto dos furos em gota (imprime deitado sem suporte)', regionArea(fatia(prof / 2 + raio * 1.2)) < cheio - 1 && regionArea(fatia(prof / 2 + raio * 1.2)) > regionArea(fatia(prof / 2)));
  ok('porta-canetas: as letras ficam por cima do corpo, dentro do contorno', letras!.camadas[0]!.z0 === prof && regionArea(diffRegion(letras!.camadas[0]!.region, fatia(prof - 0.1))) < 0.5);
}

console.log('\n== porta-retrato com palavra ==');
{
  const pr = receitaPorId('porta-retrato-palavra')!;
  const mesa = gerar(pr), pronto = gerar(pr, { montado: true });
  const moldura = mesa.itens[0]!.pecas[0]!.camadas, costas = mesa.itens[1]!.pecas[0]!.camadas[0]!, pe = mesa.itens[2]!.pecas[0]!.camadas[0]!;
  const molduraPronta = pronto.itens[0]!.pecas.find((p) => p.nome === 'Moldura')!.camadas, T = Math.max(...molduraPronta.map((c) => c.z1));
  const frentePronta = molduraPronta.find((c) => c.z1 === T)!.region, frenteMesa = moldura[0]!.region;
  ok('porta-retrato: moldura, costas e pé; na mesa a moldura sai espelhada (imprime de frente)', mesa.itens.length === 3 && regionArea(diffRegion(scaleRegion(frenteMesa, -1, 1), frentePronta)) < 0.5 && regionArea(diffRegion(frenteMesa, frentePronta)) > 10);
  ok('porta-retrato: palavra e data presas na moldura (a frente é uma peça só)', frenteMesa.length === 1);
  const bF = regionBounds(frenteMesa), topo = (reg: Region) => regionArea(intersectRegion(reg, [{ outer: [{ x: -40, y: bF.maxY - 4 }, { x: 40, y: bF.maxY - 4 }, { x: 40, y: bF.maxY + 1 }, { x: -40, y: bF.maxY + 1 }], holes: [] }]));
  ok('porta-retrato: foto e costas entram por cima (bolsão e trilho abertos em cima, frente fechada)', topo(frenteMesa) > 100 && topo(moldura[1]!.region) < 0.01 && topo(moldura[2]!.region) < 0.01);
  const paredes = intersectRegion(moldura[2]!.region, [{ outer: [{ x: bF.minX - 1, y: -0.1 }, { x: bF.maxX + 1, y: -0.1 }, { x: bF.maxX + 1, y: 0.1 }, { x: bF.minX - 1, y: 0.1 }], holes: [] }]).map((q) => regionBounds([q])).sort((a, b) => a.minX - b.minX);
  const vaoTrilho = paredes.length === 2 ? paredes[1]!.minX - paredes[0]!.maxX : -1;
  ok('porta-retrato: as costas deslizam no trilho com folga', perto(vaoTrilho - regionBounds(costas.region).w, 0.5, 0.01) && costas.z1 < moldura[2]!.z1 - moldura[2]!.z0, `${(vaoTrilho - regionBounds(costas.region).w).toFixed(2)} mm`);
  const furosPe = costas.region.flatMap((p) => p.holes).map((h) => regionBounds([{ outer: h, holes: [] }]));
  ok('porta-retrato: o pé encaixa nos dois furos das costas com folga', furosPe.length === 2 && furosPe.every((f) => perto(f.w, 3.3, 0.01) && perto(f.h, 8.3, 0.01)) && perto(pe.z1 - pe.z0, 3, 0.001), furosPe.map((f) => `${f.w.toFixed(1)}x${f.h.toFixed(1)}`).join(' '));
}

console.log('\n== vaso canelado ==');
{
  const vc = receitaPorId('vaso-canelado')!, vv = valoresPadrao(vc);
  const medidas = (r: Resultado) => { const cs = r.itens[0]!.pecas[0]!.camadas; return { cs, d: Math.max(...cs.map((c) => regionBounds(c.region).w)), h: Math.max(...cs.map((c) => c.z1)) }; };
  const tig = medidas(gerar(vc, { formato: 'tigela' })), cil = medidas(gerar(vc)), peq = medidas(gerar(vc, { formato: 'pequeno', tamanho: 120 }));
  ok('vaso: os 3 formatos nas medidas (tigela larga e baixa, cilindros)', perto(tig.d, 170, 0.5) && perto(tig.h, 62, 0.01) && perto(cil.d, 120, 0.5) && perto(cil.h, 90, 0.01) && perto(peq.d, 102, 0.5) && perto(peq.h, 102, 0.01), `${tig.d.toFixed(0)}x${tig.h} ${cil.d.toFixed(0)}x${cil.h} ${peq.d.toFixed(0)}x${peq.h.toFixed(0)}`);
  const meio = cil.cs.find((c) => c.z0 <= 45 && c.z1 > 45)!.region, buraco = meio[0]!.holes[0]!;
  const rFundo = 60 - Number(vv.fundoFriso), rMiolo = regionBounds([{ outer: buraco, holes: [] }]).w / 2;
  ok('vaso: miolo liso com a parede pedida por dentro do fundo dos frisos', meio.length === 1 && meio[0]!.holes.length === 1 && perto(rFundo - rMiolo, Number(vv.parede), 0.05), `${(rFundo - rMiolo).toFixed(2)} mm`);
  const nFrisos = Math.round((2 * Math.PI * 60) / Number(vv.larguraFriso));
  ok('vaso: frisos na largura pedida e fundo fechado', meio[0]!.outer.length === nFrisos * 8 && cil.cs.filter((c) => c.z1 <= Number(vv.fundo)).every((c) => c.region.every((p) => !p.holes.length)), `${nFrisos} frisos`);
  const dreno = gerar(vc, { dreno: true }).itens[0]!.pecas[0]!.camadas[0]!.region;
  ok('vaso: o cilindro vira poucas camadas; furo de dreno opcional atravessa o fundo', cil.cs.length <= 15 && dreno[0]!.holes.length === 1);
}

console.log('\n== nome articulado ==');
{
  const na = receitaPorId('nome-articulado')!, vn = valoresPadrao(na);
  const r = gerar(na), [baixo, cima] = r.itens[0]!.pecas, todas = [...baixo!.camadas, ...cima!.camadas];
  const N = String(vn.nome).length, c = Number(vn.folga), D = Number(vn.profundidade);
  const hb = Math.max(...baixo!.camadas.map((k) => k.z1));
  const fatia = (z: number) => todas.find((k) => k.z0 <= z && k.z1 > z)!.region;
  const andar = (hb - 2 * c) / 10, zB = andar * 1.5, zM = 3 * andar + c + 2 * andar, zT = (hb + 7 * andar + 2 * c) / 2;
  const pinos = fatia(zM).filter((p) => regionArea([p]) < Math.PI * 1.5 * 1.5 * 1.05);
  const centro = (p: Region[number]) => { const b = regionBounds([p]); return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 }; };
  ok('articulado: uma junta entre cada par de letras, com o pino solto no furo do andar do meio', pinos.length === N - 1 && pinos.every((p) => fatia(zM).some((q) => q.holes.some((h) => pointInContour(h, centro(p))))), `${pinos.length} pinos`);
  ok('articulado: a folga da junta vale em todos os andares', [zB, zM, zT].every((z) => contornar(fatia(z), c / 2 - 0.05).length === fatia(z).length));
  const eixos = pinos.map((p) => { const b = regionBounds([p]); return (b.minX + b.maxX) / 2; });
  const acima = fatia(hb + c / 2);
  ok('articulado: o pé da letra não encosta na junta da vizinha', eixos.every((e) => regionArea(intersectRegion(acima, intersectRegion(circulo(e, 0, D / 2 + c - 0.05, 64), [{ outer: [{ x: e, y: -D }, { x: e + D, y: -D }, { x: e + D, y: D }, { x: e, y: D }], holes: [] }]))) < 1e-6));
  const argola = fatia(zB).find((p) => p.holes.length)!;
  ok('articulado: argola de chaveiro e a cor troca acima das juntas', !!argola && perto(regionBounds([{ outer: argola.holes[0]!, holes: [] }]).w, 5, 0.05) && Math.min(...cima!.camadas.map((k) => k.z0)) === hb && !r.avisos.length);
}

console.log(`\n${total - falhas}/${total} passaram\n`);
process.exit(falhas ? 1 : 0);
