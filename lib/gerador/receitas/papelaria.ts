/**
 * Marcador de pagina com o nome na lateral (aba fina com padrao vazado; o nome fica para
 * fora, na borda das paginas), contador raspadinha e texto grande com guia de
 * posicionamento cortada em placas que cabem na mesa.
 */
import { diffRegion, intersectRegion, regionArea, regionBounds, rotateRegion, translateRegion, type Region } from '../../geom/region';
import { ajustarLargura, circulo, comporLinhas, contornar, escalaParaLargura, retanguloArredondado, semBuracos, temEmoji, textoNaCaixa, unir } from '../formas';
import { espelharX, regular, trapezio } from '../figuras';
import { ficha } from './fichas';
import type { Item, Parametro, Peca, Receita, Resultado } from '../tipos';
import { desenho, liga, num, soCoresUsadas, txt } from '../tipos';

const cor = (id: string, rotulo: string, padrao: string): Parametro => ({ tipo: 'cor', id, rotulo, grupo: 'Cores', padrao });
const espacamento: Parametro = { tipo: 'numero', id: 'espacamento', rotulo: 'Espaço entre letras', grupo: 'Texto', padrao: 100, min: 50, max: 200, passo: 1, unidade: '%' };

/** Furos repetidos cobrindo a caixa `b` (padrao vazado da aba). */
function padraoVazado(tipo: string, b: { minX: number; minY: number; maxX: number; maxY: number }, linha: number): Region {
  const furos: Region[] = [];
  const passo = tipo === 'floral' ? 11 : 8;
  for (let x = b.minX - passo; x <= b.maxX + passo; x += passo) {
    for (let y = b.minY - passo; y <= b.maxY + passo; y += passo) {
      if (tipo === 'grade') {
        // Losangos: quadrados girados 45 graus, separados por `linha`.
        const lado = (passo - linha * Math.SQRT2) / Math.SQRT2;
        furos.push(rotateRegion(retanguloArredondado(x, y, lado, lado, 0), 45, x, y));
      } else if (tipo === 'geometrico') {
        const par = Math.round((x - b.minX) / passo) % 2 === 0;
        furos.push(translateRegion(rotateRegion(regular(3, passo - linha * 1.8), par ? 0 : 180), x, y));
      } else if (tipo === 'floral') {
        // Flor de cinco petalas: circulos em volta do miolo.
        for (let k = 0; k < 5; k++) {
          const a = (2 * Math.PI * k) / 5;
          furos.push(circulo(x + 2.6 * Math.cos(a), y + 2.6 * Math.sin(a), 1.7, 20));
        }
      }
    }
  }
  return unir(furos);
}

export const marcadorPagina: Receita = {
  ...ficha('marcador-pagina'),
  parametros: [
    { tipo: 'texto', id: 'texto', rotulo: 'Nome ou frase', grupo: 'Texto', padrao: 'só mais uma página', maxCaracteres: 40, dica: 'Fica para fora, na borda das páginas; aceita emoji' },
    { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte', grupo: 'Texto', padrao: 'cal-sans' },
    espacamento,
    { tipo: 'numero', id: 'maxW', rotulo: 'Largura máxima do nome', grupo: 'Texto', padrao: 160, min: 30, max: 200, passo: 1, unidade: 'mm' },
    { tipo: 'numero', id: 'maxH', rotulo: 'Altura máxima do nome', grupo: 'Texto', padrao: 14, min: 6, max: 40, passo: 0.5, unidade: 'mm' },
    { tipo: 'numero', id: 'espNome', rotulo: 'Espessura do nome', grupo: 'Texto', padrao: 2, min: 0.4, max: 4, passo: 0.1, unidade: 'mm' },
    { tipo: 'numero', id: 'comprimento', rotulo: 'Comprimento da aba', grupo: 'Aba', padrao: 60, min: 25, max: 150, passo: 1, unidade: 'mm', dica: 'A parte que fica dentro do livro' },
    { tipo: 'numero', id: 'largura', rotulo: 'Largura da aba', grupo: 'Aba', padrao: 0, min: 0, max: 200, passo: 1, unidade: 'mm', dica: '0 = a largura do nome' },
    { tipo: 'numero', id: 'espAba', rotulo: 'Espessura da aba', grupo: 'Aba', padrao: 1.4, min: 0.6, max: 3, passo: 0.1, unidade: 'mm' },
    {
      tipo: 'escolha', id: 'padrao', rotulo: 'Padrão da aba', grupo: 'Aba', padrao: 'grade',
      opcoes: [{ valor: 'grade', rotulo: 'Grade' }, { valor: 'geometrico', rotulo: 'Geométrico' }, { valor: 'floral', rotulo: 'Floral' }, { valor: 'liso', rotulo: 'Liso' }, { valor: 'desenho', rotulo: 'Meu desenho' }],
    },
    {
      tipo: 'escolha', id: 'acabamento', rotulo: 'O padrão sai', grupo: 'Aba', padrao: 'vazado',
      opcoes: [{ valor: 'vazado', rotulo: 'Vazado' }, { valor: 'cor', rotulo: 'Em cor, nas duas faces' }],
      visivel: (v) => v.padrao === 'grade' || v.padrao === 'geometrico' || v.padrao === 'floral',
    },
    { tipo: 'svg', id: 'desenho', rotulo: 'Desenho', grupo: 'Aba', padrao: '', visivel: (v) => v.padrao === 'desenho', dica: 'Fica em relevo na aba, na cor do nome' },
    { tipo: 'svg', id: 'desenhoVerso', rotulo: 'Desenho do verso', grupo: 'Aba', padrao: '', visivel: (v) => v.padrao === 'desenho', dica: 'Opcional: embutido na face de baixo' },
    cor('corAba', 'Aba', '#3f1d38'),
    cor('corNome', 'Nome', '#f5d0a9'),
    cor('corPadrao', 'Padrão', '#f5d0a9'),
  ],
  fontes: (v) => (temEmoji(txt(v, 'texto')) ? ['noto-emoji'] : []),
  gerar(v, ctx): Resultado {
    const cores = ['Aba', 'Nome', 'Padrão'], hex = [txt(v, 'corAba'), txt(v, 'corNome'), txt(v, 'corPadrao')];
    const reserva = temEmoji(txt(v, 'texto')) ? ctx.fonte('noto-emoji') : undefined;
    const t = textoNaCaixa([txt(v, 'texto')], { fonte: ctx.fonte(txt(v, 'fonte')), reserva, maxW: num(v, 'maxW'), maxH: num(v, 'maxH'), espacamento: num(v, 'espacamento') / 100 });
    if (!t.letras.length) return { itens: [], cores, hex, avisos: ['Digite o nome ou a frase.'] };
    // O nome vira uma tira inteira (contorno pequeno une as letras); a aba sai de baixo dele.
    const nome = semBuracos(contornar(t.regiao, 0.6));
    const nb = regionBounds(nome);
    const W = num(v, 'largura') || nb.w, L = num(v, 'comprimento');
    const aba0 = translateRegion(trapezio(W, W * 0.82, L), (nb.minX + nb.maxX) / 2, nb.minY + 1.5 - L / 2);
    let aba = aba0;
    const avisos: string[] = [];
    const tipo = txt(v, 'padrao');
    const ea = num(v, 'espAba');
    // Padrao em cor: embutido 0,4 mm em cada face (o meio da aba fica inteiro).
    let padraoCor: Region = [];
    if (tipo === 'grade' || tipo === 'geometrico' || tipo === 'floral') {
      const dentro = contornar(aba0, -2.2);
      const desenhoPadrao = diffRegion(intersectRegion(padraoVazado(tipo, regionBounds(dentro), 1.2), dentro), contornar(nome, 0.4));
      if (txt(v, 'acabamento') === 'cor') {
        if (ea < 1.2) avisos.push('A aba é fina demais para o padrão nas duas faces: use 1,2 mm ou mais.');
        else padraoCor = desenhoPadrao;
      } else aba = diffRegion(aba0, desenhoPadrao);
    }
    aba = diffRegion(aba, nome);
    const ep = 0.4;
    const pecas: Peca[] = padraoCor.length
      ? [
        { nome: 'Aba', cor: 0, camadas: [{ region: diffRegion(aba, padraoCor), z0: 0, z1: ep }, { region: aba, z0: ep, z1: ea - ep }, { region: diffRegion(aba, padraoCor), z0: ea - ep, z1: ea }] },
        { nome: 'Nome', cor: 1, camadas: [{ region: nome, z0: 0, z1: num(v, 'espNome') }] },
        { nome: 'Padrão', cor: 2, camadas: [{ region: padraoCor, z0: 0, z1: ep }, { region: padraoCor, z0: ea - ep, z1: ea }] },
      ]
      : [
        { nome: 'Aba', cor: 0, camadas: [{ region: aba, z0: 0, z1: ea }] },
        { nome: 'Nome', cor: 1, camadas: [{ region: nome, z0: 0, z1: num(v, 'espNome') }] },
      ];
    if (tipo === 'desenho') {
      const d = desenho(v, 'desenho');
      if (!d) avisos.push('Escolha o desenho da aba.');
      else {
        const ab = regionBounds(contornar(aba0, -3));
        const arte = translateRegion(ajustarLargura(d.regiao, Math.min(ab.w, ab.h * 0.9)), (ab.minX + ab.maxX) / 2, (ab.minY + ab.maxY) / 2);
        pecas.push({ nome: 'Desenho', cor: 1, camadas: [{ region: intersectRegion(arte, aba0), z0: num(v, 'espAba'), z1: num(v, 'espAba') + 0.6 }] });
      }
      const dv = desenho(v, 'desenhoVerso');
      if (dv) {
        const ab = regionBounds(contornar(aba0, -3));
        // Espelhado: le-se olhando a face de baixo.
        const arte = translateRegion(espelharX(ajustarLargura(dv.regiao, Math.min(ab.w, ab.h * 0.9))), (ab.minX + ab.maxX) / 2, (ab.minY + ab.maxY) / 2);
        const verso = intersectRegion(arte, contornar(aba, -0.6));
        if (regionArea(verso) > 0.1) {
          pecas[0] = { ...pecas[0]!, camadas: [{ region: diffRegion(aba, verso), z0: 0, z1: ep }, ...pecas[0]!.camadas.map((c) => (c.z0 === 0 ? { ...c, z0: ep } : c))] };
          pecas.push({ nome: 'Padrão', cor: 2, camadas: [{ region: verso, z0: 0, z1: ep }] });
        }
      }
    }
    return soCoresUsadas({ itens: [{ nome: txt(v, 'texto'), pecas }], cores, hex, avisos });
  },
};

export const contadorRaspadinha: Receita = {
  ...ficha('contador-raspadinha'),
  parametros: [
    { tipo: 'texto', id: 'titulo', rotulo: 'Título', grupo: 'Texto', padrao: 'Meta: 100 livros', maxCaracteres: 40 },
    { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte', grupo: 'Texto', padrao: 'luckiest-guy' },
    { tipo: 'numero', id: 'contador', rotulo: 'Até quanto contar', grupo: 'Números', padrao: 100, min: 2, max: 400, passo: 1, unidade: '' },
    { tipo: 'numero', id: 'passo', rotulo: 'De quanto em quanto', grupo: 'Números', padrao: 1, min: 1, max: 100, passo: 1, unidade: '' },
    { tipo: 'liga', id: 'regressivo', rotulo: 'Contagem regressiva', grupo: 'Números', padrao: false },
    { tipo: 'texto', id: 'antes', rotulo: 'Antes do número', grupo: 'Números', padrao: '', maxCaracteres: 4, placeholder: 'ex.: R$' },
    { tipo: 'texto', id: 'depois', rotulo: 'Depois do número', grupo: 'Números', padrao: '', maxCaracteres: 4, placeholder: 'ex.: km' },
    { tipo: 'numero', id: 'colunas', rotulo: 'Quadrados por linha', grupo: 'Placa', padrao: 10, min: 3, max: 20, passo: 1, unidade: '' },
    { tipo: 'numero', id: 'maxW', rotulo: 'Largura máxima', grupo: 'Placa', padrao: 180, min: 50, max: 280, passo: 1, unidade: 'mm' },
    { tipo: 'numero', id: 'maxH', rotulo: 'Altura máxima', grupo: 'Placa', padrao: 256, min: 60, max: 320, passo: 1, unidade: 'mm' },
    { tipo: 'numero', id: 'linha', rotulo: 'Espessura das linhas', grupo: 'Placa', padrao: 1, min: 0.5, max: 2, passo: 0.1, unidade: 'mm' },
    cor('corPlaca', 'Placa', '#ffffff'),
    cor('corGrade', 'Grade e números', '#1e293b'),
  ],
  gerar(v, ctx): Resultado {
    const cores = ['Placa', 'Grade e números'], hex = [txt(v, 'corPlaca'), txt(v, 'corGrade')];
    const fonte = ctx.fonte(txt(v, 'fonte'));
    const passo = Math.max(1, num(v, 'passo')), n = Math.floor(num(v, 'contador') / passo);
    const valores = Array.from({ length: n }, (_, i) => (i + 1) * passo);
    if (liga(v, 'regressivo')) valores.reverse();
    const cols = num(v, 'colunas'), linhas = Math.ceil(n / cols), lw = num(v, 'linha');
    const margem = 6, tituloH = txt(v, 'titulo').trim() ? 16 : 0;
    const lado = Math.min((num(v, 'maxW') - 2 * margem) / cols, (num(v, 'maxH') - 2 * margem - tituloH) / linhas);
    if (lado < 6) return { itens: [], cores, hex, avisos: [`Os quadrados ficariam com ${lado.toFixed(1)} mm: diminua a contagem ou aumente a placa.`] };
    const W = cols * lado + 2 * margem, H = linhas * lado + 2 * margem + tituloH;
    const placa = retanguloArredondado(0, 0, W, H, 4);
    const x0 = -W / 2 + margem, yTopo = H / 2 - margem - tituloH;
    const grade: Region[] = [];
    const numeros: Region[] = [];
    valores.forEach((val, i) => {
      const cx = x0 + (i % cols) * lado + lado / 2, cy = yTopo - Math.floor(i / cols) * lado - lado / 2;
      grade.push(diffRegion(retanguloArredondado(cx, cy, lado, lado, 0), retanguloArredondado(cx, cy, lado - 2 * lw, lado - 2 * lw, 0)));
      const t = textoNaCaixa([`${txt(v, 'antes')}${val}${txt(v, 'depois')}`], { fonte, maxW: lado * 0.78, maxH: lado * 0.42 });
      numeros.push(translateRegion(t.regiao, cx, cy));
    });
    const titulo = tituloH ? translateRegion(textoNaCaixa([txt(v, 'titulo')], { fonte, maxW: W - 2 * margem, maxH: tituloH - 5 }).regiao, 0, H / 2 - margem - tituloH / 2 + 1) : [];
    const desenhoGrade = unir([...grade, ...numeros, titulo]);
    return {
      itens: [{ nome: 'Raspadinha', pecas: [{ nome: 'Placa', cor: 0, camadas: [{ region: placa, z0: 0, z1: 1.6 }] }, { nome: 'Grade', cor: 1, camadas: [{ region: desenhoGrade, z0: 1.6, z1: 2.2 }] }] }],
      cores, hex,
      avisos: [],
      notas: ['Pinte os quadrados com tinta raspável (ou cubra com adesivo raspável) depois de imprimir.'],
    };
  },
};

/**
 * Texto grande para parede com guia de posicionamento: cada letra e uma peca; a guia e
 * uma placa fina com o vazado de cada letra (com folga), cortada em pedacos que cabem
 * na mesa, com encaixe de quebra-cabeca entre eles.
 */
export const textoComGuia: Receita = {
  ...ficha('texto-com-guia'),
  parametros: [
    { tipo: 'texto', id: 'texto', rotulo: 'Texto', grupo: 'Texto', padrao: '@formma3d', maxCaracteres: 30 },
    { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte', grupo: 'Texto', padrao: 'archivo-black' },
    { tipo: 'numero', id: 'tamanho', rotulo: 'Largura total', grupo: 'Texto', padrao: 700, min: 100, max: 3000, passo: 10, unidade: 'mm' },
    { ...espacamento, padrao: 105 },
    { tipo: 'numero', id: 'espTexto', rotulo: 'Espessura das letras', grupo: 'Texto', padrao: 16, min: 1, max: 100, passo: 0.5, unidade: 'mm' },
    { tipo: 'liga', id: 'espelhar', rotulo: 'Espelhar as letras', grupo: 'Texto', padrao: false, dica: 'Para imprimir com a face da frente para baixo (fica lisa na mesa)' },
    { tipo: 'numero', id: 'mesa', rotulo: 'Tamanho da mesa', grupo: 'Guia', padrao: 230, min: 150, max: 360, passo: 1, unidade: 'mm', dica: 'Cada pedaço da guia cabe neste quadrado' },
    { tipo: 'numero', id: 'espGuia', rotulo: 'Espessura da guia', grupo: 'Guia', padrao: 1.8, min: 0.8, max: 5, passo: 0.1, unidade: 'mm' },
    { tipo: 'numero', id: 'folgaLetra', rotulo: 'Folga em volta das letras', grupo: 'Guia', padrao: 0.3, min: 0, max: 1, passo: 0.05, unidade: 'mm' },
    { tipo: 'numero', id: 'folga', rotulo: 'Folga do encaixe', grupo: 'Guia', padrao: 0.2, min: 0.05, max: 0.6, passo: 0.01, unidade: 'mm' },
    cor('corLetra', 'Letras', '#0f172a'),
    cor('corGuia', 'Guia', '#fbbf24'),
  ],
  gerar(v, ctx): Resultado {
    const cores = ['Letras', 'Guia'], hex = [txt(v, 'corLetra'), txt(v, 'corGuia')];
    const fonte = ctx.fonte(txt(v, 'fonte'));
    const compor = (k: number) => comporLinhas([{ texto: txt(v, 'texto'), fonte, altura: 10 * k, espacamento: num(v, 'espacamento') / 100 }], 0);
    const t = compor(escalaParaLargura((k) => compor(k).bounds.w, num(v, 'tamanho')));
    if (!t.letras.length) return { itens: [], cores, hex, avisos: ['Digite o texto.'] };
    const mesa = num(v, 'mesa'), avisos: string[] = [];
    const notas: string[] = [];
    const itens: Item[] = t.letras.flatMap((l, i) => {
      const lb = regionBounds(l.region);
      const r = liga(v, 'espelhar') ? translateRegion(espelharX(translateRegion(l.region, -(lb.minX + lb.maxX) / 2, 0)), (lb.minX + lb.maxX) / 2, 0) : l.region;
      const nome = `${String(i + 1).padStart(2, '0')} ${l.nome}`;
      // Letra maior que a mesa: sai em pedacos com dente de encaixe.
      const partes = Math.max(lb.w, lb.h) > mesa ? cortarParaMesa(r, mesa, num(v, 'folga')) : [r];
      if (partes.length > 1) notas.push(`A letra "${l.nome}" sai em ${partes.length} pedaços: cole pelos dentes de encaixe.`);
      return partes.map((p, k) => ({ nome: partes.length > 1 ? `${nome} (${k + 1}/${partes.length})` : nome, pecas: [{ nome: 'Letra', cor: 0, camadas: [{ region: p, z0: 0, z1: num(v, 'espTexto') }] }] }));
    });
    // Guia: retangulo em volta do texto, com o vazado das letras.
    const b = t.bounds, m = 15;
    const vazado = contornar(t.regiao, num(v, 'folgaLetra'));
    const guia = diffRegion(retanguloArredondado((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2, b.w + 2 * m, b.h + 2 * m, 6), vazado);
    const gb = regionBounds(guia);
    if (gb.h > mesa) avisos.push('A guia é mais alta que a mesa: use um texto mais largo e baixo, ou uma mesa maior.');
    if (gb.h > mesa) notas.push('A guia é mais alta que a mesa: ela sai cortada também na horizontal.');
    const pedacos = cortarParaMesa(guia, mesa, num(v, 'folga'));
    pedacos.forEach((p, i) => {
      if (p.length) itens.push({ nome: `Guia ${i + 1}`, pecas: [{ nome: 'Guia', cor: 1, camadas: [{ region: p, z0: 0, z1: num(v, 'espGuia') }] }] });
    });
    return { itens, cores, hex, avisos, notas: ['Monte a guia na parede, encaixe as letras nos vazados, cole e tire a guia.', ...notas] };
  },
};

/**
 * Corta `r` em pedacos que cabem num quadrado `mesa` (primeiro na vertical, depois na
 * horizontal). Cada corte tem um dente redondo de encaixe no meio do maior trecho de
 * material da linha de corte; o lado de la ganha o vao do dente com `folga`.
 */
export function cortarParaMesa(r: Region, mesa: number, folga: number): Region[] {
  return cortarNoEixo(r, mesa, folga, 'x').flatMap((p) => cortarNoEixo(p, mesa, folga, 'y'));
}

function cortarNoEixo(r: Region, mesa: number, folga: number, eixo: 'x' | 'y'): Region[] {
  const b = regionBounds(r);
  const tam = eixo === 'x' ? b.w : b.h, ini = eixo === 'x' ? b.minX : b.minY;
  if (tam <= mesa) return [r];
  const n = Math.ceil(tam / (mesa - 12)) - 1, passo = tam / (n + 1);
  const caixa = (a0: number, a1: number, o0: number, o1: number): Region =>
    eixo === 'x' ? retanguloArredondado((a0 + a1) / 2, (o0 + o1) / 2, a1 - a0, o1 - o0, 0) : retanguloArredondado((o0 + o1) / 2, (a0 + a1) / 2, o1 - o0, a1 - a0, 0);
  const [o0, o1] = eixo === 'x' ? [b.minY - 2, b.maxY + 2] : [b.minX - 2, b.maxX + 2];
  let resto = r;
  const pedacos: Region[] = [];
  for (let c = 1; c <= n; c++) {
    const pos = ini + c * passo;
    // Maior trecho de material na linha de corte: o dente vai no meio dele.
    const linha = intersectRegion(resto, caixa(pos - 0.25, pos + 0.25, o0, o1));
    const maior = linha.reduce<{ a: number; b: ReturnType<typeof regionBounds> } | null>((m, p) => {
      const bb = regionBounds([p]), comp = eixo === 'x' ? bb.h : bb.w;
      return !m || comp > m.a ? { a: comp, b: bb } : m;
    }, null);
    let lado = caixa(ini - 2, pos, o0, o1);
    if (maior && maior.a > 6) {
      const meio = eixo === 'x' ? (maior.b.minY + maior.b.maxY) / 2 : (maior.b.minX + maior.b.maxX) / 2;
      const rd = Math.min(8, maior.a / 5);
      const centro = eixo === 'x' ? { x: pos + rd * 0.8, y: meio } : { x: meio, y: pos + rd * 0.8 };
      const pescoco = eixo === 'x' ? retanguloArredondado(pos, meio, rd * 1.2, rd, 0) : retanguloArredondado(meio, pos, rd, rd * 1.2, 0);
      lado = unir([lado, circulo(centro.x, centro.y, rd, 40), pescoco]);
    }
    pedacos.push(intersectRegion(resto, lado));
    resto = diffRegion(resto, contornar(lado, folga));
  }
  pedacos.push(resto);
  return pedacos.filter((p) => regionArea(p) > 0.5);
}
