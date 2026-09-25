/**
 * Mesa das impressoras e teste de encaixe.
 *   npx tsx scripts/verificar-mesa.mts
 *
 * As medidas sao contrato: vieram dos perfis do Bambu Studio e um erro aqui faz o
 * usuario cortar peca errada. O teste mais importante e o ultimo -- ele gira a
 * geometria de verdade para conferir que um "cabe girada" nao e mentira.
 */
import { IMPRESSORAS, acharImpressora, caberNaMesa, cascoConvexo, descreverVeredito } from '../lib/print/impressoras';
import { buildRegion, regionBounds, type Pt, type Region } from '../lib/geom/region';

let falhas = 0;
let total = 0;
const ok = (nome: string, cond: boolean, detalhe = '') => {
  total++;
  if (!cond) falhas++;
  console.log(`${cond ? '  ok  ' : ' FALHA'}  ${nome}${detalhe ? '  -> ' + detalhe : ''}`);
};
const perto = (a: number, b: number, tol = 0.05) => Math.abs(a - b) <= tol;

/** Retangulo w x h com o canto em (x,y). */
const ret = (w: number, h: number, x = 0, y = 0): Region =>
  buildRegion([[{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }]], 'nonzero');

const X2D = acharImpressora('x2d')!;
const A2L = acharImpressora('a2l')!;

console.log('\n== as medidas batem com os perfis do Bambu Studio ==');
{
  ok('X2D e 256 x 256 x 261', X2D.x === 256 && X2D.y === 256 && X2D.z === 261, `${X2D.x}x${X2D.y}x${X2D.z}`);
  ok('X2D tem 2 bicos', X2D.bicos === 2, `${X2D.bicos}`);
  ok('A2L e 330 x 320 x 325', A2L.x === 330 && A2L.y === 320 && A2L.z === 325, `${A2L.x}x${A2L.y}x${A2L.z}`);
  ok('A2L tem 1 bico', A2L.bicos === 1, `${A2L.bicos}`);
  ok('as duas maquinas estao na lista', IMPRESSORAS.length === 2, `${IMPRESSORAS.length}`);
  ok('id desconhecido devolve null', acharImpressora('h2d') === null);
}

console.log('\n== casco convexo ==');
{
  // Quadrado com um monte de pontos no meio das arestas: o casco tem que reduzir
  // aos 4 cantos, senao a varredura de angulo fica caro para nada.
  const pts: Pt[] = [];
  for (let i = 0; i <= 10; i++) {
    pts.push({ x: i * 10, y: 0 }, { x: 100, y: i * 10 }, { x: i * 10, y: 100 }, { x: 0, y: i * 10 });
  }
  pts.push({ x: 50, y: 50 }, { x: 30, y: 70 }); // internos: nao podem entrar
  const c = cascoConvexo(pts);
  ok('casco de um quadrado da 4 cantos', c.length === 4, `${c.length} pontos`);
  ok('ponto interno fica fora do casco', !c.some((p) => p.x === 50 && p.y === 50));
}

console.log('\n== cabe reto ==');
{
  const v = caberNaMesa(ret(200, 150), 40, X2D);
  ok('200x150 cabe na X2D', v.cabe && v.giro === 0, descreverVeredito(v, X2D));
  ok('sobra medida certo', perto(v.sobraX, 56) && perto(v.sobraY, 106), `${v.sobraX.toFixed(1)}x${v.sobraY.toFixed(1)}`);
  ok('reporta o footprint sem girar', perto(v.w, 200) && perto(v.h, 150), `${v.w.toFixed(0)}x${v.h.toFixed(0)}`);
}
{
  // Exatamente no limite: um erro de um milimetro aqui recusa trabalho que da.
  const v = caberNaMesa(ret(256, 256), 40, X2D);
  ok('256x256 exato cabe na X2D', v.cabe, descreverVeredito(v, X2D));
  ok('folga zero e nao negativa', perto(v.sobraX, 0) && perto(v.sobraY, 0), `${v.sobraX.toFixed(3)}x${v.sobraY.toFixed(3)}`);
}
{
  // A posicao no letreiro nao pode influenciar: o que conta e o tamanho.
  const longe = caberNaMesa(ret(200, 150, 4000, -6000), 40, X2D);
  ok('posicao no letreiro nao muda o veredito', longe.cabe && perto(longe.sobraX, 56), descreverVeredito(longe, X2D));
}
{
  // Peca que cabe deitada nao pode receber conselho de girar. Girar 90 daria mais
  // folga nesta mesa retangular, mas o conselho seria inutil.
  const v = caberNaMesa(ret(150, 140), 40, A2L);
  ok('cabe deitada -> nao manda girar', v.cabe && v.giro === 0, `${v.giro}graus: ${descreverVeredito(v, A2L)}`);
}
{
  // Aqui o giro de 90 e necessario: 310 passa dos 256 de X, mas cabe nos 320 de Y
  // ... numa mesa 256x320 imaginaria. Na A2L: 325x310 nao cabe reto (325>320 em Y),
  // mas girado sim (325<=330 em X, 310<=320 em Y).
  const v = caberNaMesa(ret(310, 325), 40, A2L);
  ok('giro de 90 quando e necessario', v.cabe && v.giro === 90, `${v.giro}graus: ${descreverVeredito(v, A2L)}`);
}

console.log('\n== nao cabe: diz quanto passou ==');
{
  const v = caberNaMesa(ret(260, 260), 40, X2D);
  ok('260x260 nao cabe na X2D', !v.cabe, descreverVeredito(v, X2D));
  ok('passou 4mm em cada eixo', perto(v.sobraX, -4) && perto(v.sobraY, -4), `${v.sobraX.toFixed(1)}, ${v.sobraY.toFixed(1)}`);
  const a = caberNaMesa(ret(260, 260), 40, A2L);
  ok('a mesma peca cabe na A2L', a.cabe, descreverVeredito(a, A2L));
  ok('e a A2L diz quanto sobra', perto(a.sobraX, 70) && perto(a.sobraY, 60), `${a.sobraX.toFixed(0)}x${a.sobraY.toFixed(0)}`);
}

console.log('\n== girar resolve (o que o teste antigo de 0/90 recusava) ==');
{
  // 300x40mm: nao cabe reto nem de lado em 256x256, mas a diagonal da mesa mede
  // 362mm. O Bambu Studio deixa girar na placa, entao recusar seria perder o job.
  const v = caberNaMesa(ret(300, 40), 40, X2D);
  ok('300x40 cabe na X2D girada', v.cabe, descreverVeredito(v, X2D));
  ok('e o giro nao e 0 nem 90', v.giro % 90 !== 0, `${v.giro.toFixed(1)}graus`);

  const soReto = (w: number, h: number, mx: number, my: number) => (w <= mx && h <= my) || (h <= mx && w <= my);
  ok('confirma que a regra antiga recusava', !soReto(300, 40, X2D.x, X2D.y));
}
{
  // Longa demais para qualquer angulo: 400 > 362 (diagonal da mesa).
  const v = caberNaMesa(ret(400, 40), 40, X2D);
  ok('400x40 nao cabe nem girada', !v.cabe, descreverVeredito(v, X2D));
}

console.log('\n== limite de altura em Z ==');
{
  // Era isto que passava calado: o codigo tinha 300mm fixo, e a X2D tem 261.
  const v = caberNaMesa(ret(200, 150), 280, X2D);
  ok('peca de 280mm em Z nao cabe na X2D', !v.cabe, descreverVeredito(v, X2D));
  ok('diz que passou 19mm', perto(v.excedeZ, 19), `${v.excedeZ.toFixed(0)}mm`);
  const a = caberNaMesa(ret(200, 150), 280, A2L);
  ok('a mesma altura cabe na A2L', a.cabe && a.excedeZ === 0, descreverVeredito(a, A2L));
  ok('a regra fixa de 300mm estava errada nas duas', X2D.z !== 300 && A2L.z !== 300, `${X2D.z} e ${A2L.z}`);
}
{
  const v = caberNaMesa(ret(200, 150), 261, X2D);
  ok('altura exata no limite cabe', v.cabe && v.excedeZ === 0, `${v.excedeZ}`);
}

console.log('\n== auto-checagem: o giro prometido tem que funcionar ==');
{
  // Se o veredito diz "cabe a X graus", girar os pontos de verdade por X e medir
  // precisa confirmar. Sem isto eu poderia afirmar um encaixe que falha na mesa.
  const girar = (r: Region, g: number): Region => {
    const rad = (g * Math.PI) / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    return r.map((p) => ({
      outer: p.outer.map((q) => ({ x: q.x * c - q.y * s, y: q.x * s + q.y * c })),
      holes: p.holes.map((h) => h.map((q) => ({ x: q.x * c - q.y * s, y: q.x * s + q.y * c }))),
    }));
  };

  // Formas variadas, inclusive nao-retangulares e em posicoes deslocadas.
  const casos: { nome: string; r: Region }[] = [
    { nome: 'retangulo fino', r: ret(300, 40) },
    { nome: 'retangulo medio', r: ret(240, 200) },
    { nome: 'quadrado no limite', r: ret(256, 256) },
    { nome: 'fora da origem', r: ret(290, 60, -1500, 900) },
    {
      nome: 'triangulo',
      r: buildRegion([[{ x: 0, y: 0 }, { x: 320, y: 0 }, { x: 0, y: 120 }]], 'nonzero'),
    },
    {
      nome: 'L',
      r: buildRegion(
        [[{ x: 0, y: 0 }, { x: 280, y: 0 }, { x: 280, y: 50 }, { x: 60, y: 50 }, { x: 60, y: 230 }, { x: 0, y: 230 }]],
        'nonzero'
      ),
    },
  ];

  let mentiras = 0;
  let confirmados = 0;
  for (const m of IMPRESSORAS) {
    for (const c of casos) {
      const v = caberNaMesa(c.r, 40, m);
      if (!v.cabe) continue;
      const b = regionBounds(girar(c.r, v.giro));
      const serve = b.w <= m.x + 0.02 && b.h <= m.y + 0.02;
      if (serve) confirmados++;
      else {
        mentiras++;
        console.log(`        ${m.id} "${c.nome}": prometeu ${v.giro.toFixed(1)}graus, mas girado mede ${b.w.toFixed(1)}x${b.h.toFixed(1)} em ${m.x}x${m.y}`);
      }
    }
  }
  ok('todo "cabe" se confirma girando a geometria', mentiras === 0, `${confirmados} confirmados, ${mentiras} falsos`);
}
{
  // E o contrario: um "nao cabe" nao pode estar escondendo um angulo que serve.
  const passo = 0.5;
  const casos: Region[] = [ret(400, 40), ret(300, 300), ret(263, 258)];
  let perdidos = 0;
  for (const r of casos) {
    const v = caberNaMesa(r, 40, X2D);
    if (v.cabe) continue;
    const pts = r.flatMap((p) => p.outer);
    for (let g = 0; g < 180; g += passo) {
      const rad = (g * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sen = Math.sin(rad);
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const q of pts) {
        const x = q.x * cos - q.y * sen;
        const y = q.x * sen + q.y * cos;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      if (maxX - minX <= X2D.x - 0.5 && maxY - minY <= X2D.y - 0.5) {
        perdidos++;
        console.log(`        "nao cabe" errado: a ${g}graus mede ${(maxX - minX).toFixed(1)}x${(maxY - minY).toFixed(1)}`);
        break;
      }
    }
  }
  ok('nenhum "nao cabe" esconde um angulo que serve', perdidos === 0, `${perdidos} perdidos`);
}

console.log('\n== texto que o usuario le ==');
{
  const cabe = descreverVeredito(caberNaMesa(ret(200, 150), 40, X2D), X2D);
  const girada = descreverVeredito(caberNaMesa(ret(300, 40), 40, X2D), X2D);
  const nao = descreverVeredito(caberNaMesa(ret(260, 300), 40, X2D), X2D);
  const alto = descreverVeredito(caberNaMesa(ret(200, 150), 280, X2D), X2D);
  console.log(`        cabe reto : ${cabe}`);
  console.log(`        cabe girada: ${girada}`);
  console.log(`        nao cabe  : ${nao}`);
  console.log(`        alto demais: ${alto}`);
  ok('cabe diz quanto sobra', cabe.includes('sobra'));
  ok('girada informa o angulo', girada.includes('girada'));
  ok('nao cabe diz quanto passou em cada eixo', nao.includes('em X') && nao.includes('em Y'), nao);
  ok('altura tem mensagem propria', alto.includes('altura') && alto.includes('261'), alto);
}

console.log(`\n${total - falhas}/${total} passaram\n`);
process.exit(falhas ? 1 : 0);
