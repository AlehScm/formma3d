/**
 * Tiara com nome: o arco da tiara com dentinhos por dentro (seguram no cabelo), uma haste no
 * meio e o nome em arco sobre uma faixa curva. Imprime deitada, em 2 cores: a tiara (arco,
 * haste, faixa e o contorno das letras) e as letras por cima do contorno.
 */
import { regionBounds, type Region } from '../../geom/region';
import { circulo, contornar, retanguloArredondado, semBuracos, textoEmArco, unir } from '../formas';
import { ficha } from './fichas';
import type { Parametro, Receita, Resultado } from '../tipos';
import { num, txt } from '../tipos';

const cor = (id: string, rotulo: string, padrao: string): Parametro => ({ tipo: 'cor', id, rotulo, grupo: 'Cores', padrao });
const mm = (id: string, rotulo: string, grupo: string, padrao: number, min: number, max: number, passo = 0.5, dica?: string): Parametro =>
  ({ tipo: 'numero', id, rotulo, grupo, padrao, min, max, passo, unidade: 'mm', dica });

/** Dentinho (largura x comprimento) e passo entre eles ao longo do arco, mm. */
const DENTE_L = 1.2, DENTE_C = 2.4, DENTE_PASSO = 3;

/** Setor de anel entre os raios r0 e r1, de a0 a a1 graus (0 = em cima, positivo = horario). */
function setor(r0: number, r1: number, a0: number, a1: number, passos = 96): Region {
  const pts = (r: number, ida: boolean) => Array.from({ length: passos + 1 }, (_, i) => {
    const a = ((ida ? a0 + ((a1 - a0) * i) / passos : a1 - ((a1 - a0) * i) / passos) * Math.PI) / 180;
    return { x: r * Math.sin(a), y: r * Math.cos(a) };
  });
  return [{ outer: [...pts(r1, true), ...pts(r0, false)], holes: [] }];
}

export const tiaraNome: Receita = {
  ...ficha('tiara-nome'),
  parametros: [
    { tipo: 'texto', id: 'nome', rotulo: 'Nome', grupo: 'Texto', padrao: 'Nathan', maxCaracteres: 14 },
    { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte', grupo: 'Texto', padrao: 'luckiest-guy' },
    { tipo: 'liga', id: 'maiusculas', rotulo: 'Tudo em maiúsculas', grupo: 'Texto', padrao: true },
    mm('altura', 'Altura das letras', 'Texto', 20, 8, 30),
    mm('espLetras', 'Espessura das letras', 'Texto', 2, 0.8, 6, 0.2, 'Por cima do contorno'),
    mm('contorno', 'Contorno das letras', 'Texto', 1.6, 0, 4, 0.2),
    mm('raio', 'Raio da tiara', 'Tiara', 66, 50, 85, 1, 'Metade da largura por dentro: 66 mm serve em adulto'),
    mm('largura', 'Largura do arco', 'Tiara', 5, 3.5, 9),
    mm('espessura', 'Espessura da tiara', 'Tiara', 2.8, 1.8, 4, 0.1),
    { tipo: 'numero', id: 'abertura', rotulo: 'Abertura embaixo', grupo: 'Tiara', padrao: 110, min: 70, max: 160, passo: 5, unidade: '°' },
    mm('haste', 'Altura da haste', 'Tiara', 12, 4, 30),
    mm('faixa', 'Altura da faixa sob o nome', 'Tiara', 3, 2, 8),
    cor('corTiara', 'Tiara', '#f1f5f9'),
    cor('corLetras', 'Letras', '#4338ca'),
  ],
  fontes: (v) => [txt(v, 'fonte')],
  gerar(v, ctx): Resultado {
    const cores = ['Tiara', 'Letras'], hex = [txt(v, 'corTiara'), txt(v, 'corLetras')];
    const digitado = txt(v, 'nome').trim();
    const nome = v.maiusculas === false ? digitado : digitado.toLocaleUpperCase('pt-BR');
    if (!nome) return { itens: [], cores, hex, avisos: ['Digite o nome.'] };
    const fonte = ctx.fonte(txt(v, 'fonte'));
    const R = num(v, 'raio'), w = num(v, 'largura'), meia = (360 - num(v, 'abertura')) / 2;
    // Arco com pontas redondas e dentinhos por dentro, so na metade de cima.
    const arco = unir([
      setor(R, R + w, -meia, meia),
      ...[-meia, meia].map((a) => circulo((R + w / 2) * Math.sin((a * Math.PI) / 180), (R + w / 2) * Math.cos((a * Math.PI) / 180), w / 2, 32)),
    ]);
    const dentes: Region = [];
    for (let s = 0; s * DENTE_PASSO <= (R * Math.PI * 70) / 180; s++) {
      for (const lado of s ? [-1, 1] : [1]) {
        const a = (lado * s * DENTE_PASSO * 180) / (Math.PI * R);
        dentes.push(...setor(R - DENTE_C, R + 0.2, a - (DENTE_L * 90) / (Math.PI * R), a + (DENTE_L * 90) / (Math.PI * R), 4));
      }
    }
    // Nome em arco: linha de base num raio acima da haste e da faixa, centrado em cima.
    const rNome = R + w + num(v, 'haste') + num(v, 'faixa');
    const linha = { texto: nome, fonte, altura: num(v, 'altura') };
    const graus = textoEmArco(linha, rNome, 0).graus;
    if (!graus) return { itens: [], cores, hex, avisos: ['Esta fonte não tem as letras do nome.'] };
    const letras = textoEmArco(linha, rNome, -graus / 2).regiao;
    const sobra = (4 * 180) / (Math.PI * rNome);
    const faixa = setor(rNome - num(v, 'faixa'), rNome + 0.8, -graus / 2 - sobra, graus / 2 + sobra);
    const haste = retanguloArredondado(0, R + w / 2 + (num(v, 'haste') + w) / 2, 4, num(v, 'haste') + w, 1);
    const tiara = unir([arco, dentes, haste, faixa, semBuracos(contornar(letras, num(v, 'contorno')))]);
    const avisos: string[] = [];
    const b = regionBounds(unir([tiara, letras]));
    if (b.w > 256 || b.h > 256) avisos.push(`A tiara tem ${b.w.toFixed(0)} x ${b.h.toFixed(0)} mm: passa da mesa de 256 mm.`);
    if (graus > 2 * meia - 20) avisos.push('O nome ficou mais largo que o arco: diminua as letras.');
    return {
      itens: [{
        nome,
        pecas: [
          { nome: 'Tiara', cor: 0, camadas: [{ region: tiara, z0: 0, z1: num(v, 'espessura') }] },
          { nome: 'Letras', cor: 1, camadas: [{ region: letras, z0: num(v, 'espessura'), z1: num(v, 'espessura') + num(v, 'espLetras') }] },
        ],
      }],
      cores, hex, avisos,
      notas: ['Imprima deitada, numa peça de 2 cores. PETG deixa o arco mais flexível que PLA.'],
    };
  },
};
