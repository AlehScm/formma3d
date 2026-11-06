/**
 * Marcador de taca: o nome numa linha, girado para ler de cima para baixo, com o pe das letras
 * numa haste fina que encosta no vidro e um gancho em J no topo que prende na borda. Imprime
 * deitado, em 2 ou 3 cores: a base (contorno das letras, haste e gancho) e as letras por cima.
 * O miolo das letras (O, A, P...) fica vazado do tamanho da propria letra: a base so contorna
 * por fora, sem a cor de baixo aparecer dentro das letras.
 */
import { diffRegion, intersectRegion, regionBounds, rotateRegion, translateRegion, type Region } from '../../geom/region';
import { coresDe, empilhar, hexDe, lerCamadas, parametrosCamadas } from '../camadas';
import { ret } from '../fatias';
import { circulo, comporLinhas, semBuracos, unir } from '../formas';
import { LOTE_MAX, loteDeNomes } from '../lote';
import { ficha } from './fichas';
import type { Parametro, Receita } from '../tipos';
import { num, txt } from '../tipos';

const mm = (id: string, rotulo: string, grupo: string, padrao: number, min: number, max: number, passo = 0.5, dica?: string): Parametro =>
  ({ tipo: 'numero', id, rotulo, grupo, padrao, min, max, passo, unidade: 'mm', dica });

/**
 * Gancho em J saindo de (0, topo): haste de largura `w` subindo `h`, curva por cima e perna de
 * `perna` mm descendo do outro lado, com a abertura `g` (espessura do vidro) entre as duas.
 */
function gancho(topo: number, w: number, h: number, g: number, perna: number): Region {
  const cx = -w / 2 - g / 2, cy = topo + h;
  const anel = diffRegion(circulo(cx, cy, g / 2 + w, 64), circulo(cx, cy, g / 2, 64));
  const arco = intersectRegion(anel, ret(cx - g - 2 * w, cy, cx + g + 2 * w, cy + g + 2 * w));
  const xp = -w / 2 - g - w;
  return unir([
    ret(-w / 2, topo - 1, w / 2, cy),
    arco,
    ret(xp, cy - perna, xp + w, cy),
    circulo(xp + w / 2, cy - perna, w / 2, 32),
  ]);
}

export const marcadorTaca: Receita = {
  ...ficha('marcador-taca'),
  parametros: [
    { tipo: 'texto', id: 'nomes', rotulo: 'Nomes', grupo: 'Texto', padrao: 'Sofia, Pedro, Ana', maxCaracteres: 200, dica: `Até ${LOTE_MAX} nomes separados por vírgula, um marcador por nome` },
    { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte', grupo: 'Texto', padrao: 'tinos' },
    mm('altura', 'Altura das letras', 'Texto', 11, 6, 25),
    { tipo: 'numero', id: 'espacamento', rotulo: 'Espaço entre letras', grupo: 'Texto', padrao: 100, min: 70, max: 150, passo: 1, unidade: '%', dica: '100% é o espaço da própria fonte' },
    mm('abertura', 'Abertura do gancho', 'Gancho', 3, 1.5, 8, 0.1, 'A espessura da borda do vidro'),
    mm('alturaGancho', 'Altura do gancho', 'Gancho', 6, 3, 20, 0.5, 'Da primeira letra até a curva'),
    mm('pernaGancho', 'Perna do gancho', 'Gancho', 8, 3, 20, 0.5, 'O lado que fica por dentro da taça'),
    mm('larguraGancho', 'Largura da haste e do gancho', 'Gancho', 2.4, 1.6, 4, 0.1),
    ...parametrosCamadas({ cores: 2, contornoBase: 0.8, espBase: 2, espTopo: 1.2, preencherBase: false, corBase: '#2b2b2b', corTopo: '#d99a7c' }),
  ],
  fontes: (v) => [txt(v, 'fonte')],
  gerar(v, ctx) {
    const o = lerCamadas(v);
    const fonte = ctx.fonte(txt(v, 'fonte')), w = num(v, 'larguraGancho');
    const lote = loteDeNomes(v, (linhas) => {
      const nome = linhas.join(' ').toLocaleUpperCase('pt-BR');
      const t = comporLinhas([{ texto: nome, fonte, altura: num(v, 'altura'), espacamento: num(v, 'espacamento') / 100 }], 0);
      if (!t.letras.length) return { item: null, avisos: [] };
      // Girado para ler de cima para baixo: o pe das letras fica a esquerda, do lado do vidro.
      const deitado = rotateRegion(t.regiao, -90), b = regionBounds(deitado);
      const texto = translateRegion(deitado, -b.minX, 0);
      // O miolo de cada letra: sem "Tapar o miolo da base", fica vazado na base tambem.
      const miolos = o.preencherBase ? [] : diffRegion(semBuracos(texto), texto);
      const e = empilhar(texto, o, (contorno) => {
        const base = miolos.length ? diffRegion(contorno, miolos) : contorno;
        const bb = regionBounds(base), x0 = bb.minX;
        // A haste corre pelo pe de todas as letras e sobe ate o gancho.
        const haste = ret(x0, bb.minY + w / 2, x0 + w, bb.maxY);
        const ponta = circulo(x0 + w / 2, bb.minY + w / 2, w / 2, 32);
        const j = translateRegion(gancho(bb.maxY, w, num(v, 'alturaGancho'), num(v, 'abertura'), num(v, 'pernaGancho')), x0 + w / 2, 0);
        return unir([base, haste, ponta, j]);
      });
      return { item: { nome: linhas.join(' '), pecas: e.pecas }, avisos: e.avisos };
    });
    return { itens: lote.itens, cores: coresDe(o), hex: hexDe(v, o), avisos: lote.avisos, notas: ['Imprima deitado. O gancho encaixa na borda da taça, a haste encosta no vidro e o nome fica para fora, de cima para baixo.'] };
  },
};
