/**
 * Palavra de parede: uma palavra cursiva inteira, de uma cor, para pendurar. As letras que nao
 * se tocam ganham uma ligacao curta (sai uma peca so) e atras ficam furos de prego em
 * fechadura: o prego entra no furo largo e a peca desce ate o rasgo estreito.
 */
import { diffRegion, intersectRegion, regionBounds, scaleRegion, translateRegion, type Pt, type Region } from '../../geom/region';
import { trechos } from '../fatias';
import { comporLinhas, contornar, unir } from '../formas';
import { ligarPedacos } from '../nome-conectado';
import { ficha } from './fichas';
import type { Parametro, Receita, Resultado } from '../tipos';
import { num, txt } from '../tipos';

const mm = (id: string, rotulo: string, grupo: string, padrao: number, min: number, max: number, passo = 0.5, dica?: string): Parametro =>
  ({ tipo: 'numero', id, rotulo, grupo, padrao, min, max, passo, unidade: 'mm', dica });

/**
 * Furo de prego: raio do furo largo (cabeca do prego), meia largura do rasgo (corpo do prego),
 * quanto o rasgo sobe, alturas da boca e do canal da cabeca, e margem ate a borda da letra, mm.
 */
const CABECA = 3, RASGO = 1.4, CURSO = 8, BOCA = 1.2, CANAL = 2.4, MARGEM = 1;

/** Faixa de largura `w` com pontas redondas de `a` ate `b`. */
function capsula(a: Pt, b: Pt, w: number): Region {
  const ang = Math.atan2(b.y - a.y, b.x - a.x), r = w / 2, n = 12;
  const meia = (c: Pt, a0: number) => Array.from({ length: n + 1 }, (_, i) => {
    const t = a0 + (Math.PI * i) / n;
    return { x: c.x + r * Math.cos(t), y: c.y + r * Math.sin(t) };
  });
  return [{ outer: [...meia(b, ang - Math.PI / 2), ...meia(a, ang + Math.PI / 2)], holes: [] }];
}

/** O x dentro dos trechos mais perto de `x`. */
const maisPerto = (tr: [number, number][], x: number) =>
  tr.map(([x0, x1]) => Math.min(Math.max(x, x0), x1)).sort((p, q) => Math.abs(p - x) - Math.abs(q - x))[0];

/**
 * Onde cabem os furos de prego (o furo largo e o rasgo subindo), o mais perto possivel dos alvos:
 * de preferencia todos na mesma altura, para os pregos ficarem nivelados; senao cada um onde der.
 */
function lugaresDosFuros(r: Region, alvos: Pt[]): Pt[] {
  const area = contornar(r, -(CABECA + MARGEM));
  const cabe = intersectRegion(intersectRegion(area, translateRegion(area, 0, -CURSO)), translateRegion(area, 0, -CURSO / 2));
  if (!cabe.length) return [];
  const b = regionBounds(cabe), linhas: { y: number; tr: [number, number][] }[] = [];
  for (let y = b.minY; y <= b.maxY; y += 0.5) linhas.push({ y, tr: trechos(cabe, y) });
  const custo = (p: Pt, a: Pt) => Math.abs(p.x - a.x) + 2 * Math.abs(p.y - a.y);
  const longe = (x: number, pontos: Pt[]) => pontos.every((q) => Math.abs(x - q.x) >= 6 * CABECA);
  let melhor: { pontos: Pt[]; custo: number } | null = null;
  for (const { y, tr } of linhas) {
    const pontos: Pt[] = [];
    for (const a of alvos) {
      const x = maisPerto(tr, a.x);
      if (x !== undefined && longe(x, pontos)) pontos.push({ x, y });
    }
    if (pontos.length < alvos.length) continue;
    const c = pontos.reduce((soma, p, i) => soma + custo(p, alvos[i]!), 0);
    if (!melhor || c < melhor.custo) melhor = { pontos, custo: c };
  }
  if (melhor) return melhor.pontos;
  const pontos: Pt[] = [];
  for (const a of alvos) {
    let m: { p: Pt; c: number } | null = null;
    for (const { y, tr } of linhas) {
      const x = maisPerto(tr, a.x);
      if (x === undefined || !longe(x, pontos)) continue;
      const c = custo({ x, y }, a);
      if (!m || c < m.c) m = { p: { x, y }, c };
    }
    if (m) pontos.push(m.p);
  }
  return pontos.length < alvos.length && alvos.length > 1 ? lugaresDosFuros(r, [{ x: (alvos[0]!.x + alvos.at(-1)!.x) / 2, y: alvos[0]!.y }]) : pontos;
}

export const arteParede: Receita = {
  ...ficha('arte-parede'),
  parametros: [
    { tipo: 'texto', id: 'texto', rotulo: 'Palavra', grupo: 'Texto', padrao: 'Amor', maxCaracteres: 24 },
    { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte', grupo: 'Texto', padrao: 'pacifico' },
    mm('largura', 'Largura da palavra', 'Texto', 240, 80, 250, 5, 'De uma ponta à outra'),
    { tipo: 'numero', id: 'espacamento', rotulo: 'Espaço entre letras', grupo: 'Texto', padrao: 100, min: 70, max: 150, passo: 1, unidade: '%', dica: '100% é o espaço da própria fonte' },
    mm('espessura', 'Espessura', 'Peça', 6, 3, 15),
    mm('ponte', 'Largura das ligações', 'Peça', 3, 1.5, 8, 0.5, 'Liga as letras que não se tocam, para sair uma peça só'),
    {
      tipo: 'escolha', id: 'fixacao', rotulo: 'Fixação', grupo: 'Peça', padrao: 'pregos',
      opcoes: [{ valor: 'pregos', rotulo: 'Furos de prego atrás' }, { valor: 'fita', rotulo: 'Sem furo (fita dupla-face)' }],
    },
    { tipo: 'cor', id: 'cor', rotulo: 'Cor', grupo: 'Cores', padrao: '#f5f0e6' },
  ],
  fontes: (v) => [txt(v, 'fonte')],
  gerar(v, ctx): Resultado {
    const cores = ['Palavra'], hex = [txt(v, 'cor')];
    const texto = txt(v, 'texto').trim();
    if (!texto) return { itens: [], cores, hex, avisos: ['Digite a palavra.'] };
    const t = comporLinhas([{ texto, fonte: ctx.fonte(txt(v, 'fonte')), altura: 50, espacamento: num(v, 'espacamento') / 100 }], 0);
    if (!t.letras.length) return { itens: [], cores, hex, avisos: ['Esta fonte não tem as letras da palavra.'] };
    const solta = unir([scaleRegion(t.regiao, num(v, 'largura') / t.bounds.w)]);
    const regiao = ligarPedacos(solta, num(v, 'ponte') / 2), ligacoes = solta.length - regiao.length;
    const b = regionBounds(regiao), esp = num(v, 'espessura');
    const avisos: string[] = [], notas = ['Imprima com a frente para cima: os furos de prego ficam atrás.'];
    if (ligacoes) notas.push(`${ligacoes} ligação(ões) entre letras que não se tocavam.`);
    let camadas = [{ region: regiao, z0: 0, z1: esp }];
    if (txt(v, 'fixacao') === 'pregos') {
      const qtd = b.w < 120 ? 1 : 2, yAlvo = b.minY + b.h * 0.6;
      const furos = lugaresDosFuros(regiao, Array.from({ length: qtd }, (_, i) => ({ x: b.minX + (b.w * (i + 0.5)) / qtd, y: yAlvo })));
      const topo = BOCA + CANAL;
      if (esp < topo + 1.2) avisos.push(`A peça é fina para o furo de prego: use pelo menos ${(topo + 1.2).toFixed(1)} mm de espessura ou fixe com fita.`);
      else if (!furos.length) avisos.push('Não coube furo de prego nas letras: aumente a palavra ou fixe com fita.');
      else {
        const boca = unir(furos.flatMap((p) => [capsula(p, p, 2 * CABECA), capsula(p, { x: p.x, y: p.y + CURSO }, 2 * RASGO)]));
        const canal = unir(furos.map((p) => capsula(p, { x: p.x, y: p.y + CURSO }, 2 * CABECA)));
        camadas = [{ region: diffRegion(regiao, boca), z0: 0, z1: BOCA }, { region: diffRegion(regiao, canal), z0: BOCA, z1: topo }, { region: regiao, z0: topo, z1: esp }];
        if (furos.length === 2) {
          const dy = furos[1]!.y - furos[0]!.y, dx = (furos[1]!.x - furos[0]!.x).toFixed(0);
          notas.push(Math.abs(dy) < 0.25 ? `Pregos na mesma altura, a ${dx} mm um do outro.` : `Pregos a ${dx} mm um do outro, o da direita ${Math.abs(dy).toFixed(0)} mm mais ${dy > 0 ? 'alto' : 'baixo'}.`);
        }
        if (furos.length < qtd) avisos.push('Só coube 1 furo de prego: a peça pode girar na parede.');
      }
    }
    if (b.w > 256 || b.h > 256) avisos.push(`A palavra tem ${b.w.toFixed(0)} x ${b.h.toFixed(0)} mm: passa da mesa de 256 mm.`);
    return { itens: [{ nome: texto, pecas: [{ nome: 'Palavra', cor: 0, camadas }] }], cores, hex, avisos, notas };
  },
};
