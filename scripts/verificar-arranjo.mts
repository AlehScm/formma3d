/**
 * Encaixe das pecas na placa.
 *   npx tsx scripts/verificar-arranjo.mts
 *
 * O teste que mais importa e o de sobreposicao, e ele e feito na GEOMETRIA, nao no
 * grid do encaixe: se o grid tiver erro, medir nele mesmo esconderia o erro. Duas
 * pecas sobrepostas na placa colidem com o bico e arruinam a impressao.
 */
import { arrumar, prepararParaArranjo, type Colocada } from '../lib/print/arranjo';
import { acharImpressora, caberNaMesa } from '../lib/print/impressoras';
import {
  buildRegion,
  intersectRegion,
  offsetRegion,
  regionArea,
  regionBounds,
  rotateRegion,
  translateRegion,
  type Region,
} from '../lib/geom/region';

let falhas = 0;
let total = 0;
const ok = (nome: string, cond: boolean, detalhe = '') => {
  total++;
  if (!cond) falhas++;
  console.log(`${cond ? '  ok  ' : ' FALHA'}  ${nome}${detalhe ? '  -> ' + detalhe : ''}`);
};
const perto = (a: number, b: number, tol = 0.05) => Math.abs(a - b) <= tol;

const X2D = acharImpressora('x2d')!;
const A2L = acharImpressora('a2l')!;

const ret = (w: number, h: number, x = 0, y = 0): Region =>
  buildRegion([[{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }]], 'nonzero');

/** "L" com o braco em baixo: forma concava, que encaixa com outro L girado 180. */
const ele = (lado: number, grosso: number, x = 0, y = 0): Region =>
  buildRegion(
    [[
      { x, y }, { x: x + lado, y }, { x: x + lado, y: y + grosso },
      { x: x + grosso, y: y + grosso }, { x: x + grosso, y: y + lado }, { x, y: y + lado },
    ]],
    'nonzero'
  );

/** Aplica o que o arranjo decidiu, do mesmo jeito que a tela e o export fariam. */
function aplicar(region: Region, c: Colocada): Region {
  const b = regionBounds(region);
  const girada = c.giro === 0 ? region : rotateRegion(region, c.giro, b.minX + b.w / 2, b.minY + b.h / 2);
  return translateRegion(girada, c.dx, c.dy);
}

const preparar = (pecas: { nome: string; region: Region }[], m = X2D) =>
  prepararParaArranjo(pecas.map((p) => ({ ...p, alturaZ: 40 })), m);

console.log('\n== nada se sobrepoe, e a folga e respeitada ==');
{
  const folga = 3;
  const pecas = [
    { nome: 'A', region: ret(120, 100) },
    { nome: 'B', region: ret(110, 90, 500, 0) },
    { nome: 'C', region: ret(100, 120, 0, 500) },
    { nome: 'D', region: ret(90, 80, 500, 500) },
    { nome: 'E', region: ele(120, 40, -400, 0) },
    { nome: 'F', region: ele(110, 45, -400, 400) },
  ];
  const a = arrumar(preparar(pecas), X2D, folga);
  console.log(`        ${a.colocadas.length} colocadas, ${a.sobraram.length} de fora, ${a.placas} placa(s)`);

  const postas = a.colocadas.map((c) => ({
    nome: c.nome,
    region: aplicar(pecas.find((p) => p.nome === c.nome)!.region, c),
  }));

  let sobreposicao = 0;
  let pior = Infinity;
  for (let i = 0; i < postas.length; i++) {
    for (let j = i + 1; j < postas.length; j++) {
      const inter = regionArea(intersectRegion(postas[i]!.region, postas[j]!.region));
      if (inter > 0.01) {
        sobreposicao++;
        console.log(`        ${postas[i]!.nome} x ${postas[j]!.nome}: ${inter.toFixed(1)}mm2 sobrepostos`);
      }
      // Folga real: dilatar uma em folga/2 e ver se toca a outra dilatada.
      const ia = offsetRegion(postas[i]!.region, -(folga / 2 - 0.15), 'miter');
      const ib = offsetRegion(postas[j]!.region, -(folga / 2 - 0.15), 'miter');
      const toca = regionArea(intersectRegion(ia, ib));
      if (toca < pior) pior = toca;
      if (toca > 0.01) console.log(`        ${postas[i]!.nome} x ${postas[j]!.nome}: folga menor que ${folga}mm`);
    }
  }
  ok('nenhuma peca invade outra', sobreposicao === 0, `${postas.length} pecas comparadas`);
  ok('a folga pedida e respeitada entre todos os pares', pior <= 0.01);
  ok('colocou mais de uma peca', postas.length >= 2, `${postas.length}`);

  for (const p of postas) {
    const b = regionBounds(p.region);
    const dentro = b.minX >= -0.05 && b.minY >= -0.05 && b.maxX <= X2D.x + 0.05 && b.maxY <= X2D.y + 0.05;
    if (!dentro) ok(`peca ${p.nome} dentro da placa`, false, `${b.minX.toFixed(1)},${b.minY.toFixed(1)} a ${b.maxX.toFixed(1)},${b.maxY.toFixed(1)}`);
  }
  ok('todas dentro do retangulo da placa', postas.every((p) => {
    const b = regionBounds(p.region);
    return b.minX >= -0.05 && b.minY >= -0.05 && b.maxX <= X2D.x + 0.05 && b.maxY <= X2D.y + 0.05;
  }));
}

console.log('\n== quantas cabem de verdade ==');
{
  // Quadrado de 100 com 3mm de folga: 2 por eixo em 256mm (100+3+100 = 203). 4 no total.
  const pecas = Array.from({ length: 6 }, (_, i) => ({ nome: `q${i}`, region: ret(100, 100, i * 300, 0) }));
  const a = arrumar(preparar(pecas), X2D, 3);
  ok('4 quadrados de 100mm entram na X2D', a.colocadas.length === 4, `${a.colocadas.length} colocadas`);
  ok('os outros 2 sobram', a.sobraram.length === 2, `${a.sobraram.length} de fora`);
  ok('e informa 2 placas no total', a.placas === 2, `${a.placas}`);
}
{
  const pecas = Array.from({ length: 4 }, (_, i) => ({ nome: `q${i}`, region: ret(100, 100, i * 300, 0) }));
  const a = arrumar(preparar(pecas, A2L), A2L, 3);
  ok('na A2L (330x320) entram os 4 tambem', a.colocadas.length === 4 && a.placas === 1, `${a.colocadas.length} em ${a.placas} placa`);
}

console.log('\n== forma concava encaixa (o que a caixa envolvente nao faria) ==');
{
  // Dois "L" de 150x150 com braco de 40mm.
  //
  // Pela caixa envolvente sao 150x150 cada, e 150+3+150 = 303 > 256: nao cabem os
  // dois de jeito nenhum. Encaixados sim -- L1 abraca o canto de baixo-esquerda e o
  // L2 girado 180 abraca o de cima-direita, deslocado 43mm na diagonal. O maior
  // extremo fica em 193mm, dentro dos 256, com os 3mm de folga preservados.
  //
  // (Conferido na mao: com braco de 60mm em L de 200mm NAO da -- precisaria de
  // 263mm. O encaixe so ganha quando o vao e maior que o braco do vizinho.)
  const pecas = [
    { nome: 'L1', region: ele(150, 40) },
    { nome: 'L2', region: ele(150, 40, 400, 0) },
  ];
  const a = arrumar(preparar(pecas), X2D, 3);
  ok('dois "L" de 150mm entram na mesma placa', a.colocadas.length === 2,
     `${a.colocadas.length} colocadas: ${a.colocadas.map((c) => `${c.nome}@${c.giro}graus`).join(' ')}`);
  ok('e um deles teve de girar', a.colocadas.some((c) => c.giro !== 0),
     a.colocadas.map((c) => `${c.nome}:${c.giro}`).join(' '));

  // Prova que empacotar pela caixa envolvente recusaria: dois retangulos de 150x150
  // -- exatamente a caixa desses L -- nao entram na mesma placa.
  const caixas = [
    { nome: 'R1', region: ret(150, 150) },
    { nome: 'R2', region: ret(150, 150, 400, 0) },
  ];
  const b = arrumar(preparar(caixas), X2D, 3);
  ok('dois retangulos de 150mm NAO entram (confirma o ganho)', b.colocadas.length === 1, `${b.colocadas.length} colocada(s)`);
}

console.log('\n== coerencia com o veredito de encaixe ==');
{
  // 300x40 so cabe girada 45 graus. Se o arranjo nao usasse esse angulo, o app
  // diria "cabe" no painel e nao conseguiria colocar -- contradicao visivel.
  const fina = ret(300, 40);
  const v = caberNaMesa(fina, 40, X2D);
  ok('o veredito diz que a peca fina cabe', v.cabe && v.giro % 90 !== 0, `${v.giro.toFixed(0)}graus`);
  const a = arrumar(preparar([{ nome: 'fina', region: fina }]), X2D, 0);
  ok('e o arranjo consegue coloca-la', a.colocadas.length === 1, `${a.colocadas.length}`);
  if (a.colocadas[0]) {
    const b = regionBounds(aplicar(fina, a.colocadas[0]));
    ok('dentro da placa depois de girada', b.minX >= -0.05 && b.minY >= -0.05 && b.maxX <= X2D.x + 0.05 && b.maxY <= X2D.y + 0.05,
       `${b.minX.toFixed(1)},${b.minY.toFixed(1)} a ${b.maxX.toFixed(1)},${b.maxY.toFixed(1)}`);
  }
}
{
  // Peca que nao cabe de jeito nenhum tem de sobrar, nao ser forcada.
  const enorme = ret(400, 400);
  const a = arrumar(preparar([{ nome: 'enorme', region: enorme }]), X2D, 3);
  ok('peca maior que a mesa sobra', a.colocadas.length === 0 && a.sobraram.length === 1);
  ok('e nao conta placa nenhuma', a.placas === 0, `${a.placas}`);
}

console.log('\n== deterministico ==');
{
  const pecas = [
    { nome: 'A', region: ret(120, 100) },
    { nome: 'B', region: ele(150, 50, 400, 0) },
    { nome: 'C', region: ret(80, 140, 0, 400) },
  ];
  const a = arrumar(preparar(pecas), X2D, 3);
  const b = arrumar(preparar(pecas), X2D, 3);
  ok('duas chamadas dao o mesmo resultado', JSON.stringify(a) === JSON.stringify(b));
}

console.log('\n== o arranjo nao muda o produto ==');
{
  const pecas = [
    { nome: 'A', region: ret(120, 100) },
    { nome: 'B', region: ret(110, 90, 500, 0) },
  ];
  const antes = pecas.map((p) => ({ area: regionArea(p.region), b: regionBounds(p.region) }));
  const a = arrumar(preparar(pecas), X2D, 3);
  const depois = pecas.map((p) => ({ area: regionArea(p.region), b: regionBounds(p.region) }));
  ok('as Region originais nao foram tocadas',
     JSON.stringify(antes) === JSON.stringify(depois), `${a.colocadas.length} colocadas`);

  // Girar e mover preserva area: se nao preservasse, o preco mudaria ao arrumar.
  const somaAntes = pecas.reduce((s, p) => s + regionArea(p.region), 0);
  const somaDepois = a.colocadas.reduce((s, c) => s + regionArea(aplicar(pecas.find((p) => p.nome === c.nome)!.region, c)), 0);
  ok('a area total nao muda ao arrumar', perto(somaAntes, somaDepois, 0.5),
     `${somaAntes.toFixed(1)} vs ${somaDepois.toFixed(1)}mm2`);
}

console.log('\n== folga zero ==');
{
  // 256/100 = 2 por eixo mesmo sem folga; com 0 a conta nao pode explodir.
  const pecas = Array.from({ length: 4 }, (_, i) => ({ nome: `q${i}`, region: ret(128, 128, i * 300, 0) }));
  const a = arrumar(preparar(pecas), X2D, 0);
  ok('sem folga, 4 quadrados de 128mm lotam a X2D', a.colocadas.length === 4, `${a.colocadas.length}`);
}

console.log(`\n${total - falhas}/${total} passaram\n`);
process.exit(falhas ? 1 : 0);
