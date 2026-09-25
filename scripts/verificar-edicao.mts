/**
 * Edicao de uma peca (mover / girar / redimensionar).
 *   npx tsx scripts/verificar-edicao.mts
 *
 * Diferente do arranjo na placa, a edicao muda o PRODUTO: a chapa de ACM daquela
 * letra, o gabarito, a colisao e o preco acompanham. Estes testes cobrem justamente
 * isso -- que a mudanca chega ate a chapa, e nao fica so na tela.
 */
import fs from 'fs';
import { aplicarEdicao, edicaoVazia, escalaDeMm, escalaUniforme, mmDeEscala, SEM_EDICAO, type Edicao } from '../lib/geom/pecaEditada';
import { buildPart, PARAMS_PADRAO } from '../lib/geom/modes';
import { buildRegion, minThickness, regionArea, regionBounds, type Region } from '../lib/geom/region';
import { parseFont, textToLetters } from '../lib/text/glyphs';

let falhas = 0;
let total = 0;
const ok = (nome: string, cond: boolean, detalhe = '') => {
  total++;
  if (!cond) falhas++;
  console.log(`${cond ? '  ok  ' : ' FALHA'}  ${nome}${detalhe ? '  -> ' + detalhe : ''}`);
};
const perto = (a: number, b: number, tol = 0.05) => Math.abs(a - b) <= tol;

const ed = (p: Partial<Edicao>): Edicao => ({ ...SEM_EDICAO, ...p });

/** Retangulo, deslocado da origem de proposito: o centro nao e (0,0). */
const ret = (w: number, h: number, x = 300, y = -200): Region =>
  buildRegion([[{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }]], 'nonzero');

/** "L": forma concava, para o giro nao poder ser confundido com espelhamento. */
const ele = (lado: number, grosso: number, x = 300, y = -200): Region =>
  buildRegion(
    [[
      { x, y }, { x: x + lado, y }, { x: x + lado, y: y + grosso },
      { x: x + grosso, y: y + grosso }, { x: x + grosso, y: y + lado }, { x, y: y + lado },
    ]],
    'nonzero'
  );

console.log('\n== edicao vazia nao mexe em nada ==');
{
  const r = ele(100, 30);
  const saida = aplicarEdicao(r, SEM_EDICAO);
  ok('SEM_EDICAO devolve a mesma regiao', saida === r);
  ok('edicaoVazia reconhece', edicaoVazia(SEM_EDICAO) && edicaoVazia(undefined));
  ok('e nao confunde com edicao real', !edicaoVazia(ed({ giro: 1 })) && !edicaoVazia(ed({ ex: 1.01 })));
}

console.log('\n== escala ==');
{
  const r = ret(100, 50);
  const a2 = aplicarEdicao(r, ed({ ex: 2, ey: 2 }));
  const b = regionBounds(a2);
  ok('escala 2x duplica cada lado', perto(b.w, 200) && perto(b.h, 100), `${b.w.toFixed(1)}x${b.h.toFixed(1)}`);
  ok('e quadruplica a area', perto(regionArea(a2), regionArea(r) * 4, 1),
     `${regionArea(a2).toFixed(0)} vs ${(regionArea(r) * 4).toFixed(0)}mm2`);

  // O centro tem de ficar onde estava: escalar nao pode empurrar a peca.
  const b0 = regionBounds(r);
  ok('o centro nao se move ao escalar',
     perto(b.minX + b.w / 2, b0.minX + b0.w / 2) && perto(b.minY + b.h / 2, b0.minY + b0.h / 2),
     `centro ${(b.minX + b.w / 2).toFixed(1)},${(b.minY + b.h / 2).toFixed(1)} vs ${(b0.minX + b0.w / 2).toFixed(1)},${(b0.minY + b0.h / 2).toFixed(1)}`);
}
{
  const r = ret(100, 50);
  const naoUnif = aplicarEdicao(r, ed({ ex: 2, ey: 1 }));
  const b = regionBounds(naoUnif);
  ok('escala so em X estica so em X', perto(b.w, 200) && perto(b.h, 50), `${b.w.toFixed(1)}x${b.h.toFixed(1)}`);
  ok('escalaUniforme distingue os dois casos',
     escalaUniforme(ed({ ex: 2, ey: 2 })) && !escalaUniforme(ed({ ex: 2, ey: 1 })));
}
{
  // Encolher preserva os buracos: o miolo do "O" nao pode fechar.
  const b = fs.readFileSync('C:/Windows/Fonts/arialbd.ttf');
  const font = parseFont(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
  const o = textToLetters(font, 'O', { altura: 100 })[0]!;
  const furosAntes = o.region.reduce((a, p) => a + p.holes.length, 0);
  const menor = aplicarEdicao(o.region, ed({ ex: 0.5, ey: 0.5 }));
  const furosDepois = menor.reduce((a, p) => a + p.holes.length, 0);
  ok('encolher o "O" preserva a contra-forma', furosAntes === 1 && furosDepois === 1, `${furosAntes} -> ${furosDepois}`);
  ok('e a area cai para um quarto', perto(regionArea(menor), regionArea(o.region) / 4, 1),
     `${regionArea(menor).toFixed(0)} vs ${(regionArea(o.region) / 4).toFixed(0)}mm2`);
}

console.log('\n== giro ==');
{
  const r = ret(100, 50);
  const g90 = aplicarEdicao(r, ed({ giro: 90 }));
  const b = regionBounds(g90);
  ok('giro de 90 troca largura e altura', perto(b.w, 50) && perto(b.h, 100), `${b.w.toFixed(1)}x${b.h.toFixed(1)}`);
  // Area preservada e o que pega giro na origem errada ou escala disfarcada.
  ok('giro preserva a area', perto(regionArea(g90), regionArea(r), 0.5),
     `${regionArea(g90).toFixed(1)} vs ${regionArea(r).toFixed(1)}mm2`);

  const b0 = regionBounds(r);
  ok('gira em torno do centro da peca, nao da origem do letreiro',
     perto(b.minX + b.w / 2, b0.minX + b0.w / 2) && perto(b.minY + b.h / 2, b0.minY + b0.h / 2),
     `centro ${(b.minX + b.w / 2).toFixed(1)},${(b.minY + b.h / 2).toFixed(1)}`);
}
{
  const r = ele(120, 40);
  const volta = aplicarEdicao(aplicarEdicao(r, ed({ giro: 90 })), ed({ giro: -90 }));
  ok('girar e desgirar volta ao mesmo lugar',
     perto(regionArea(volta), regionArea(r), 0.5) && perto(regionBounds(volta).minX, regionBounds(r).minX, 0.1),
     `minX ${regionBounds(volta).minX.toFixed(2)} vs ${regionBounds(r).minX.toFixed(2)}`);
}
{
  // 360 graus e identidade geometrica (area e bounds), mesmo com erro de ponto flutuante.
  const r = ele(120, 40);
  const cheio = aplicarEdicao(r, ed({ giro: 360 }));
  ok('giro de 360 nao deforma', perto(regionArea(cheio), regionArea(r), 0.5) && perto(regionBounds(cheio).w, regionBounds(r).w, 0.05));
}

console.log('\n== deslocamento ==');
{
  const r = ret(100, 50);
  const m = aplicarEdicao(r, ed({ dx: 25, dy: -60 }));
  const b0 = regionBounds(r);
  const b = regionBounds(m);
  ok('mover desloca exatamente o pedido', perto(b.minX, b0.minX + 25) && perto(b.minY, b0.minY - 60),
     `${(b.minX - b0.minX).toFixed(1)}, ${(b.minY - b0.minY).toFixed(1)}`);
  ok('e nao muda o tamanho', perto(b.w, b0.w) && perto(b.h, b0.h));
}
{
  // Ordem: escala e giro no centro, DEPOIS o deslocamento. Se o deslocamento entrasse
  // antes do giro, ele sairia girado tambem e a peca iria para outro lugar.
  const r = ret(100, 50);
  const t = aplicarEdicao(r, ed({ giro: 90, dx: 30, dy: 0 }));
  const b0 = regionBounds(r);
  const b = regionBounds(t);
  const centroEsperadoX = b0.minX + b0.w / 2 + 30;
  ok('deslocamento e aplicado depois do giro', perto(b.minX + b.w / 2, centroEsperadoX),
     `centro X ${(b.minX + b.w / 2).toFixed(1)} vs ${centroEsperadoX.toFixed(1)}`);
}

console.log('\n== espessura minima depois de escalar ==');
{
  const r = ele(120, 30);
  const esp0 = minThickness(r);

  // Uniforme: da para multiplicar, e e por isso que o slider de altura nao trava.
  const unif = aplicarEdicao(r, ed({ ex: 0.5, ey: 0.5 }));
  const espUnif = minThickness(unif);
  ok('escala uniforme: espessura escala junto', perto(espUnif, esp0 * 0.5, 0.15),
     `${espUnif.toFixed(2)} vs ${(esp0 * 0.5).toFixed(2)}mm`);

  // Nao uniforme: multiplicar mente. Esticar so em X nao afina a barra horizontal,
  // mas afina... nada; o que muda e qual trecho passa a ser o mais fino.
  const naoUnif = aplicarEdicao(r, ed({ ex: 3, ey: 1 }));
  const espMedido = minThickness(naoUnif);
  const espMultiplicado = esp0 * 3;
  ok('escala nao uniforme: medir difere de multiplicar',
     Math.abs(espMedido - espMultiplicado) > 0.5,
     `medido ${espMedido.toFixed(2)}mm vs multiplicado ${espMultiplicado.toFixed(2)}mm`);
  ok('e o valor medido e o que faz sentido fisico', perto(espMedido, esp0, 0.2),
     `${espMedido.toFixed(2)} vs ${esp0.toFixed(2)}mm (a barra fina nao mudou de espessura)`);
}

console.log('\n== a edicao chega na chapa e no volume ==');
{
  const b = fs.readFileSync('C:/Windows/Fonts/arialbd.ttf');
  const font = parseFont(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
  const letra = textToLetters(font, 'D', { altura: 100 })[0]!;

  const original = buildPart(letra.region, PARAMS_PADRAO, minThickness(letra.region));
  const dobrada = aplicarEdicao(letra.region, ed({ ex: 2, ey: 2 }));
  const maior = buildPart(dobrada, PARAMS_PADRAO, minThickness(dobrada));

  const corte = (p: typeof original) =>
    p.extras.reduce((a, e) => a + (e.kind === 'cut' ? regionArea(e.region) : 0), 0);

  ok('a peca original tem chapa de corte', corte(original) > 0, `${corte(original).toFixed(0)}mm2`);
  // A chapa acompanha a escala: se nao acompanhasse, o ACM cortado nao encaixaria.
  ok('dobrar a peca aumenta a area da chapa', corte(maior) > corte(original) * 3,
     `${corte(original).toFixed(0)} -> ${corte(maior).toFixed(0)}mm2`);
  ok('e aumenta o volume (logo as gramas e o preco)', maior.volume > original.volume * 2,
     `${(original.volume / 1000).toFixed(0)} -> ${(maior.volume / 1000).toFixed(0)}cm3`);
  // A profundidade e parametro, nao escala: a peca fica maior em X e Y, nao em Z.
  ok('a altura em Z nao muda ao escalar em XY', perto(maior.alturaZ, original.alturaZ),
     `${original.alturaZ.toFixed(1)} -> ${maior.alturaZ.toFixed(1)}mm`);
}
{
  // Girar a peca nao pode mudar o que ela consome.
  const b = fs.readFileSync('C:/Windows/Fonts/arialbd.ttf');
  const font = parseFont(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
  const letra = textToLetters(font, 'E', { altura: 100 })[0]!;
  const reta = buildPart(letra.region, PARAMS_PADRAO, minThickness(letra.region));
  const gr = aplicarEdicao(letra.region, ed({ giro: 37 }));
  const torta = buildPart(gr, PARAMS_PADRAO, minThickness(gr));
  ok('girar nao muda o volume da peca', perto(torta.volume, reta.volume, reta.volume * 0.01),
     `${(reta.volume / 1000).toFixed(1)} vs ${(torta.volume / 1000).toFixed(1)}cm3`);
}

console.log('\n== tamanho em mm e em x ==');
{
  const r = ret(80, 150);
  const b0 = regionBounds(r);
  // Digitar 180 mm na altura tem de dar uma letra de 180 mm, nao um numero parecido.
  const ey = escalaDeMm(180, b0.h);
  const b = regionBounds(aplicarEdicao(r, ed({ ex: ey, ey })));
  ok('180 mm de altura vira exatamente 180 mm', perto(b.h, 180, 0.01), `${b.h.toFixed(3)} mm`);
  ok('com proporcao, a largura acompanha', perto(b.w, 80 * (180 / 150), 0.01), `${b.w.toFixed(2)} mm`);
  ok('mm -> x -> mm volta ao mesmo valor', perto(mmDeEscala(escalaDeMm(123.4, b0.w), b0.w), 123.4, 1e-9));
  ok('1,00 x mostra a medida original', perto(mmDeEscala(1, b0.h), 150, 1e-9));
  ok('base zero nao explode', escalaDeMm(10, 0) === 1);
}

console.log(`\n${total - falhas}/${total} passaram\n`);
process.exit(falhas ? 1 : 0);
