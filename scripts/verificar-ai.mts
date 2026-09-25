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
  {
    // Recorte: o retangulo do tamanho da pagina em volta de tudo nao pode virar
    // uma chapa retangular por cima das letras.
    const d = aiPostScriptParaDesenho(['0 0 m', '600 0 L', '600 800 L', '0 800 L', 'h', 'W', 'n',
                                       '0 0 m', '72 0 L', '72 72 L', 'f'].join('\n'));
    const b = regionBounds(regiaoDe(d));
    ok('h W n nao importa o recorte como peca', d.objetos.length === 1 && b.w < 30, `${d.objetos.length} obj, ${b.w.toFixed(0)}mm`);
  }
  {
    // Prolog/Setup guardam azulejo de padrao, amostra de gradiente e a fonte
    // embutida -- tudo com m/l/c/f de verdade. Colher ali importa azulejo.
    const d = aiPostScriptParaDesenho([
      '%%BeginSetup',
      '%AI3_BeginPattern: (xadrez)',
      '0 0 m', '999 0 L', '999 999 L', '0 999 L', 'f',
      '%AI3_EndPattern',
      '%%EndSetup',
      '0 0 m', '72 0 L', '72 72 L', '0 72 L', 'f',
    ].join('\n'));
    const b = regionBounds(regiaoDe(d));
    ok('nao colhe desenho do %%BeginSetup', d.objetos.length === 1 && perto(b.w, 25.4, 0.01), `${d.objetos.length} obj, ${b.w.toFixed(1)}mm`);
  }
  {
    const d = aiPostScriptParaDesenho(['(N) *', '0 0 m', '999 0 L', '999 999 L', 'f', '(N) *',
                                       '0 0 m', '72 0 L', '72 72 L', '0 72 L', 'f'].join('\n'));
    ok('guia (N) * fica de fora', d.objetos.length === 1, `${d.objetos.length} objeto(s)`);
  }

  console.log('\n== varios operadores na mesma linha (o Illustrator empacota) ==');
  {
    // O CorelDRAW escreve um operador por linha; o Illustrator nao. Ler por linha
    // funciona so por sorte com um dos dois.
    const d = aiPostScriptParaDesenho('0 J 0 j 1 w 4 M []0 d 0 0 m 72 0 L 72 72 L 0 72 L f');
    const b = regionBounds(regiaoDe(d));
    ok('le tudo numa linha unica', d.objetos.length === 1 && perto(b.w, 25.4, 0.01), `${d.objetos.length} obj, ${b.w.toFixed(2)}mm`);
  }
  {
    const d = aiPostScriptParaDesenho('0 0 m 0 40 40 40 40 0 C f');
    ok('curva empacotada mantem os 6 numeros', (d.objetos[0]?.contours[0]?.pts.length ?? 0) > 5, `${d.objetos[0]?.contours[0]?.pts.length} pontos`);
  }
  {
    // Operador desconhecido descarta os operandos dele, em vez de deixar numeros
    // vazarem para o caminho seguinte.
    const d = aiPostScriptParaDesenho('0 1 0 0 0 Xy 1 2 3 4 5 XW 0 0 m 72 0 L 72 72 L 0 72 L f');
    const b = regionBounds(regiaoDe(d));
    ok('operando de operador desconhecido nao vaza', perto(b.w, 25.4, 0.01), `${b.w.toFixed(2)}mm`);
  }
  {
    // 'M' e setmiterlimit. Se fosse lido como um moveto em caixa alta, abriria um
    // subpath fantasma a 22.9pt da origem.
    const d = aiPostScriptParaDesenho(['22.9256 M', '0 0 m', '72 0 L', '72 72 L', '0 72 L', 'f'].join('\n'));
    ok('M e setmiterlimit, nao moveto', d.objetos.length === 1 && d.objetos[0]!.contours.length === 1,
       `${d.objetos[0]?.contours.length} contorno(s)`);
  }
  {
    const d = aiPostScriptParaDesenho(['(50% cinza nao e comentario) Ln', '0 0 m', '72 0 L', '72 72 L', '0 72 L', 'f'].join('\n'));
    ok('% dentro de string nao corta a linha', d.objetos.length === 1, `${d.objetos.length} objeto(s)`);
  }

  console.log('\n== XR escolhe a regra de preenchimento ==');
  {
    // Dois quadrados concentricos no MESMO sentido. Com even-odd o de dentro e
    // buraco; com non-zero o miolo fecha -- a letra sairia macica em silencio.
    const anel = (regra: string) => {
      const d = aiPostScriptParaDesenho([
        regra,
        '*u',
        '0 0 m', '100 0 L', '100 100 L', '0 100 L', 'f',
        '25 25 m', '75 25 L', '75 75 L', '25 75 L', 'f',
        '*U',
      ].join('\n'));
      return d;
    };
    const eo = anel('1 XR');
    const nz = anel('0 XR');
    ok('1 XR vira even-odd', eo.objetos[0]?.fillRule === 'evenodd', `${eo.objetos[0]?.fillRule}`);
    ok('0 XR vira nonzero', nz.objetos[0]?.fillRule === 'nonzero', `${nz.objetos[0]?.fillRule}`);
    const pEO = desenhoParaPecas(eo, { modo: 'forma', incluirTracos: false, fundirProximos: 0, areaMinima: 0.1 });
    const pNZ = desenhoParaPecas(nz, { modo: 'forma', incluirTracos: false, fundirProximos: 0, areaMinima: 0.1 });
    const furosEO = pEO[0]?.region.reduce((a, p) => a + p.holes.length, 0) ?? 0;
    const furosNZ = pNZ[0]?.region.reduce((a, p) => a + p.holes.length, 0) ?? 0;
    ok('even-odd abre o miolo', furosEO === 1, `${furosEO} furo(s)`);
    ok('non-zero fecha o miolo (mesmo sentido)', furosNZ === 0, `${furosNZ} furo(s)`);
  }
  {
    // Even-odd e regra DE UM objeto, nao do conjunto: duas formas even-odd que se
    // sobrepoem nao podem se cancelar quando as pecas sao unidas.
    const d = aiPostScriptParaDesenho([
      '1 XR',
      '0 0 m', '100 0 L', '100 100 L', '0 100 L', 'f',
      '50 0 m', '150 0 L', '150 100 L', '50 100 L', 'f',
    ].join('\n'));
    const pecas = desenhoParaPecas(d, { modo: 'forma', incluirTracos: false, fundirProximos: 0, areaMinima: 0.1 });
    const esperado = 150 * 100 * MM * MM; // uniao, nao a parte sobreposta cancelada
    const area = pecas.reduce((a, p) => a + regionArea(p.region), 0);
    ok('even-odd nao cancela entre objetos distintos', perto(area, esperado, 1), `${area.toFixed(0)} vs ${esperado.toFixed(0)}mm2`);
  }

  console.log('\n== texto vivo: detectado por marcador, nao por acaso ==');
  {
    const d = aiPostScriptParaDesenho(['0 0 m', '72 0 L', '72 72 L', '0 72 L', 'f'].join('\n'));
    ok('desenho sem texto nao dispara o aviso', !d.temTextoVivo);
  }
  {
    // A fonte embutida vem em ASCII85 dentro de %%BeginData, e linhas dela comecam
    // com sequencias como %TXX por puro acaso. Isso nao e texto vivo.
    const d = aiPostScriptParaDesenho([
      '%%BeginData: 2 Hex Bytes',
      '%TXXt%QGEV&N6;G+K[gM3JCP\\AH.=MNEn!2[CstlgA^XBo?dW">1$e',
      '%%EndData',
      '0 0 m', '72 0 L', '72 72 L', '0 72 L', 'f',
    ].join('\n'));
    ok('lixo da fonte embutida nao e texto vivo', !d.temTextoVivo);
  }
  {
    const d = aiPostScriptParaDesenho(['%AI11_BeginTextDocument', '%AI11_EndTextDocument',
                                       '0 0 m', '72 0 L', '72 72 L', '0 72 L', 'f'].join('\n'));
    ok('%AI11_BeginTextDocument e texto vivo', d.temTextoVivo && d.avisos.some((a) => a.codigo === 'texto-vivo'));
  }
  {
    const d = aiPostScriptParaDesenho(['0 To', '(BARBER) Tx', 'TO', '0 0 m', '72 0 L', '72 72 L', 'f'].join('\n'));
    ok('To/Tx classicos tambem sao texto vivo', d.temTextoVivo);
  }

  console.log('\n== .ai nativo do Illustrator (fluxo unico comprimido) ==');
  {
    // Illustrator CS2+: sem filtro de PDF, blocos fatiados de um fluxo so, com
    // marcador na frente. Tem que concatenar ANTES de descomprimir.
    const ps = ['%!PS-Adobe-3.0', '0 0 m', '72 0 L', '72 72 L', '0 72 L', 'f'].join('\n');
    const cs = new CompressionStream('deflate');
    const comprimido = new Uint8Array(
      await new Response(new Blob([new TextEncoder().encode(ps)]).stream().pipeThrough(cs)).arrayBuffer()
    );
    const marcador = '%AI12_CompressedData';
    const corpo = new Uint8Array(marcador.length + comprimido.length);
    corpo.set(new TextEncoder().encode(marcador), 0);
    corpo.set(comprimido, marcador.length);

    // Fatia em dois blocos, como o Illustrator faz num arquivo grande.
    const meio = Math.floor(corpo.length / 2);
    const montar = (fatias: Uint8Array[]) => {
      const cab = `%PDF-1.5\n1 0 obj\n<< /AIPrivateData1 2 0 R /AIPrivateData2 3 0 R /NumBlock 2 >>\nendobj\n`;
      const pedacos: Uint8Array[] = [new TextEncoder().encode(cab)];
      fatias.forEach((f, k) => {
        pedacos.push(new TextEncoder().encode(`${k + 2} 0 obj\n<< /Length ${f.length} >>\nstream\n`));
        pedacos.push(f);
        pedacos.push(new TextEncoder().encode('\nendstream\nendobj\n'));
      });
      const total = pedacos.reduce((a, p) => a + p.length, 0);
      const out = new Uint8Array(total);
      let i = 0;
      for (const p of pedacos) { out.set(p, i); i += p.length; }
      return out.buffer as ArrayBuffer;
    };

    const lido = await extrairAIPrivateData(montar([corpo.subarray(0, meio), corpo.subarray(meio)]));
    ok('descomprime o fluxo unico do Illustrator', !!lido && lido.includes('%!PS'), lido ? `${lido.length} bytes` : 'NULL');
    if (lido) {
      const b = regionBounds(regiaoDe(aiPostScriptParaDesenho(lido)));
      ok('o desenho volta certo do .ai nativo', perto(b.w, 25.4, 0.01), `${b.w.toFixed(2)}mm`);
    }
  }
  {
    // Ordem dos blocos e pelo NUMERO: em texto, AIPrivateData10 vem antes de 2.
    const nums = ['/AIPrivateData10 4 0 R', '/AIPrivateData2 3 0 R', '/AIPrivateData1 2 0 R'];
    const ordem = [...nums.join(' ').matchAll(/\/AIPrivateData(\d*)\s+(\d+)\s+0\s+R/g)]
      .map((m) => (m[1] ? parseInt(m[1], 10) : 0))
      .sort((a, b) => a - b);
    ok('blocos ordenados por numero, nao alfabeticamente', JSON.stringify(ordem) === '[1,2,10]', JSON.stringify(ordem));
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
