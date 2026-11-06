/**
 * Nome articulado: o nome de pe, uma peca por letra, ligadas por juntas de eixo vertical que
 * imprimem prontas, para o nome ondular como corrente; argola de chaveiro antes da primeira.
 * Embaixo, cada letra ganha uma ponte ate a junta, no vao entre duas letras, em tres andares: a
 * da esquerda tem o andar de baixo, o de cima e o pino; a da direita tem o do meio, com o furo
 * do pino. Imprime em pe, com a cor trocando acima das juntas.
 */
import { diffRegion, intersectRegion, regionBounds, translateRegion, type Region } from '../../geom/region';
import { cortarNaAltura, fatiar, ret, trechos } from '../fatias';
import { circulo, comporLinhas, unir } from '../formas';
import { ficha } from './fichas';
import type { Parametro, Receita, Resultado } from '../tipos';
import { num, txt } from '../tipos';

const cor = (id: string, rotulo: string, padrao: string): Parametro => ({ tipo: 'cor', id, rotulo, grupo: 'Cores', padrao });
const mm = (id: string, rotulo: string, grupo: string, padrao: number, min: number, max: number, passo = 0.5, dica?: string): Parametro =>
  ({ tipo: 'numero', id, rotulo, grupo, padrao, min, max, passo, unidade: 'mm', dica });

/** Raio do pino, raio externo da argola e do furo dela, mm. */
const PINO = 1.5, ARGOLA = 5, FURO_ARGOLA = 2.5;

export const nomeArticulado: Receita = {
  ...ficha('nome-articulado'),
  parametros: [
    { tipo: 'texto', id: 'nome', rotulo: 'Nome', grupo: 'Texto', padrao: 'Isabella', maxCaracteres: 14 },
    { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte', grupo: 'Texto', padrao: 'luckiest-guy' },
    mm('altura', 'Altura das letras', 'Texto', 18, 12, 35),
    mm('profundidade', 'Profundidade', 'Texto', 8, 6, 14, 0.5, 'Da frente para trás'),
    mm('vao', 'Vão entre as letras', 'Junta', 5, 3.5, 10, 0.5, 'Onde fica a junta; mais vão, mais a corrente dobra'),
    mm('folga', 'Folga da junta', 'Junta', 0.4, 0.25, 0.8, 0.05),
    { tipo: 'numero', id: 'bloco', rotulo: 'Altura do bloco', grupo: 'Junta', padrao: 40, min: 30, max: 60, passo: 5, unidade: '%', dica: 'Parte de baixo de cada letra, onde ficam as juntas' },
    { tipo: 'liga', id: 'argola', rotulo: 'Argola de chaveiro', grupo: 'Junta', padrao: true },
    cor('corBaixo', 'Embaixo', '#d4d4d4'),
    cor('corCima', 'Em cima', '#e0303f'),
  ],
  fontes: (v) => [txt(v, 'fonte')],
  gerar(v, ctx): Resultado {
    const cores = ['Embaixo', 'Em cima'], hex = [txt(v, 'corBaixo'), txt(v, 'corCima')];
    const nome = txt(v, 'nome').replace(/\s+/g, '').toLocaleUpperCase('pt-BR');
    if (!nome) return { itens: [], cores, hex, avisos: ['Digite o nome.'] };
    const H = num(v, 'altura'), D = num(v, 'profundidade'), G = num(v, 'vao'), c = num(v, 'folga');
    const t = comporLinhas([{ texto: nome, fonte: ctx.fonte(txt(v, 'fonte')), altura: H }], 0);
    if (!t.letras.length) return { itens: [], cores, hex, avisos: ['Esta fonte não tem as letras do nome.'] };
    // Letras no chao (linha de base mais comum em z = 0, a sobra das redondas cortada), com o
    // mesmo vao entre todas; a junta fica no meio de cada vao.
    const pes = t.letras.map((l) => l.bounds.minY).sort((a, b) => a - b), linha = pes[Math.floor(pes.length / 2)]!;
    let x = 0;
    const glifos = t.letras.map((l) => {
      const r = intersectRegion(translateRegion(l.region, x - l.bounds.minX, -linha), ret(x - 1, 0, x + l.bounds.w + 1, t.bounds.maxY - linha + 1));
      x += l.bounds.w + G;
      return r;
    });
    const bs = glifos.map((g) => regionBounds(g)), topo = Math.max(...bs.map((b) => b.maxY));
    const eixos = bs.slice(1).map((b, i) => (bs[i]!.maxX + b.minX) / 2);
    const hb = Math.max(6.4, (topo * num(v, 'bloco')) / 100), andar = (hb - 2 * c) / 10;
    const k1 = 3 * andar, k2 = k1 + c + 4 * andar, k3 = k2 + c; // baixo [0,k1) | meio [k1+c,k2) | cima [k3,hb]
    const avisos: string[] = [];
    if (G < D * Math.sin((30 * Math.PI) / 180)) avisos.push('O vão é pequeno para a profundidade: a corrente dobra pouco.');
    if (D / 2 - PINO - c < 1.2) avisos.push('A junta ficou fina: aumente a profundidade.');
    if (eixos.slice(1).some((e, i) => e - eixos[i]! < D + 2 * c)) avisos.push('Tem letra estreita demais para as duas juntas: aumente o vão.');

    // Planta da parte de baixo da letra i na altura z (so z < hb): a propria letra e uma ponte ate
    // cada junta (e ate a argola, na primeira).
    const bloco = (i: number, z: number): Region => {
      const meio = z >= k1 + c && z < k2, ponta = z < k1 || z >= k3;
      const esq = i ? eixos[i - 1]! : bs[0]!.minX - 1, dir = i < eixos.length ? eixos[i]! : bs[i]!.maxX + 1;
      const tr = trechos(glifos[i]!, z);
      let r: Region = tr.length
        ? unir([...tr.map(([x0, x1]) => ret(x0, -D / 2, x1, D / 2)), ret(esq, -D / 2, tr[0]![0] + 1, D / 2), ret(tr.at(-1)![1] - 1, -D / 2, dir, D / 2)])
        : ret(esq, -D / 2, dir, D / 2);
      if (i === 0 && v.argola !== false) r = unir([r, circulo(esq - ARGOLA + 1.5, 0, ARGOLA, 48)]);
      // Junta da esquerda: esta letra tem o andar do meio, com o furo do pino.
      if (i) r = meio ? diffRegion(unir([r, circulo(esq, 0, D / 2, 64)]), circulo(esq, 0, PINO + c, 48)) : diffRegion(r, circulo(esq, 0, D / 2 + c, 64));
      // Junta da direita: os andares de baixo e de cima e o pino, que atravessa o do meio da vizinha.
      if (i < eixos.length) r = unir([ponta ? unir([r, circulo(dir, 0, D / 2, 64)]) : diffRegion(r, circulo(dir, 0, D / 2 + c, 64)), circulo(dir, 0, PINO, 48)]);
      if (i === 0 && v.argola !== false) r = diffRegion(r, circulo(esq - ARGOLA + 1.5, 0, FURO_ARGOLA, 32));
      return r;
    };
    // Acima do bloco, o pe de cada letra passa por cima do andar de cima da junta da esquerda (da
    // vizinha): ali fica a folga, para nao grudar.
    const letra = (i: number, z: number): Region => {
      const fatia = unir(trechos(glifos[i]!, z).map(([x0, x1]) => ret(x0, -D / 2, x1, D / 2)));
      return i && z < hb + c ? diffRegion(fatia, circulo(eixos[i - 1]!, 0, D / 2 + c, 64)) : fatia;
    };
    const camadas = fatiar(0, topo, (z) => unir(glifos.map((_, i) => (z < hb ? bloco(i, z) : letra(i, z)))), { cortes: [k1, k1 + c, k2, k3, hb, hb + c] });
    const [baixo, cima] = cortarNaAltura(camadas, hb);
    const comprimento = bs.at(-1)!.maxX - bs[0]!.minX + (v.argola !== false ? 2 * ARGOLA : 0);
    if (comprimento > 256) avisos.push(`O nome tem ${comprimento.toFixed(0)} mm: passa da mesa de 256 mm.`);
    return {
      itens: [{ nome, pecas: [{ nome: 'Embaixo', cor: 0, camadas: baixo }, { nome: 'Em cima', cor: 1, camadas: cima }] }],
      cores, hex, avisos,
      notas: [`Imprima em pé, sem suporte: as juntas saem prontas (folga de ${c} mm). Troque o filamento a ${hb.toFixed(1)} mm para a cor de cima. Depois, dobre cada junta com cuidado para soltar.`],
    };
  },
};
