/**
 * Porta-retrato com palavra: moldura de cantos redondos com uma palavra de lado, subindo pela
 * borda direita, e a data embaixo, as duas avancando sobre a foto. A foto e as costas entram
 * por cima, num bolsao e num trilho; um pe em triangulo encaixa nas costas e deixa o quadro
 * inclinado. A moldura imprime de frente na mesa (espelhada, para a frente ficar certa ao
 * virar); costas e pe imprimem deitados.
 */
import { diffRegion, intersectRegion, regionBounds, rotateRegion, translateRegion, type Region } from '../../geom/region';
import { fatiar, ret } from '../fatias';
import { espelharX } from '../figuras';
import { comporLinhas, retanguloArredondado, unir } from '../formas';
import { ficha } from './fichas';
import { montarJunto, type Montagem } from './letras';
import type { Camada, Item, Parametro, Receita, Resultado } from '../tipos';
import { num, txt } from '../tipos';

const mm = (id: string, rotulo: string, grupo: string, padrao: number, min: number, max: number, passo = 0.5, dica?: string): Parametro =>
  ({ tipo: 'numero', id, rotulo, grupo, padrao, min, max, passo, unidade: 'mm', dica });

/** Tamanhos de foto (largura x altura, em pe), mm. */
const FOTOS: Record<string, [number, number]> = { '10x15': [100, 150], '13x18': [130, 180], '15x21': [150, 210] };
/**
 * Espessuras (frente, bolsao da foto, trilho das costas, aba de tras), quanto a moldura cobre a
 * foto em cada lado, o trilho alem do bolsao, folga das costas e espessura do pe, mm.
 */
const FRENTE = 2.4, BOLSAO = 0.8, TRILHO = 1.9, ABA = 1.2, COBRE = 3, ALEM = 2, FOLGA = 0.25, PE = 3;
/** Abas do pe (comprimento) e folga delas nos encaixes, mm. */
const ABA_PE = 8, FOLGA_PE = 0.15;

/** As letras compostas com o pe (linha de base mais comum) em y = 0. */
function noChao(texto: string, fonte: ReturnType<Parameters<Receita['gerar']>[1]['fonte']>, altura: number): Region {
  const t = comporLinhas([{ texto, fonte, altura }], 0);
  if (!t.letras.length) return [];
  const pes = t.letras.map((l) => l.bounds.minY).sort((a, b) => a - b);
  return translateRegion(t.regiao, 0, -pes[Math.floor(pes.length / 2)]!);
}

export const portaRetratoPalavra: Receita = {
  ...ficha('porta-retrato-palavra'),
  parametros: [
    { tipo: 'texto', id: 'palavra', rotulo: 'Palavra', grupo: 'Texto', padrao: 'Paris', maxCaracteres: 16, dica: 'Sobe pela borda direita' },
    { tipo: 'texto', id: 'data', rotulo: 'Data', grupo: 'Texto', padrao: '06.07.2026', maxCaracteres: 16, dica: 'Embaixo, à esquerda (vazio = sem data)' },
    { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte', grupo: 'Texto', padrao: 'tinos' },
    { tipo: 'liga', id: 'maiusculas', rotulo: 'Palavra em maiúsculas', grupo: 'Texto', padrao: true },
    mm('alturaPalavra', 'Altura da palavra', 'Texto', 28, 10, 40),
    mm('alturaData', 'Altura da data', 'Texto', 9, 5, 20),
    {
      tipo: 'escolha', id: 'foto', rotulo: 'Tamanho da foto', grupo: 'Moldura', padrao: '10x15',
      opcoes: Object.keys(FOTOS).map((k) => ({ valor: k, rotulo: `${k.replace('x', ' x ')} cm` })),
    },
    mm('borda', 'Largura da borda', 'Moldura', 8, 6, 20),
    { tipo: 'liga', id: 'pe', rotulo: 'Pé de apoio', grupo: 'Moldura', padrao: true },
    { tipo: 'numero', id: 'inclinacao', rotulo: 'Inclinação', grupo: 'Moldura', padrao: 15, min: 8, max: 25, passo: 1, unidade: '°', visivel: (v) => v.pe !== false },
    { tipo: 'cor', id: 'cor', rotulo: 'Cor', grupo: 'Cores', padrao: '#d9cfbf' },
  ],
  fontes: (v) => [txt(v, 'fonte')],
  gerar(v, ctx): Resultado {
    const cores = ['Moldura'], hex = [txt(v, 'cor')];
    const [pw, ph] = FOTOS[txt(v, 'foto')] ?? FOTOS['10x15']!;
    const borda = num(v, 'borda'), fonte = ctx.fonte(txt(v, 'fonte'));
    const OW = pw + 1 + 2 * borda, OH = ph + 1 + 2 * borda, ww = pw - 2 * COBRE, wh = ph - 2 * COBRE;
    const fora = retanguloArredondado(0, 0, OW, OH, 6), janela = ret(-ww / 2, -wh / 2, ww / 2, wh / 2);
    const bolsao = ret(-(pw + 1) / 2, -(ph + 1) / 2, (pw + 1) / 2, OH);
    const trilho = ret(-(pw + 1) / 2 - ALEM, -(ph + 1) / 2 - ALEM, (pw + 1) / 2 + ALEM, OH);
    const avisos: string[] = [];

    // Palavra girada para subir pela borda direita (o pe das letras na borda), terminando no alto;
    // data embaixo a esquerda, apoiada na borda de baixo. As duas entram 1 mm na moldura.
    const digitada = txt(v, 'palavra').trim();
    const palavra = noChao(v.maiusculas === false ? digitada : digitada.toLocaleUpperCase('pt-BR'), fonte, num(v, 'alturaPalavra'));
    let letras: Region = [];
    if (palavra.length) {
      const g = rotateRegion(palavra, 90), b = regionBounds(g);
      letras = translateRegion(g, ww / 2 + 1 - b.maxX, wh / 2 + 1 - b.maxY);
      if (b.h > wh) avisos.push('A palavra é mais comprida que a foto: diminua a altura da palavra.');
    }
    const data = noChao(txt(v, 'data').trim(), fonte, num(v, 'alturaData'));
    if (data.length) {
      const b = regionBounds(data), d = translateRegion(data, -ww / 2 - 1 - b.minX, -wh / 2 - 1);
      if (letras.length && regionBounds(d).maxX > regionBounds(letras).minX - 2 && regionBounds(d).maxY > regionBounds(letras).minY) avisos.push('A data encosta na palavra: diminua a data ou a palavra.');
      letras = unir([letras, d]);
    }
    const frente = intersectRegion(unir([diffRegion(fora, janela), letras]), fora);
    const zA = FRENTE + BOLSAO, zB = zA + TRILHO, T = zB + ABA;
    const moldura: Camada[] = [
      { region: frente, z0: 0, z1: FRENTE },
      { region: diffRegion(fora, bolsao), z0: FRENTE, z1: zA },
      { region: diffRegion(fora, trilho), z0: zA, z1: zB },
      { region: diffRegion(fora, bolsao), z0: zB, z1: T },
    ];

    // Pe: triangulo de pe atras do quadro; a borda que encosta nas costas tem duas abas, e perto
    // do chao recua a espessura da aba de tras (que fica mais alta que as costas).
    const a = (num(v, 'inclinacao') * Math.PI) / 180, hf = OH * 0.55;
    const encaixes = [0.35, 0.75].map((k) => k * hf);
    const yDe = (u: number) => -OH / 2 + u;
    const furosPe = unir(encaixes.map((u) => ret(-PE / 2 - FOLGA_PE, yDe(u) - ABA_PE / 2 - FOLGA_PE, PE / 2 + FOLGA_PE, yDe(u) + ABA_PE / 2 + FOLGA_PE)));
    const placa = ret(-(pw + 1) / 2 - ALEM + FOLGA, -(ph + 1) / 2 - ALEM + FOLGA, (pw + 1) / 2 + ALEM - FOLGA, OH / 2);
    const costas: Camada[] = [{ region: v.pe === false ? placa : diffRegion(placa, furosPe), z0: 0, z1: TRILHO - 0.3 }];
    const p2 = { x: hf * Math.sin(a) ** 2, y: hf * Math.sin(a) * Math.cos(a) };
    const triangulo: Region = [{ outer: [{ x: 0, y: 0 }, { x: hf, y: 0 }, p2], holes: [] }];
    const pe = unir([
      diffRegion(triangulo, ret(-1, -1, borda + 0.3, ABA + 0.2)),
      ...encaixes.map((u) => ret(u - ABA_PE / 2, -(TRILHO - 0.5), u + ABA_PE / 2, 0.01)),
    ]);

    const notas = [
      'A moldura imprime de frente na mesa. A foto entra por cima, no bolsão, e as costas deslizam no trilho atrás dela.',
      ...(v.pe === false ? [] : [`O pé encaixa nos dois furos das costas e deixa o quadro inclinado ${num(v, 'inclinacao')}°.`]),
    ];
    if (Math.max(OW, OH) > 256) avisos.push(`A moldura tem ${OW.toFixed(0)} x ${OH.toFixed(0)} mm: passa da mesa de 256 mm.`);
    const itemMoldura: Item = { nome: 'Moldura', pecas: [{ nome: 'Moldura', cor: 0, camadas: moldura }] };
    const itemCostas: Item = { nome: 'Costas', pecas: [{ nome: 'Costas', cor: 0, camadas: costas }] };

    if (v.montado === true) {
      // Pronto, de frente para cima: moldura virada, costas no trilho e o pe atras, de pe.
      const extras: Montagem[] = [{ item: itemMoldura, dz: T, virar: true }, { item: itemCostas, dz: ABA }];
      if (v.pe !== false) {
        const fin = fatiar(-p2.y, 0, (z) => {
          const w = -z, u0 = Math.max(w * Math.tan(a), w < ABA + 0.2 ? borda + 0.3 : 0), u1 = hf - w / Math.tan(a);
          return u1 - u0 > 0.05 ? ret(-PE / 2, yDe(u0), PE / 2, yDe(u1)) : [];
        }, { passo: 0.4, cortes: [-(ABA + 0.2)] });
        extras.push({ item: { nome: 'Pé', pecas: [{ nome: 'Pé', cor: 0, camadas: fin }] }, dz: ABA });
      }
      return { itens: [{ ...montarJunto({ ...itemMoldura, pecas: [] }, extras), nome: 'Porta-retrato' }], cores, hex, avisos, notas };
    }
    // Na mesa: a moldura espelhada (imprime de frente), as costas e o pe ao lado, deitados.
    const molduraNaMesa: Item = { ...itemMoldura, pecas: [{ nome: 'Moldura', cor: 0, camadas: moldura.map((c) => ({ ...c, region: espelharX(c.region) })) }] };
    const lado = (it: Item, dx: number, dy = 0): Item => ({ ...it, pecas: it.pecas.map((p) => ({ ...p, camadas: p.camadas.map((c) => ({ ...c, region: translateRegion(c.region, dx, dy) })) })) });
    const itens = [molduraNaMesa, lado(itemCostas, OW + 8)];
    if (v.pe !== false) {
      const deitado = rotateRegion(pe, 90), b = regionBounds(deitado);
      itens.push(lado({ nome: 'Pé', pecas: [{ nome: 'Pé', cor: 0, camadas: [{ region: deitado, z0: 0, z1: PE }] }] }, -OW / 2 - 8 - b.maxX, -OH / 2 - b.minY));
    }
    return { itens, cores, hex, avisos, notas };
  },
};
