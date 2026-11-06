/**
 * Porta-canetas de nome: as letras na frente de um corpo macico que segue o contorno do nome
 * (a mesma silhueta do cofrinho), com furos de caneta descendo do topo de cada bolha. Imprime
 * deitado de costas: o corpo e depois as letras por cima, numa troca de cor so; os furos
 * ficam deitados, com o teto em gota.
 */
import { diffRegion, pointInContour, regionBounds, translateRegion, type Region } from '../../geom/region';
import { fatiar, furoDeitado, ret } from '../fatias';
import { comporLinhas, contornar, escalaParaLargura, unir } from '../formas';
import { silhuetaEmPe } from './cofrinho';
import { ficha } from './fichas';
import type { Parametro, Receita, Resultado } from '../tipos';
import { num, txt } from '../tipos';

const cor = (id: string, rotulo: string, padrao: string): Parametro => ({ tipo: 'cor', id, rotulo, grupo: 'Cores', padrao });
const mm = (id: string, rotulo: string, grupo: string, padrao: number, min: number, max: number, passo = 0.5, dica?: string): Parametro =>
  ({ tipo: 'numero', id, rotulo, grupo, padrao, min, max, passo, unidade: 'mm', dica });

/** Parede minima em volta de cada furo e entre furos, mm. */
const PAREDE = 2;

const dentro = (r: Region, x: number, y: number) => r.some((p) => pointInContour(p.outer, { x, y }) && !p.holes.some((h) => pointInContour(h, { x, y })));

/** O ponto mais alto da regiao na vertical x (ou -Infinity). */
function topoEm(r: Region, x: number): number {
  let topo = -Infinity;
  for (const p of r) for (let i = 0; i < p.outer.length; i++) {
    const a = p.outer[i]!, b = p.outer[(i + 1) % p.outer.length]!;
    if ((a.x <= x) !== (b.x <= x)) topo = Math.max(topo, a.y + ((x - a.x) * (b.y - a.y)) / (b.x - a.x));
  }
  return topo;
}

/** Os furos (x e fundo) que cabem descendo do topo da silhueta, dos pontos mais altos para os mais baixos. */
function furosDeCaneta(S: Region, raio: number, fundura: number): { x: number; fundo: number }[] {
  const b = regionBounds(S), miolo = contornar(S, -(raio + PAREDE));
  const candidatos: { x: number; topo: number }[] = [];
  for (let x = Math.ceil(b.minX); x <= b.maxX; x++) {
    const topo = topoEm(S, x), fundo = topo - fundura;
    let cabe = true;
    for (let y = fundo; y <= topo - raio - PAREDE - 0.5 && cabe; y += 1) cabe = dentro(miolo, x, y);
    if (cabe && fundo < topo - raio - PAREDE) candidatos.push({ x, topo });
  }
  const furos: { x: number; fundo: number }[] = [];
  for (const c of candidatos.sort((p, q) => q.topo - p.topo)) {
    if (furos.every((f) => Math.abs(f.x - c.x) >= 2 * raio + PAREDE)) furos.push({ x: c.x, fundo: c.topo - fundura });
  }
  return furos.sort((p, q) => p.x - q.x);
}

export const portaCanetasNome: Receita = {
  ...ficha('porta-canetas-nome'),
  parametros: [
    { tipo: 'texto', id: 'nome', rotulo: 'Nome', grupo: 'Texto', padrao: 'June', maxCaracteres: 14 },
    { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte', grupo: 'Texto', padrao: 'chewy' },
    { tipo: 'liga', id: 'maiusculas', rotulo: 'Tudo em maiúsculas', grupo: 'Texto', padrao: true },
    { tipo: 'numero', id: 'espacamento', rotulo: 'Espaço entre letras', grupo: 'Texto', padrao: 100, min: 70, max: 140, passo: 1, unidade: '%', dica: '100% é o espaço da própria fonte' },
    mm('altura', 'Altura das letras', 'Tamanho', 50, 30, 80, 1),
    mm('largura', 'Largura máxima', 'Tamanho', 200, 80, 250, 1, 'Nome comprido diminui para caber'),
    mm('profundidade', 'Profundidade do corpo', 'Tamanho', 28, 18, 60, 1, 'Da frente às costas, sem as letras'),
    mm('borda', 'Borda em volta das letras', 'Tamanho', 5, 3, 10, 0.5),
    mm('espLetras', 'Letras saltadas', 'Tamanho', 3, 1, 6, 0.2, 'Quanto as letras saem da frente'),
    mm('furo', 'Diâmetro dos furos', 'Canetas', 12, 8, 20, 0.5),
    mm('fundura', 'Fundura dos furos', 'Canetas', 35, 15, 70, 1),
    cor('corCorpo', 'Corpo', '#1f1f1f'),
    cor('corLetras', 'Letras', '#f28c28'),
  ],
  fontes: (v) => [txt(v, 'fonte')],
  gerar(v, ctx): Resultado {
    const cores = ['Corpo', 'Letras'], hex = [txt(v, 'corCorpo'), txt(v, 'corLetras')];
    const digitado = txt(v, 'nome').trim();
    const nome = v.maiusculas === false ? digitado : digitado.toLocaleUpperCase('pt-BR');
    if (!nome) return { itens: [], cores, hex, avisos: ['Digite o nome.'] };
    const fonte = ctx.fonte(txt(v, 'fonte'));
    const borda = num(v, 'borda'), prof = num(v, 'profundidade'), raio = num(v, 'furo') / 2;
    const compor = (altura: number) => comporLinhas([{ texto: nome, fonte, altura, espacamento: num(v, 'espacamento') / 100 }], 0);
    const avisos: string[] = [];
    let altura = num(v, 'altura');
    if (compor(altura).bounds.w + 2 * borda > num(v, 'largura')) {
      altura = escalaParaLargura((k) => compor(k).bounds.w + 2 * borda, num(v, 'largura'));
      avisos.push(`O nome não cabe em ${num(v, 'largura')} mm: as letras ficaram com ${altura.toFixed(0)} mm de altura.`);
    }
    const t = compor(altura);
    if (!t.letras.length) return { itens: [], cores, hex, avisos: ['Esta fonte não tem as letras do nome.'] };
    const dx = -(t.bounds.minX + t.bounds.maxX) / 2, dy = -(t.bounds.minY + t.bounds.maxY) / 2;
    const L = translateRegion(t.regiao, dx, dy), S = silhuetaEmPe(t, dx, dy, altura, borda);
    if (S.length > 1) avisos.push('O nome ficou em pedaços separados: diminua o espaço entre letras ou aumente a borda.');
    if (prof < 2 * raio + 2 * PAREDE) avisos.push(`O corpo é raso para o furo: use pelo menos ${(2 * raio + 2 * PAREDE).toFixed(0)} mm de profundidade.`);
    const furos = furosDeCaneta(S, raio, num(v, 'fundura'));
    if (!furos.length) avisos.push('Não coube furo de caneta: aumente as letras ou diminua o furo.');
    const bS = regionBounds(S), zc = prof / 2;
    const corpo = fatiar(0, prof, (z) => {
      const meia = furoDeitado(raio, zc, z);
      return meia > 0 ? diffRegion(S, unir(furos.map((f) => ret(f.x - meia, f.fundo, f.x + meia, bS.maxY + 1)))) : S;
    }, { cortes: [zc - raio, zc, zc + raio * Math.SQRT2] });
    return {
      itens: [{
        nome,
        pecas: [
          { nome: 'Corpo', cor: 0, camadas: corpo },
          { nome: 'Letras', cor: 1, camadas: [{ region: L, z0: prof, z1: prof + num(v, 'espLetras') }] },
        ],
      }],
      cores, hex, avisos,
      notas: [`Imprima deitado de costas: o corpo e, por cima, as letras (troque o filamento a ${prof} mm). ${furos.length} furo(s) de caneta.`],
    };
  },
};
