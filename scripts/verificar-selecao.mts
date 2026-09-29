/**
 * Selecao multipla e grupos: Ctrl/Shift, grupo que seleciona junto, e transformar
 * varias pecas como um corpo so.
 *   npx tsx scripts/verificar-selecao.mts
 */
import { clicar } from '../lib/cena/selecao';
import { montarPlaca, juntar } from '../lib/print/placa';
import { gerar3mf } from '../lib/export/tresmf';
import { volumeMalha } from '../lib/import/stl';
import { agrupar, centroDe, desagrupar, grupoDe, limparGrupos, transformarConjunto, type Grupo, type Pt } from '../lib/cena/grupo';

let falhas = 0;
let total = 0;
const ok = (nome: string, cond: boolean, detalhe = '') => {
  total++;
  if (!cond) falhas++;
  console.log(`${cond ? '  ok  ' : ' FALHA'}  ${nome}${detalhe ? '  -> ' + detalhe : ''}`);
};
const perto = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) <= tol;
const igual = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x));

const ordem = ['a', 'b', 'c', 'd', 'e'];

console.log('\n== clique ==');
{
  ok('clique simples pega so a peca', igual(clicar(['a', 'b'], 'c', {}, [], ordem), ['c']));
  const s1 = clicar(['a'], 'c', { ctrl: true }, [], ordem);
  ok('Ctrl soma', igual(s1, ['a', 'c']) && s1[s1.length - 1] === 'c', s1.join(','));
  ok('Ctrl de novo tira', igual(clicar(s1, 'c', { ctrl: true }, [], ordem), ['a']));
  ok('Shift pega o intervalo na ordem do painel', igual(clicar(['b'], 'd', { shift: true }, [], ordem), ['b', 'c', 'd']));
  ok('Shift para tras tambem', igual(clicar(['d'], 'b', { shift: true }, [], ordem), ['b', 'c', 'd']));
  ok('Ctrl+Shift soma o intervalo ao que ja tinha', igual(clicar(['a', 'c'], 'e', { shift: true, ctrl: true }, [], ordem), ['a', 'c', 'd', 'e']));
  ok('Shift sem nada selecionado vira clique simples', igual(clicar([], 'c', { shift: true }, [], ordem), ['c']));
}

console.log('\n== grupos ==');
{
  let g: Grupo[] = agrupar([], ['a', 'b'], 'g1', 'Grupo 1');
  ok('agrupar cria o grupo', g.length === 1 && igual(g[0]!.membros, ['a', 'b']));
  ok('clique numa peca do grupo seleciona o grupo', igual(clicar([], 'a', {}, g, ordem), ['a', 'b']));
  ok('pelo painel da para pegar so o membro', igual(clicar([], 'a', { soAPeca: true }, g, ordem), ['a']));
  ok('Ctrl num grupo ja marcado tira o grupo todo', igual(clicar(['a', 'b', 'c'], 'b', { ctrl: true }, g, ordem), ['c']));
  ok('menos de 2 pecas nao forma grupo', agrupar([], ['a'], 'x', 'X').length === 0);
  ok('agrupar o mesmo conjunto de novo nao duplica', agrupar(g, ['b', 'a'], 'g2', 'Grupo 2').length === 1);
  g = agrupar(g, ['b', 'c'], 'g2', 'Grupo 2');
  ok('peca so fica em um grupo: o antigo com 1 se desfaz', g.length === 1 && g[0]!.id === 'g2' && !grupoDe(g, 'a'));
  g = agrupar(g, ['d', 'e'], 'g3', 'Grupo 3');
  ok('desagrupar tira so o grupo das chaves', igual(desagrupar(g, ['e']).map((x) => x.id), ['g2']));
  const vivo = limparGrupos(g, new Set(['a', 'b', 'c', 'd']));
  ok('excluir membro limpa o grupo; grupo de 1 se desfaz', vivo.length === 1 && vivo[0]!.id === 'g2');
  ok('sem mudanca, limpar devolve o mesmo array', limparGrupos(g, new Set(ordem)) === g);
}

console.log('\n== transformar varios como um corpo so ==');
{
  const anc = new Map<string, Pt>([['a', { x: 0, y: 0 }], ['b', { x: 100, y: 0 }]]);
  const c = centroDe(anc.values());
  ok('centro da selecao', perto(c.x, 50) && perto(c.y, 0));

  const mov = transformarConjunto(anc, c, { tx: 10, ty: -5, giro: 0, sx: 1, sy: 1 });
  ok('mover soma igual em todas', [...mov.values()].every((d) => perto(d.dx, 10) && perto(d.dy, -5) && d.giro === 0));

  const gir = transformarConjunto(anc, c, { tx: 0, ty: 0, giro: 90, sx: 1, sy: 1 });
  const na = { x: 0 + gir.get('a')!.dx, y: 0 + gir.get('a')!.dy };
  const nb = { x: 100 + gir.get('b')!.dx, y: 0 + gir.get('b')!.dy };
  ok('girar 90: a vai para baixo do centro, b para cima', perto(na.x, 50) && perto(na.y, -50) && perto(nb.x, 50) && perto(nb.y, 50), `a(${na.x.toFixed(1)},${na.y.toFixed(1)}) b(${nb.x.toFixed(1)},${nb.y.toFixed(1)})`);
  ok('cada peca tambem gira no proprio lugar', gir.get('a')!.giro === 90 && gir.get('b')!.giro === 90);
  ok('a distancia entre elas se mantem', perto(Math.hypot(nb.x - na.x, nb.y - na.y), 100));

  const esc = transformarConjunto(anc, c, { tx: 0, ty: 0, giro: 0, sx: 2, sy: 2 });
  const ea = 0 + esc.get('a')!.dx;
  const eb = 100 + esc.get('b')!.dx;
  ok('escala 2x dobra a distancia a partir do centro', perto(eb - ea, 200) && perto((ea + eb) / 2, 50) && esc.get('a')!.ex === 2);

  // Tres pecas, giro qualquer: o centro nao sai do lugar.
  const tri = new Map<string, Pt>([['a', { x: 3, y: 7 }], ['b', { x: 40, y: -12 }], ['c', { x: -25, y: 30 }]]);
  const ct = centroDe(tri.values());
  const d = transformarConjunto(tri, ct, { tx: 0, ty: 0, giro: 37, sx: 1, sy: 1 });
  const novo = centroDe([...tri].map(([k, p]) => ({ x: p.x + d.get(k)!.dx, y: p.y + d.get(k)!.dy })));
  ok('girar em volta do centro nao desloca o conjunto', perto(novo.x, ct.x, 1e-9) && perto(novo.y, ct.y, 1e-9));
}

console.log('\n== exportar a selecao ==');
{
  const JSZip = (await import('jszip')).default;
  // Cubo de 10 mm em triangulos, deslocado em x.
  const cubo = (ox: number): Float32Array => {
    const v = (x: number, y: number, z: number) => [ox + x * 10, y * 10, z * 10];
    const q = (a: number[], b: number[], c: number[], d: number[]) => [...a, ...b, ...c, ...a, ...c, ...d];
    const p = [v(0, 0, 0), v(1, 0, 0), v(1, 1, 0), v(0, 1, 0), v(0, 0, 1), v(1, 0, 1), v(1, 1, 1), v(0, 1, 1)];
    return new Float32Array([
      ...q(p[0]!, p[3]!, p[2]!, p[1]!), ...q(p[4]!, p[5]!, p[6]!, p[7]!), ...q(p[0]!, p[1]!, p[5]!, p[4]!),
      ...q(p[1]!, p[2]!, p[6]!, p[5]!), ...q(p[2]!, p[3]!, p[7]!, p[6]!), ...q(p[3]!, p[0]!, p[4]!, p[7]!),
    ]);
  };
  const quadrado = (ox: number) => [{ outer: [{ x: ox, y: 0 }, { x: ox + 10, y: 0 }, { x: ox + 10, y: 10 }, { x: ox, y: 10 }], holes: [] }];
  const pecas = ['a', 'b', 'c'].map((k, i) => ({ chave: k, nome: k, posicoes: cubo(i * 30), contorno: quadrado(i * 30) }));
  const sel = ['a', 'c'];
  const objs = montarPlaca(pecas.filter((p) => sel.includes(p.chave)), sel.map((k) => ({ nome: k, dx: 0, dy: 0, giro: 0 })));
  ok('so as pecas selecionadas saem', objs.length === 2);
  ok('na posicao do letreiro (sem arranjo, nada se move)', objs[1]!.posicoes[0] === pecas[2]!.posicoes[0]);
  ok('STL da selecao tem o volume das duas', perto(volumeMalha(juntar(objs)), 2000, 1e-6), `${volumeMalha(juntar(objs)).toFixed(1)} mm3`);
  const zip = await JSZip.loadAsync(await (await gerar3mf(objs)).arrayBuffer());
  const xml = await zip.file('3D/3dmodel.model')!.async('string');
  ok('3MF da selecao: um objeto por peca', (xml.match(/<object /g) ?? []).length === 2);
}

console.log(`\n${total - falhas}/${total} passaram\n`);
process.exit(falhas ? 1 : 0);
