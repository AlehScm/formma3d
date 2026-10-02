/**
 * Receitas que partem de um desenho do usuario (SVG): placa em camadas a partir de
 * imagem, gerador de chaveiro (relevo ou sobreposto) e chaveiro com logo e nome.
 * Sem arquivo, usam um desenho de exemplo nosso e avisam.
 */
import { diffRegion, regionBounds, scaleRegion, translateRegion, type Region } from '../../geom/region';
import { coresDe, empilhar, hexDe, lerCamadas, parametrosCamadas } from '../camadas';
import { ajustarLargura, circulo, contornar, estrela, semBuracos, temEmoji, textoNaCaixa, unir } from '../formas';
import { espelharX } from '../figuras';
import { comArgola, LOTE_MAX, loteDeNomes } from '../lote';
import { ficha } from './fichas';
import type { Parametro, Receita, Resultado, Valores } from '../tipos';
import { desenho, liga, num, txt } from '../tipos';

export const AVISO_EXEMPLO = 'Usando um desenho de exemplo: escolha o seu SVG, PNG ou JPG.';

/** Selo de exemplo (anel + estrela), para quando nao ha arquivo. */
export function selo(w: number): Region {
  const anel = diffRegion(circulo(0, 0, w / 2, 96), circulo(0, 0, w / 2 - w * 0.08, 96));
  return unir([anel, estrela(w * 0.62)]);
}

/** O desenho do campo `id`, centrado e com `tamanho` na direcao pedida; ou o exemplo. */
export function desenhoNoTamanho(v: Valores, id: string, tamanho: number, eixo: 'largura' | 'altura' = 'largura'): { regiao: Region; exemplo: boolean } {
  const d = desenho(v, id);
  const bruto = d ? d.regiao : selo(100);
  const b = regionBounds(bruto);
  const medida = eixo === 'altura' ? b.h : b.w;
  if (!(medida > 0)) return { regiao: [], exemplo: !d };
  const k = tamanho / medida;
  return { regiao: scaleRegion(translateRegion(bruto, -(b.minX + b.maxX) / 2, -(b.minY + b.maxY) / 2), k), exemplo: !d };
}

/** Nome do arquivo do desenho, sem extensao ('' sem desenho). */
export const nomeDoDesenho = (v: Valores, id: string) => desenho(v, id)?.nome.replace(/\.(svg|png|jpe?g|webp)$/i, '') ?? '';

export const campoDesenho = (rotulo = 'Desenho'): Parametro => ({ tipo: 'svg', id: 'desenho', rotulo, grupo: 'Desenho', padrao: '', dica: 'SVG, PNG ou JPG; numa imagem, o desenho é o que se destaca do fundo' });
export const campoEixo: Parametro = {
  tipo: 'escolha', id: 'eixo', rotulo: 'O tamanho vale para', grupo: 'Desenho', padrao: 'largura',
  opcoes: [{ valor: 'largura', rotulo: 'Largura' }, { valor: 'altura', rotulo: 'Altura' }],
};
const cor = (id: string, rotulo: string, padrao: string, visivel?: (v: Valores) => boolean): Parametro => ({ tipo: 'cor', id, rotulo, grupo: 'Cores', padrao, visivel });

/** Placa multipartes a partir de imagem: o desenho no lugar do texto, em 2 ou 3 camadas. */
export const logoCamadas: Receita = {
  ...ficha('logo-camadas'),
  parametros: [
    campoDesenho('Imagem'),
    { tipo: 'numero', id: 'tamanho', rotulo: 'Tamanho do desenho', grupo: 'Desenho', padrao: 180, min: 40, max: 320, passo: 1, unidade: 'mm' },
    campoEixo,
    ...parametrosCamadas({ espBase: 18, contornoBase: 6, contornoMeio: 3, preencherBase: true, preencherMiolo: false, folga: 0.16 }),
  ],
  gerar(v): Resultado {
    const o = lerCamadas(v);
    const { regiao, exemplo } = desenhoNoTamanho(v, 'desenho', num(v, 'tamanho'), txt(v, 'eixo') === 'altura' ? 'altura' : 'largura');
    if (!regiao.length) return { itens: [], cores: coresDe(o), hex: hexDe(v, o), avisos: ['O desenho não tem área.'] };
    const { pecas, avisos } = empilhar(regiao, o);
    return { itens: [{ nome: nomeDoDesenho(v, 'desenho') || 'Desenho', pecas }], cores: coresDe(o), hex: hexDe(v, o), avisos: exemplo ? [AVISO_EXEMPLO, ...avisos] : avisos };
  },
};

/**
 * Gerador de chaveiro a partir de desenho. Em relevo: o desenho em cima de uma base que o
 * contorna. Sobreposto: a base tem um rebaixo no formato do desenho e a peca do desenho
 * entra nele (duas cores, impressas separadas).
 */
export const chaveiroDesenho: Receita = {
  ...ficha('chaveiro-desenho'),
  parametros: [
    { tipo: 'escolha', id: 'origem', rotulo: 'Em cima vai', grupo: 'Desenho', padrao: 'imagem', opcoes: [{ valor: 'imagem', rotulo: 'Imagem' }, { valor: 'texto', rotulo: 'Texto' }] },
    { ...campoDesenho(), visivel: (v: Valores) => v.origem !== 'texto' },
    { tipo: 'texto', id: 'texto', rotulo: 'Texto', grupo: 'Desenho', padrao: 'Ana', maxCaracteres: 40, dica: '"+" quebra a linha; aceita emoji', visivel: (v) => v.origem === 'texto' },
    { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte', grupo: 'Desenho', padrao: 'pacifico', visivel: (v) => v.origem === 'texto' },
    { tipo: 'numero', id: 'tamanho', rotulo: 'Tamanho', grupo: 'Desenho', padrao: 50, min: 15, max: 150, passo: 1, unidade: 'mm' },
    campoEixo,
    {
      tipo: 'escolha', id: 'estilo', rotulo: 'Estilo', grupo: 'Chaveiro', padrao: 'relevo',
      opcoes: [{ valor: 'relevo', rotulo: 'Desenho em relevo' }, { valor: 'sobreposto', rotulo: 'Desenho encaixado' }],
    },
    {
      tipo: 'escolha', id: 'face', rotulo: 'Imprimir com o desenho', grupo: 'Chaveiro', padrao: 'cima',
      opcoes: [{ valor: 'cima', rotulo: 'Para cima (relevo)' }, { valor: 'baixo', rotulo: 'Para baixo (embutido, liso)' }],
      dica: 'Para baixo: o desenho fica rente à face lisa que encosta na mesa', visivel: (v) => v.estilo !== 'sobreposto',
    },
    { tipo: 'numero', id: 'contornoBase', rotulo: 'Contorno da base', grupo: 'Chaveiro', padrao: 2.5, min: 0.5, max: 10, passo: 0.1, unidade: 'mm' },
    { tipo: 'numero', id: 'espBase', rotulo: 'Espessura da base', grupo: 'Chaveiro', padrao: 2.6, min: 0.6, max: 8, passo: 0.1, unidade: 'mm' },
    { tipo: 'numero', id: 'espDesenho', rotulo: 'Espessura do desenho', grupo: 'Chaveiro', padrao: 1, min: 0.2, max: 4, passo: 0.1, unidade: 'mm' },
    { tipo: 'numero', id: 'rebaixo', rotulo: 'Profundidade do encaixe', grupo: 'Chaveiro', padrao: 0.8, min: 0.2, max: 3, passo: 0.1, unidade: 'mm', visivel: (v) => v.estilo === 'sobreposto' },
    { tipo: 'numero', id: 'folga', rotulo: 'Folga do encaixe', grupo: 'Chaveiro', padrao: 0.15, min: 0, max: 0.6, passo: 0.01, unidade: 'mm', visivel: (v) => v.estilo === 'sobreposto' },
    { tipo: 'liga', id: 'borda', rotulo: 'Borda em volta', grupo: 'Chaveiro', padrao: true },
    { tipo: 'numero', id: 'larguraBorda', rotulo: 'Largura da borda', grupo: 'Chaveiro', padrao: 1, min: 0.4, max: 3, passo: 0.1, unidade: 'mm', visivel: (v) => v.borda === true },
    {
      tipo: 'escolha', id: 'argola', rotulo: 'Argola', grupo: 'Argola', padrao: 'topo',
      opcoes: [{ valor: 'topo', rotulo: 'Em cima' }, { valor: 'esquerda', rotulo: 'À esquerda' }, { valor: 'direita', rotulo: 'À direita' }, { valor: 'nenhuma', rotulo: 'Sem argola' }],
    },
    { tipo: 'numero', id: 'furo', rotulo: 'Diâmetro do furo', grupo: 'Argola', padrao: 3, min: 2, max: 10, passo: 0.25, unidade: 'mm', visivel: (v) => v.argola !== 'nenhuma' },
    { tipo: 'numero', id: 'aro', rotulo: 'Largura do aro', grupo: 'Argola', padrao: 2, min: 1.2, max: 6, passo: 0.1, unidade: 'mm', visivel: (v) => v.argola !== 'nenhuma' },
    cor('corBase', 'Base', '#1f2937'),
    cor('corDesenho', 'Desenho', '#f59e0b'),
    cor('corBorda', 'Borda', '#ffffff', (v) => v.borda === true),
  ],
  fontes: (v) => (v.origem === 'texto' ? [String(v.fonte), ...(temEmoji(String(v.texto ?? '')) ? ['noto-emoji'] : [])] : []),
  gerar(v, ctx): Resultado {
    const eixo = txt(v, 'eixo') === 'altura' ? 'altura' : 'largura';
    let regiao: Region, exemplo = false;
    if (txt(v, 'origem') === 'texto') {
      const t = txt(v, 'texto').trim();
      const tc = t ? textoNaCaixa(t.split('+'), { fonte: ctx.fonte(txt(v, 'fonte')), reserva: temEmoji(t) ? ctx.fonte('noto-emoji') : undefined, maxW: 1000, maxH: 1000, entrelinha: 1 }).regiao : [];
      regiao = tc.length ? (eixo === 'altura' ? scaleRegion(tc, num(v, 'tamanho') / regionBounds(tc).h) : ajustarLargura(tc, num(v, 'tamanho'))) : [];
    } else ({ regiao, exemplo } = desenhoNoTamanho(v, 'desenho', num(v, 'tamanho'), eixo));
    const borda = liga(v, 'borda');
    const cores = borda ? ['Base', 'Desenho', 'Borda'] : ['Base', 'Desenho'];
    const hex = borda ? [txt(v, 'corBase'), txt(v, 'corDesenho'), txt(v, 'corBorda')] : [txt(v, 'corBase'), txt(v, 'corDesenho')];
    if (!regiao.length) return { itens: [], cores, hex, avisos: ['O desenho não tem área.'] };
    const eb = num(v, 'espBase'), ed = num(v, 'espDesenho');
    const contorno = semBuracos(contornar(regiao, num(v, 'contornoBase')));
    const base = comArgola(contorno, txt(v, 'argola'), num(v, 'furo'), num(v, 'aro'));
    const avisos: string[] = exemplo ? [AVISO_EXEMPLO] : [];
    if (base.length > 1) avisos.push('O desenho tem partes soltas: aumente o contorno da base para unir tudo.');
    const pecas = [];
    if (txt(v, 'estilo') === 'sobreposto') {
      // A base ganha um rebaixo no formato do desenho (com folga); o desenho afunda nele.
      const p = Math.min(num(v, 'rebaixo'), eb - 0.4);
      const rebaixo = contornar(regiao, num(v, 'folga'));
      pecas.push({ nome: 'Base', cor: 0, camadas: [{ region: base, z0: 0, z1: eb - p }, { region: diffRegion(base, rebaixo), z0: eb - p, z1: eb }] });
      pecas.push({ nome: 'Desenho', cor: 1, camadas: [{ region: regiao, z0: eb - p, z1: eb - p + ed }] });
    } else if (txt(v, 'face') === 'baixo') {
      // Face para baixo: desenho e borda embutidos rente a mesa, espelhados (le-se virando a peca).
      const e = Math.min(ed, eb - 0.4);
      const anel = borda ? diffRegion(contorno, contornar(contorno, -num(v, 'larguraBorda'))) : [];
      const des = diffRegion(espelharX(regiao), anel);
      const anelM = espelharX(anel);
      const baseM = espelharX(base);
      pecas.push({ nome: 'Base', cor: 0, camadas: [{ region: diffRegion(baseM, unir([des, anelM])), z0: 0, z1: e }, { region: baseM, z0: e, z1: eb }] });
      pecas.push({ nome: 'Desenho', cor: 1, camadas: [{ region: des, z0: 0, z1: e }] });
      if (borda) pecas.push({ nome: 'Borda', cor: 2, camadas: [{ region: anelM, z0: 0, z1: e }] });
    } else {
      pecas.push({ nome: 'Base', cor: 0, camadas: [{ region: base, z0: 0, z1: eb }] });
      pecas.push({ nome: 'Desenho', cor: 1, camadas: [{ region: regiao, z0: eb, z1: eb + ed }] });
    }
    if (borda && txt(v, 'face') !== 'baixo') {
      const w = num(v, 'larguraBorda');
      const anel = diffRegion(contorno, contornar(contorno, -w));
      pecas.push({ nome: 'Borda', cor: 2, camadas: [{ region: anel, z0: eb, z1: eb + ed }] });
    }
    return { itens: [{ nome: (txt(v, 'origem') === 'texto' ? txt(v, 'texto').replace(/\+/g, ' ') : nomeDoDesenho(v, 'desenho')) || 'Chaveiro', pecas }], cores, hex, avisos };
  },
};

/** Chaveiro com logo e nome: logo ao lado do nome, base contornando, borda e anel; ate 9. */
export const chaveiroLogoNome: Receita = {
  ...ficha('chaveiro-logo-nome'),
  parametros: [
    {
      tipo: 'texto', id: 'nomes', rotulo: 'Nomes', grupo: 'Texto', padrao: 'ALINE, BRUNA, ELISA', maxCaracteres: 300,
      dica: `Até ${LOTE_MAX} nomes separados por vírgula; "+" quebra a linha`,
    },
    { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte', grupo: 'Texto', padrao: 'luckiest-guy' },
    { tipo: 'numero', id: 'espacamento', rotulo: 'Espaço entre letras', grupo: 'Texto', padrao: 100, min: 50, max: 200, passo: 1, unidade: '%' },
    campoDesenho('Logo (opcional)'),
    { tipo: 'liga', id: 'comLogo', rotulo: 'Usar logo', grupo: 'Desenho', padrao: true },
    { tipo: 'numero', id: 'alturaLogo', rotulo: 'Altura do logo', grupo: 'Desenho', padrao: 13, min: 5, max: 50, passo: 0.5, unidade: 'mm', visivel: (v) => v.comLogo === true },
    { tipo: 'escolha', id: 'ladoLogo', rotulo: 'Logo', grupo: 'Desenho', padrao: 'esquerda', opcoes: [{ valor: 'esquerda', rotulo: 'À esquerda' }, { valor: 'direita', rotulo: 'À direita' }], visivel: (v) => v.comLogo === true },
    { tipo: 'numero', id: 'altura', rotulo: 'Altura do chaveiro', grupo: 'Chaveiro', padrao: 20, min: 10, max: 50, passo: 0.5, unidade: 'mm' },
    { tipo: 'numero', id: 'distancia', rotulo: 'Distância logo-nome', grupo: 'Chaveiro', padrao: 2, min: 0, max: 20, passo: 0.5, unidade: 'mm' },
    { tipo: 'numero', id: 'contornoBase', rotulo: 'Contorno da base', grupo: 'Chaveiro', padrao: 2.8, min: 1, max: 10, passo: 0.1, unidade: 'mm' },
    { tipo: 'numero', id: 'larguraBorda', rotulo: 'Largura da borda', grupo: 'Chaveiro', padrao: 1, min: 0, max: 6, passo: 0.1, unidade: 'mm', dica: '0 = sem borda' },
    { tipo: 'numero', id: 'offsetBorda', rotulo: 'Distância da borda à beira', grupo: 'Chaveiro', padrao: 0.8, min: 0, max: 6, passo: 0.1, unidade: 'mm' },
    { tipo: 'numero', id: 'espBase', rotulo: 'Espessura da base', grupo: 'Espessuras', padrao: 2.8, min: 1, max: 6, passo: 0.1, unidade: 'mm' },
    { tipo: 'numero', id: 'espLogo', rotulo: 'Espessura do logo', grupo: 'Espessuras', padrao: 1.2, min: 0.4, max: 6, passo: 0.1, unidade: 'mm' },
    { tipo: 'numero', id: 'espTexto', rotulo: 'Espessura do nome', grupo: 'Espessuras', padrao: 1, min: 0.4, max: 6, passo: 0.1, unidade: 'mm' },
    { tipo: 'numero', id: 'anel', rotulo: 'Diâmetro do anel', grupo: 'Argola', padrao: 7, min: 6, max: 12, passo: 0.25, unidade: 'mm' },
    { tipo: 'numero', id: 'furo', rotulo: 'Diâmetro do furo', grupo: 'Argola', padrao: 2.75, min: 2, max: 10, passo: 0.25, unidade: 'mm' },
    cor('corBase', 'Base', '#ffffff'),
    cor('corBorda', 'Borda', '#0f172a', (v) => Number(v.larguraBorda) > 0),
    cor('corLogo', 'Logo', '#e11d48', (v) => v.comLogo === true),
    cor('corTexto', 'Nome', '#0f172a'),
  ],
  fontes: (v) => (temEmoji(txt(v, 'nomes')) ? ['noto-emoji'] : []),
  gerar(v, ctx): Resultado {
    const fonte = ctx.fonte(txt(v, 'fonte'));
    const reserva = temEmoji(txt(v, 'nomes')) ? ctx.fonte('noto-emoji') : undefined;
    const comLogo = liga(v, 'comLogo');
    const wb = num(v, 'larguraBorda');
    const cores = ['Base', ...(wb > 0 ? ['Borda'] : []), ...(comLogo ? ['Logo'] : []), 'Nome'];
    const hexes: Record<string, string> = { Base: txt(v, 'corBase'), Borda: txt(v, 'corBorda'), Logo: txt(v, 'corLogo'), Nome: txt(v, 'corTexto') };
    const iCor = (n: string) => cores.indexOf(n);
    const logo = comLogo ? desenhoNoTamanho(v, 'desenho', num(v, 'alturaLogo'), 'altura') : { regiao: [] as Region, exemplo: false };
    const eb = num(v, 'espBase'), cb = num(v, 'contornoBase');
    const r = loteDeNomes(v, (linhas, nome) => {
      const t = textoNaCaixa(linhas, { fonte, reserva, maxW: 10000, maxH: Math.max(4, num(v, 'altura') - 2 * cb), espacamento: num(v, 'espacamento') / 100, entrelinha: 1 });
      if (!t.letras.length) return { item: null, avisos: [] };
      let texto = t.regiao;
      let logoR: Region = [];
      if (logo.regiao.length) {
        const lb = regionBounds(logo.regiao), tb = t.bounds, gap = num(v, 'distancia');
        const esquerda = txt(v, 'ladoLogo') !== 'direita';
        const dxLogo = esquerda ? tb.minX - gap - lb.maxX : tb.maxX + gap - lb.minX;
        logoR = translateRegion(logo.regiao, dxLogo, 0);
        const junto = regionBounds(unir([texto, logoR]));
        const cx = (junto.minX + junto.maxX) / 2;
        texto = translateRegion(texto, -cx, 0);
        logoR = translateRegion(logoR, -cx, 0);
      }
      const contorno = semBuracos(contornar(unir([texto, logoR]), cb));
      const base = comArgola(contorno, txt(v, 'ladoLogo') === 'esquerda' && logoR.length ? 'direita' : 'esquerda', num(v, 'furo'), Math.max(1, (num(v, 'anel') - num(v, 'furo')) / 2));
      const pecas = [{ nome: 'Base', cor: iCor('Base'), camadas: [{ region: base, z0: 0, z1: eb }] }];
      if (wb > 0) {
        const fora = contornar(contorno, -num(v, 'offsetBorda'));
        pecas.push({ nome: 'Borda', cor: iCor('Borda'), camadas: [{ region: diffRegion(fora, contornar(fora, -wb)), z0: eb, z1: eb + num(v, 'espTexto') }] });
      }
      if (logoR.length) pecas.push({ nome: 'Logo', cor: iCor('Logo'), camadas: [{ region: logoR, z0: eb, z1: eb + num(v, 'espLogo') }] });
      pecas.push({ nome: 'Nome', cor: iCor('Nome'), camadas: [{ region: texto, z0: eb, z1: eb + num(v, 'espTexto') }] });
      return { item: { nome, pecas }, avisos: contorno.length > 1 ? ['A base ficou em mais de um pedaço: aumente o contorno da base.'] : [] };
    });
    const avisos = logo.exemplo ? [AVISO_EXEMPLO, ...r.avisos] : r.avisos;
    return { itens: r.itens, cores, hex: cores.map((c) => hexes[c]!), avisos };
  },
};

