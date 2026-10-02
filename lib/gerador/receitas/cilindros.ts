/**
 * Pecas cilindricas com relevo em volta: rolo de textura (mosaico ou imagem grande) e
 * estojo de batom (liso, nome, mosaico ou imagem) com argola em cima.
 *
 * O relevo e desenhado no plano desenrolado (u = comprimento em volta, z = altura) e
 * vira camadas pelo `cilindroComRelevo`. Relevo para fora sai como peca propria (outra
 * cor); para dentro, o cilindro fica com os sulcos.
 */
import { diffRegion, intersectRegion, regionArea, regionBounds, rotateRegion, scaleRegion, translateRegion, type Region } from '../../geom/region';
import { cilindroComRelevo } from '../cilindro';
import { circulo, contornar, retanguloArredondado, semBuracos, temEmoji, textoNaCaixa } from '../formas';
import { AVISO_EXEMPLO, campoDesenho, desenhoNoTamanho } from './desenho';
import { ficha } from './fichas';
import type { Camada, Parametro, Peca, Receita, Resultado, Valores } from '../tipos';
import { liga, num, soCoresUsadas, txt } from '../tipos';

const cor = (id: string, rotulo: string, padrao: string): Parametro => ({ tipo: 'cor', id, rotulo, grupo: 'Cores', padrao });
const mm = (id: string, rotulo: string, grupo: string, padrao: number, min: number, max: number, passo = 0.1, dica?: string, visivel?: (v: Valores) => boolean): Parametro =>
  ({ tipo: 'numero', id, rotulo, grupo, padrao, min, max, passo, unidade: 'mm', dica, visivel });

/** Copias de `D` (centrado) em grade no plano desenrolado; linhas alternadas deslocadas. */
export function mosaico(D: Region, bloco: number, nU: number, nZ: number, C: number, z0: number, z1: number, intercalar: boolean): Region {
  const b = regionBounds(D);
  if (!(b.w > 0 && b.h > 0)) return [];
  const peca = scaleRegion(translateRegion(D, -(b.minX + b.maxX) / 2, -(b.minY + b.maxY) / 2), bloco / Math.max(b.w, b.h));
  const pu = C / nU, pz = (z1 - z0) / nZ;
  const out: Region = [];
  for (let j = 0; j < nZ; j++) {
    for (let i = 0; i < nU; i++) {
      const u = (i + 0.5 + (intercalar && j % 2 ? 0.5 : 0)) * pu;
      out.push(...translateRegion(peca, u % C, z0 + (j + 0.5) * pz));
    }
  }
  return out;
}

/** Separa o relevo para fora (outra cor) do cilindro liso de raio R (o corpo e uma camada so). */
function separar(camadas: Camada[], R: number, furo: Region): { corpo: Camada[]; relevo: Camada[] } {
  const liso = circulo(0, 0, R, 180);
  const relevo: Camada[] = [];
  for (const c of camadas) {
    // Abre e fecha 3 microns: some com os espinhos de area zero que o recorte deixa na
    // costura com o cilindro liso (a malha deles nao fecha).
    const fora = contornar(contornar(diffRegion(c.region, liso), -0.003), 0.003).filter((q) => regionArea([q]) > 0.02);
    if (regionArea(fora) > 0.01) relevo.push({ region: fora, z0: c.z0, z1: c.z1 });
  }
  const z0 = camadas[0]?.z0 ?? 0, z1 = camadas.at(-1)?.z1 ?? 0;
  return { corpo: [{ region: furo.length ? diffRegion(liso, furo) : liso, z0, z1 }], relevo };
}

const camposTextura = (bloco: number): Parametro[] => [
  campoDesenho('Imagem da textura'),
  { tipo: 'liga', id: 'preencher', rotulo: 'Preencher os buracos', grupo: 'Desenho', padrao: false, dica: 'Usa só a silhueta da imagem' },
  mm('bloco', 'Tamanho de cada bloco', 'Mosaico', bloco, 2, 30, 0.5, undefined, (v) => v.modo === 'mosaico'),
  { tipo: 'numero', id: 'nU', rotulo: 'Blocos em volta', grupo: 'Mosaico', padrao: 6, min: 1, max: 30, passo: 1, visivel: (v) => v.modo === 'mosaico' },
  { tipo: 'numero', id: 'nZ', rotulo: 'Blocos na altura', grupo: 'Mosaico', padrao: 6, min: 1, max: 40, passo: 1, visivel: (v) => v.modo === 'mosaico' },
  { tipo: 'liga', id: 'intercalar', rotulo: 'Intercalar as linhas', grupo: 'Mosaico', padrao: true, visivel: (v) => v.modo === 'mosaico' },
  { tipo: 'numero', id: 'escala', rotulo: 'Tamanho da imagem', grupo: 'Imagem', padrao: 100, min: 10, max: 150, passo: 1, unidade: '%', dica: '100% = dá a volta inteira', visivel: (v) => v.modo === 'imagem' },
  mm('yImagem', 'Posição vertical', 'Imagem', 0, -100, 100, 1, undefined, (v) => v.modo === 'imagem'),
];

/** O desenho da textura no plano desenrolado de comprimento C, entre z0 e z1. */
function texturaDesenrolada(v: Valores, C: number, z0: number, z1: number): { regiao: Region; exemplo: boolean } {
  const { regiao: bruto, exemplo } = desenhoNoTamanho(v, 'desenho', 100);
  const D = liga(v, 'preencher') ? semBuracos(bruto) : bruto;
  if (txt(v, 'modo') === 'mosaico') return { regiao: mosaico(D, num(v, 'bloco'), num(v, 'nU'), num(v, 'nZ'), C, z0, z1, liga(v, 'intercalar')), exemplo };
  // Imagem grande: na largura da volta (x escala), no maximo a altura disponivel.
  const b = regionBounds(D);
  let k = ((C * num(v, 'escala')) / 100 - 1) / b.w;
  if (b.h * k > z1 - z0 - 2) k = (z1 - z0 - 2) / b.h;
  return { regiao: translateRegion(scaleRegion(translateRegion(D, -(b.minX + b.maxX) / 2, -(b.minY + b.maxY) / 2), k), C / 2, (z0 + z1) / 2 + num(v, 'yImagem')), exemplo };
}

/** Rolo de textura para massinha, argila ou biscoito, com furo para o cabo. */
export const roloTextura: Receita = {
  ...ficha('rolo-textura'),
  parametros: [
    { tipo: 'escolha', id: 'modo', rotulo: 'Textura', grupo: 'Desenho', padrao: 'mosaico', opcoes: [{ valor: 'mosaico', rotulo: 'Mosaico (imagem repetida)' }, { valor: 'imagem', rotulo: 'Imagem grande' }] },
    ...camposTextura(10),
    mm('diametro', 'Diâmetro', 'Rolo', 25, 15, 100, 0.5),
    mm('altura', 'Comprimento', 'Rolo', 80, 20, 200, 1),
    mm('furo', 'Furo do cabo', 'Rolo', 8, 0, 60, 0.5, '0 = rolo maciço'),
    { tipo: 'liga', id: 'positiva', rotulo: 'Textura para fora', grupo: 'Rolo', padrao: true, dica: 'Desligado: a textura fica afundada no rolo' },
    mm('relevo', 'Altura da textura', 'Rolo', 0.6, 0.1, 2, 0.1),
    cor('corRolo', 'Rolo', '#6b2c42'),
    cor('corTextura', 'Textura', '#dddddd'),
  ],
  gerar(v): Resultado {
    const cores = ['Rolo', 'Textura'], hex = [txt(v, 'corRolo'), txt(v, 'corTextura')];
    const R = num(v, 'diametro') / 2, H = num(v, 'altura'), h = num(v, 'relevo'), C = 2 * Math.PI * R;
    const df = num(v, 'furo'), avisos: string[] = [];
    if (df > 0 && df / 2 > R - h - 1.5) return { itens: [], cores, hex, avisos: ['O furo é grande demais para este diâmetro.'] };
    const furo = df > 0 ? circulo(0, 0, df / 2, 64) : [];
    const { regiao, exemplo } = texturaDesenrolada(v, C, 0, H);
    if (exemplo) avisos.push(AVISO_EXEMPLO);
    const positiva = liga(v, 'positiva');
    const camadas = cilindroComRelevo({ R, desenho: regiao, h: positiva ? h : -h, z0: 0, z1: H, furo });
    const pecas: Peca[] = [];
    if (positiva) {
      const { corpo, relevo } = separar(camadas, R, furo);
      pecas.push({ nome: 'Rolo', cor: 0, camadas: corpo });
      if (relevo.length) pecas.push({ nome: 'Textura', cor: 1, camadas: relevo });
    } else pecas.push({ nome: 'Rolo', cor: 0, camadas });
    return soCoresUsadas({
      itens: [{ nome: 'Rolo', pecas }], cores, hex, avisos,
      notas: ['Imprima em pé. Passe um cabo (lápis, cano ou cavilha) pelo furo para rolar.'],
    });
  },
};

/**
 * Estojo de batom (chaveiro): tubo com fundo, com a argola numa aba que sobe da borda
 * (furo atravessado). Decoracao em volta: nome, mosaico ou imagem.
 */
export const estojoBatom: Receita = {
  ...ficha('estojo-batom'),
  parametros: [
    { tipo: 'escolha', id: 'modo', rotulo: 'Decoração', grupo: 'Desenho', padrao: 'nome', opcoes: [{ valor: 'liso', rotulo: 'Liso' }, { valor: 'nome', rotulo: 'Só o nome' }, { valor: 'mosaico', rotulo: 'Mosaico' }, { valor: 'imagem', rotulo: 'Imagem grande' }] },
    { tipo: 'texto', id: 'nome', rotulo: 'Nome', grupo: 'Nome', padrao: 'Love', maxCaracteres: 20, dica: 'Escrito ao longo do estojo; vazio = sem nome' },
    { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte', grupo: 'Nome', padrao: 'sacramento' },
    { tipo: 'numero', id: 'escalaNome', rotulo: 'Tamanho do nome', grupo: 'Nome', padrao: 100, min: 30, max: 200, passo: 1, unidade: '%' },
    mm('yNome', 'Posição do nome (ao longo)', 'Nome', 0, -100, 100, 1),
    mm('folgaNome', 'Espaço da textura em volta do nome', 'Nome', 2, 0, 10, 0.5),
    ...camposTextura(8).map((p) => ({ ...p, visivel: p.id === 'desenho' || p.id === 'preencher' ? (v: Valores) => v.modo === 'mosaico' || v.modo === 'imagem' : p.visivel }) as Parametro),
    mm('alturaBatom', 'Altura do batom', 'Batom', 67, 30, 120, 0.5),
    mm('diametroBatom', 'Diâmetro do batom', 'Batom', 16, 8, 40, 0.5),
    mm('folga', 'Folga em volta do batom', 'Batom', 1.4, 0.3, 6, 0.1),
    mm('paraFora', 'Quanto o batom fica para fora', 'Batom', 12, 0, 40, 0.5, 'Para conseguir puxar'),
    mm('parede', 'Espessura da parede', 'Estojo', 2.8, 1.2, 5),
    mm('fundo', 'Espessura do fundo', 'Estojo', 2, 0.8, 5),
    mm('furo', 'Furo da argola', 'Estojo', 3.4, 0, 6, 0.1, '0 = sem argola'),
    mm('relevo', 'Altura do relevo', 'Estojo', 0.6, 0.2, 1.5),
    cor('corCilindro', 'Estojo', '#6b2c42'),
    cor('corTextura', 'Decoração', '#ffffff'),
  ],
  fontes: (v) => (String(v.nome ?? '').trim() && v.modo !== 'liso' ? [String(v.fonte), ...(temEmoji(String(v.nome)) ? ['noto-emoji'] : [])] : []),
  gerar(v, ctx): Resultado {
    const cores = ['Estojo', 'Decoração'], hex = [txt(v, 'corCilindro'), txt(v, 'corTextura')];
    const avisos: string[] = [];
    const rI = num(v, 'diametroBatom') / 2 + num(v, 'folga'), R = rI + num(v, 'parede'), C = 2 * Math.PI * R;
    const eF = num(v, 'fundo'), H = eF + Math.max(10, num(v, 'alturaBatom') - num(v, 'paraFora')), h = num(v, 'relevo');
    const modo = txt(v, 'modo');
    // Desenho em volta: textura e nome (o nome corre ao longo do estojo, girado 90 graus).
    let desenhoU: Region = [];
    if (modo === 'mosaico' || modo === 'imagem') {
      const t = texturaDesenrolada(v, C, eF + 1, H - 1);
      if (t.exemplo) avisos.push(AVISO_EXEMPLO);
      desenhoU = t.regiao;
    }
    const nome = txt(v, 'nome').trim();
    if (nome && modo !== 'liso') {
      const k = num(v, 'escalaNome') / 100;
      const tn = textoNaCaixa([nome], { fonte: ctx.fonte(txt(v, 'fonte')), reserva: temEmoji(nome) ? ctx.fonte('noto-emoji') : undefined, maxW: (H - eF - 4) * 0.85 * k, maxH: C * 0.3 * k }).regiao;
      const n = translateRegion(rotateRegion(tn, 90), C / 2, (eF + H) / 2 + num(v, 'yNome'));
      const nb = regionBounds(n);
      if (nb.minY < eF || nb.maxY > H) avisos.push('O nome passa da altura do estojo: diminua ou mova o nome.');
      if (nb.h > H - eF || nb.w > C) avisos.push('O nome é grande demais para o estojo.');
      desenhoU = desenhoU.length ? [...diffRegion(desenhoU, contornar(n, num(v, 'folgaNome'))), ...n] : n;
    }
    const oco = circulo(0, 0, rI, 96);
    const camadas = [
      ...cilindroComRelevo({ R, desenho: desenhoU, h, z0: 0, z1: eF }),
      ...cilindroComRelevo({ R, desenho: desenhoU, h, z0: eF, z1: H, furo: oco }),
    ];
    const pecas: Peca[] = [];
    const baixo = separar(camadas.filter((c) => c.z1 <= eF + 1e-9), R, []), tubo = separar(camadas.filter((c) => c.z0 >= eF - 1e-9), R, oco);
    const corpo: Camada[] = [...baixo.corpo, ...tubo.corpo], relevo: Camada[] = [...baixo.relevo, ...tubo.relevo];
    // Aba da argola: sobe da borda (em +y), com furo atravessado de fora para dentro.
    const df = num(v, 'furo');
    if (df > 0) {
      const larg = df + 5, alto = df + 4.2, zc = H + 2.1 + df / 2;
      // Pedaco da parede (em +y) com a largura da aba.
      const aba = intersectRegion(retanguloArredondado(0, R / 2, larg, R, 0), diffRegion(circulo(0, 0, R, 180), oco));
      const n = Math.round(alto / 0.2);
      for (let i = 0; i < n; i++) {
        const a = H + (alto * i) / n, b = H + (alto * (i + 1)) / n, z = (a + b) / 2;
        // Corte do furo nesta altura: a corda do circulo do furo.
        const meia = Math.abs(z - zc) < df / 2 ? Math.sqrt((df / 2) ** 2 - (z - zc) ** 2) : 0;
        const reg = meia > 0.05 ? diffRegion(aba, retanguloArredondado(0, R, 2 * meia, 2 * R, 0)) : aba;
        corpo.push({ region: reg, z0: a, z1: b });
      }
    }
    pecas.push({ nome: 'Estojo', cor: 0, camadas: corpo });
    if (relevo.length) pecas.push({ nome: 'Decoração', cor: 1, camadas: relevo });
    return soCoresUsadas({
      itens: [{ nome: nome && modo !== 'liso' ? `Estojo ${nome}` : 'Estojo de batom', pecas }], cores, hex, avisos,
      notas: ['Imprima em pé, com o fundo na mesa.'],
    });
  },
};
