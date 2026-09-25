/**
 * Leitura do PostScript embutido no .ai.
 *   npx tsx scripts/verificar-ai.mts
 *
 * O .ai exportado pelo CorelDRAW traz a pagina do PDF vazia e o desenho inteiro
 * num bloco `AIPrivateData`. Estes testes cobrem os dois lados: tirar o
 * PostScript de dentro do arquivo e interpretar os operadores.
 */
import fs from 'fs';
import { extrairAIPrivateData } from '../lib/import/ai-priv';
import { aiPostScriptParaDesenho } from '../lib/import/ai-ps';
import { desenhoParaPecas } from '../lib/import/pecas';
import { regionArea, regionBounds, buildRegion } from '../lib/geom/region';
import { parseFont, textToLetters } from '../lib/text/glyphs';

let falhas = 0;
let total = 0;
const ok = (nome: string, cond: boolean, detalhe = '') => {
  total++;
  if (!cond) falhas++;
  console.log(`${cond ? '  ok  ' : ' FALHA'}  ${nome}${detalhe ? '  -> ' + detalhe : ''}`);
};
const perto = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

const MM = 25.4 / 72;
const regiaoDe = (d: ReturnType<typeof aiPostScriptParaDesenho>) =>
  buildRegion(d.objetos.flatMap((o) => o.contours.filter((c) => c.pts.length >= 3).map((c) => c.pts)), 'nonzero');

async function main() {
  console.log('\n== operadores de caminho ==');
  {
    // Quadrado de 72pt = 25.4mm, com os operadores do formato AI.
    const d = aiPostScriptParaDesenho(['0 0 m', '72 0 L', '72 72 L', '0 72 L', 'f'].join('\n'));
    const b = regionBounds(regiaoDe(d));
    ok('quadrado de 72pt vira 25.4mm', perto(b.w, 25.4, 0.01) && perto(b.h, 25.4, 0.01), `${b.w.toFixed(2)}x${b.h.toFixed(2)}`);
    ok('registra como preenchido', d.temFill);
  }
  {
    const d = aiPostScriptParaDesenho(['0 0 m', '0 40 40 40 40 0 C', 'f'].join('\n'));
    ok('curva C vira polilinha', (d.objetos[0]?.contours[0]?.pts.length ?? 0) > 5, `${d.objetos[0]?.contours[0]?.pts.length} pontos`);
  }
  {
    // v usa o ponto atual como 1o controle; y usa o final como 2o
    const dv = aiPostScriptParaDesenho(['0 0 m', '40 40 40 0 V', 'f'].join('\n'));
    const dy = aiPostScriptParaDesenho(['0 0 m', '0 40 40 0 Y', 'f'].join('\n'));
    ok('curva V aceita 4 numeros', (dv.objetos[0]?.contours[0]?.pts.length ?? 0) > 5);
    ok('curva Y aceita 4 numeros', (dy.objetos[0]?.contours[0]?.pts.length ?? 0) > 5);
  }
  {
    const d = aiPostScriptParaDesenho(['2 w', '0 0 m', '100 0 L', 's'].join('\n'));
    ok('s marca contorno, nao preenchimento', d.temStroke && !d.temFill);
    ok('largura do traco vira mm', perto(d.objetos[0]?.larguraMm ?? 0, 2 * MM, 0.01), `${d.objetos[0]?.larguraMm.toFixed(3)}mm`);
  }

  console.log('\n== caminho composto vira buraco, nao peca separada ==');
  {
    const ps = [
      '*u',
      '0 0 m', '100 0 L', '100 100 L', '0 100 L', 'f',
      '25 25 m', '25 75 L', '75 75 L', '75 25 L', 'f',
      '*U',
    ].join('\n');
    const d = aiPostScriptParaDesenho(ps);
    ok('os dois subpaths viram UM objeto', d.objetos.length === 1, `${d.objetos.length} objeto(s)`);
    const pecas = desenhoParaPecas(d, { modo: 'forma', incluirTracos: false, fundirProximos: 0, areaMinima: 0.1 });
    ok('sai uma peca so', pecas.length === 1, `${pecas.length} peca(s)`);
    const furos = pecas[0]?.region.reduce((a, p) => a + p.holes.length, 0) ?? 0;
    ok('com o miolo como buraco', furos === 1, `${furos} furo(s)`);
    const esperado = (100 * 100 - 50 * 50) * MM * MM;
    ok('area desconta o miolo', perto(regionArea(pecas[0]!.region), esperado, 1), `${regionArea(pecas[0]!.region).toFixed(0)} vs ${esperado.toFixed(0)}mm2`);
  }

  console.log('\n== o que deve ser ignorado ==');
  {
    const d = aiPostScriptParaDesenho([
      '%!PS-Adobe-3.0',
      '%%BeginData: 4 Hex Bytes',
      '%FEFE 0 0 m 999 999 L f',   // lixo do thumbnail: nao pode virar geometria
      '%%EndData',
      '0.5 0.2 0.1 1 K', '0 J', '0 j', '4 M', '[]0 d', '1 XR',
      '0 0 m', '72 0 L', '72 72 L', 'f',
    ].join('\n'));
    const b = regionBounds(regiaoDe(d));
    ok('pula o thumbnail em hex', d.objetos.length === 1 && b.w < 30, `${d.objetos.length} objeto(s), ${b.w.toFixed(1)}mm`);
    ok('ignora cor e estilo de traco', d.objetos.length === 1);
  }
  {
    const d = aiPostScriptParaDesenho(['0 0 m', '72 0 L', '72 72 L', 'n'].join('\n'));
    ok('n descarta (caminho de recorte)', d.objetos.length === 0, `${d.objetos.length} objeto(s)`);
  }

  console.log('\n== ida e volta: glifo -> PostScript AI -> de volta ==');
  {
    const b = fs.readFileSync('C:/Windows/Fonts/arialbd.ttf');
    const font = parseFont(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
    const letra = textToLetters(font, 'B', { altura: 50 })[0]!;
    const areaOrig = regionArea(letra.region);
    const K = 72 / 25.4;

    const ops: string[] = ['*u'];
    for (const poly of letra.region) {
      for (const anel of [poly.outer, ...poly.holes]) {
        ops.push(`${(anel[0]!.x * K).toFixed(4)} ${(anel[0]!.y * K).toFixed(4)} m`);
        for (const p of anel.slice(1)) ops.push(`${(p.x * K).toFixed(4)} ${(p.y * K).toFixed(4)} L`);
        ops.push('f');
      }
    }
    ops.push('*U');
    const d = aiPostScriptParaDesenho(ops.join('\n'));
    const volta = regiaoDe(d);
    ok('letra B volta com 2 buracos', volta[0]?.holes.length === 2, `${volta[0]?.holes.length}`);
    ok('area preservada', perto(regionArea(volta), areaOrig, areaOrig * 0.002), `${regionArea(volta).toFixed(1)} vs ${areaOrig.toFixed(1)} mm2`);
  }

  console.log('\n== o arquivo real do cliente ==');
  {
    const caminho = 'C:/Users/Administrador/Downloads/barber ai.ai';
    if (!fs.existsSync(caminho)) {
      console.log('  (pulado: arquivo de amostra nao esta nesta maquina)');
    } else {
      const b = fs.readFileSync(caminho);
      const ps = await extrairAIPrivateData(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
      ok('extrai o PostScript de dentro do .ai', !!ps && ps.length > 100000, ps ? `${(ps.length / 1024).toFixed(0)}KB` : 'NULL');
      if (ps) {
        const d = aiPostScriptParaDesenho(ps);
        ok('encontra os objetos de desenho', d.objetos.length > 0, `${d.objetos.length} objetos`);
        const pecas = desenhoParaPecas(d, { modo: 'forma', incluirTracos: false, fundirProximos: 0, areaMinima: 1 });
        ok('separa em pecas', pecas.length > 0, `${pecas.length} pecas`);
        const comFuro = pecas.filter((p) => p.region.some((x) => x.holes.length)).length;
        ok('pecas com contra-forma sao detectadas', comFuro > 0, `${comFuro} peca(s) com furo`);

        // O proprio arquivo declara o tamanho em %%BoundingBox: e a melhor prova de
        // que a leitura esta certa. Medir sobre TODOS os objetos lidos, porque a
        // separacao em pecas descarta tracos de proposito (linha de corte, guia).
        const decl = ps.match(/%%BoundingBox:\s*(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+)/);
        if (decl) {
          const [x0, , x1] = [Number(decl[1]), Number(decl[2]), Number(decl[3])];
          const larguraDeclarada = (x1! - x0!) * MM;
          const lido = regionBounds(d.objetos.flatMap((o) => o.contours.map((c) => ({ outer: c.pts, holes: [] }))));
          ok('tamanho bate com o %%BoundingBox do arquivo', perto(lido.w, larguraDeclarada, 1),
             `${lido.w.toFixed(0)}mm vs ${larguraDeclarada.toFixed(0)}mm declarados`);
        }

        const comTracos = desenhoParaPecas(d, { modo: 'forma', incluirTracos: true, fundirProximos: 0, areaMinima: 1 });
        ok('tracos entram so quando pedidos', comTracos.length > pecas.length,
           `${comTracos.length} com tracos vs ${pecas.length} sem`);
        ok('avisa que ha texto nao convertido', d.temTextoVivo);
      }
    }
  }

  console.log(`\n${total - falhas}/${total} passaram\n`);
  process.exit(falhas ? 1 : 0);
}
main();
