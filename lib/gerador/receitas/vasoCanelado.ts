/**
 * Vaso canelado: vaso redondo com frisos verticais arredondados por fora, em tres formatos
 * (tigela larga e abaulada, cilindro e cilindro pequeno). Imprime em pe, em camadas: cada uma
 * e o contorno canelado no raio do formato naquela altura, com o miolo liso por dentro.
 */
import { diffRegion, type Pt, type Region } from '../../geom/region';
import { fatiar } from '../fatias';
import { circulo } from '../formas';
import { ficha } from './fichas';
import type { Parametro, Receita, Resultado } from '../tipos';
import { num, txt } from '../tipos';

const mm = (id: string, rotulo: string, grupo: string, padrao: number, min: number, max: number, passo = 0.5, dica?: string): Parametro =>
  ({ tipo: 'numero', id, rotulo, grupo, padrao, min, max, passo, unidade: 'mm', dica });

/** Diametro e altura de cada formato, mm, e o raio relativo na altura relativa t (0 a 1). */
const FORMATOS: Record<string, { d: number; h: number; perfil: (t: number) => number }> = {
  // Abaulada: estreita embaixo, mais larga a 45% da altura, a boca um pouco mais fechada.
  tigela: { d: 170, h: 62, perfil: (t) => (t < 0.45 ? 1 - 0.15 * (1 - t / 0.45) ** 2 : 1 - 0.07 * ((t - 0.45) / 0.55) ** 2) },
  cilindro: { d: 120, h: 90, perfil: () => 1 },
  pequeno: { d: 85, h: 85, perfil: () => 1 },
};
/** Raio do arredondado do pe dos cilindros, mm; pontos por friso. */
const PE = 3, PONTOS = 8;

/** Contorno canelado: `n` frisos de `a` mm em volta do raio r (o fundo dos frisos fica em r - a). */
function canelado(r: number, n: number, a: number): Region {
  const pts: Pt[] = [];
  for (let i = 0; i < n * PONTOS; i++) {
    const th = (2 * Math.PI * i) / (n * PONTOS);
    const rr = r - a + a * Math.sqrt(Math.abs(Math.cos((n * th) / 2)));
    pts.push({ x: rr * Math.cos(th), y: rr * Math.sin(th) });
  }
  return [{ outer: pts, holes: [] }];
}

export const vasoCanelado: Receita = {
  ...ficha('vaso-canelado'),
  parametros: [
    {
      tipo: 'escolha', id: 'formato', rotulo: 'Formato', grupo: 'Vaso', padrao: 'cilindro',
      opcoes: [{ valor: 'tigela', rotulo: 'Tigela larga' }, { valor: 'cilindro', rotulo: 'Cilindro' }, { valor: 'pequeno', rotulo: 'Cilindro pequeno' }],
    },
    { tipo: 'numero', id: 'tamanho', rotulo: 'Tamanho', grupo: 'Vaso', padrao: 100, min: 50, max: 140, passo: 5, unidade: '%', dica: 'Em relação ao tamanho do formato' },
    mm('larguraFriso', 'Largura dos frisos', 'Frisos', 7, 3, 15),
    mm('fundoFriso', 'Profundidade dos frisos', 'Frisos', 1.5, 0.5, 4, 0.1),
    mm('parede', 'Parede', 'Vaso', 2.4, 1.6, 5, 0.1, 'Por dentro dos frisos'),
    mm('fundo', 'Fundo', 'Vaso', 3, 1.6, 8, 0.2),
    { tipo: 'liga', id: 'dreno', rotulo: 'Furo de dreno', grupo: 'Vaso', padrao: false },
    { tipo: 'cor', id: 'cor', rotulo: 'Cor', grupo: 'Cores', padrao: '#6f9f74' },
  ],
  fontes: () => [],
  gerar(v): Resultado {
    const cores = ['Vaso'], hex = [txt(v, 'cor')];
    const f = FORMATOS[txt(v, 'formato')] ?? FORMATOS.cilindro!, k = num(v, 'tamanho') / 100;
    const R = (f.d * k) / 2, H = f.h * k, a = num(v, 'fundoFriso'), parede = num(v, 'parede'), fundo = num(v, 'fundo');
    const n = Math.max(12, Math.round((2 * Math.PI * R) / num(v, 'larguraFriso')));
    const cilindro = txt(v, 'formato') !== 'tigela';
    // Raio por fora na altura z: o perfil do formato e, nos cilindros, o pe arredondado.
    const raio = (z: number) => {
      const r = R * f.perfil(z / H);
      return cilindro && z < PE ? r - (PE - Math.sqrt(PE * PE - (PE - z) ** 2)) : r;
    };
    const dreno = v.dreno === true ? circulo(0, 0, Math.min(5, R / 6), 48) : [];
    const camadas = fatiar(0, H, (z) => {
      const r = raio(z), fora = canelado(r, n, a);
      if (z < fundo) return dreno.length ? diffRegion(fora, dreno) : fora;
      return diffRegion(fora, circulo(0, 0, r - a - parede, 128));
    }, { passo: cilindro ? 0.3 : 0.5, cortes: [fundo, ...(cilindro ? [PE] : [])] });
    const avisos = 2 * R > 256 ? [`O vaso tem ${(2 * R).toFixed(0)} mm: passa da mesa de 256 mm.`] : [];
    return {
      itens: [{ nome: 'Vaso', pecas: [{ nome: 'Vaso', cor: 0, camadas }] }],
      cores, hex, avisos,
      notas: [`Imprima em pé. ${n} frisos, ${(2 * R).toFixed(0)} x ${H.toFixed(0)} mm.${v.dreno === true ? ' Com furo de dreno: use um pratinho embaixo.' : ''}`],
    };
  },
};
