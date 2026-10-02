/**
 * Placas e listas de QR (sobre o nucleo de QR/Pix do ChatGPT: `qr.ts`, `payloads.ts`,
 * `pix.ts`): Google Review, rede social, QR com logo, Pix com logo, Pix com texto,
 * listas vertical/horizontal e em camadas, @social de 2 cores com QR e cartoes de visita.
 *
 * Logos de plataformas (Google, Instagram, TikTok...) sao marcas: aqui vai o nome da
 * plataforma escrito, estrelas desenhadas por nos, ou o SVG que a pessoa enviar.
 */
import type { Font } from 'opentype.js';
import { diffRegion, intersectRegion, regionArea, regionBounds, translateRegion, type Region } from '../../geom/region';
import { circulo, comporLinhas, contornar, escalaParaLargura, estrela, retanguloArredondado, semBuracos, temEmoji, textoNaCaixa, unir } from '../formas';
import { espelharX, textura } from '../figuras';
import { emGrade } from '../lote';
import { comVazios } from '../solidos';
import { gerarPixEstatico } from '../pix';
import { payloadUrl, payloadWifi, payloadWhatsapp } from '../payloads';
import { qrParaRegiao } from '../qr';
import { baseDeitada } from './expositores';
import { simboloNfc } from './nfc';
import { AVISO_EXEMPLO, campoDesenho, desenhoNoTamanho } from './desenho';
import { ficha } from './fichas';
import type { Contexto, Item, Parametro, Peca, Receita, Resultado, Valores } from '../tipos';
import { desenho, liga, num, soCoresUsadas, txt } from '../tipos';

const cor = (id: string, rotulo: string, padrao: string, visivel?: (v: Valores) => boolean): Parametro => ({ tipo: 'cor', id, rotulo, grupo: 'Cores', padrao, visivel });
const mm = (id: string, rotulo: string, grupo: string, padrao: number, min: number, max: number, passo = 0.1, dica?: string, visivel?: (v: Valores) => boolean): Parametro =>
  ({ tipo: 'numero', id, rotulo, grupo, padrao, min, max, passo, unidade: 'mm', dica, visivel });
const texto = (id: string, rotulo: string, grupo: string, padrao: string, max = 80, dica?: string, visivel?: (v: Valores) => boolean): Parametro =>
  ({ tipo: 'texto', id, rotulo, grupo, padrao, maxCaracteres: max, dica, visivel });

/** Endereco do perfil a partir do @ (ou a URL inteira, se ja for uma). */
export function urlDoPerfil(rede: string, handle: string): string {
  const h = handle.trim().replace(/^@/, '');
  if (/^https?:\/\//i.test(handle.trim())) return payloadUrl(handle.trim());
  if (!h) throw new Error('Digite o @ do perfil.');
  switch (rede) {
    case 'instagram': return `https://instagram.com/${h}`;
    case 'tiktok': return `https://www.tiktok.com/@${h}`;
    case 'youtube': return `https://www.youtube.com/@${h}`;
    case 'facebook': return `https://facebook.com/${h}`;
    default: throw new Error('Para outra rede, use a URL completa do perfil.');
  }
}

const REDES = [{ valor: 'instagram', rotulo: 'Instagram' }, { valor: 'tiktok', rotulo: 'TikTok' }, { valor: 'youtube', rotulo: 'YouTube' }, { valor: 'facebook', rotulo: 'Facebook' }, { valor: 'outra', rotulo: 'Outra (URL completa)' }];

/** Fileira de estrelas (desenho nosso), largura `w`. */
function estrelas(w: number, n = 5): Region {
  const s = w / n;
  return unir(Array.from({ length: n }, (_, i) => translateRegion(estrela(s * 0.92), -w / 2 + s * (i + 0.5), 0)));
}

/** Um bloco da pilha da placa: regiao centrada em (0, 0) e a cor dela. */
interface Bloco {
  regiao: Region;
  cor: 'qr' | 'texto' | 'logo';
}

interface OpcoesPlaca {
  largura: number;
  espessura: number;
  relevoTexto: number;
  relevoLogo: number;
  relevoQr: number;
  raio: number;
  borda: number;
  espaco: number;
  margemTopo: number;
  margemBase: number;
}

/**
 * Placa vertical com os blocos empilhados de cima para baixo (logo, titulo, QR,
 * subtitulo...), altura calculada pelo conteudo, borda opcional.
 */
function placaEmPilha(blocos: Bloco[], o: OpcoesPlaca, cores: { base: string; qr: string; texto: string; borda: string; logo: string }): Resultado {
  const nomes = ['Base', 'QR Code', 'Texto', 'Borda', 'Logo'], hex = [cores.base, cores.qr, cores.texto, cores.borda, cores.logo];
  const avisos: string[] = [];
  const validos = blocos.filter((b) => regionArea(b.regiao) > 0.01);
  const alturas = validos.map((b) => regionBounds(b.regiao).h);
  const H = o.margemTopo + o.margemBase + alturas.reduce((s, h) => s + h, 0) + o.espaco * Math.max(0, validos.length - 1) + 2 * o.borda;
  const W = o.largura;
  for (const b of validos) if (regionBounds(b.regiao).w > W - 2 * (o.borda + 3)) avisos.push('Algum item é mais largo que a placa: aumente a largura da placa ou diminua o item.');
  const base = retanguloArredondado(0, 0, W, H, Math.min(o.raio, W / 2 - 0.1, H / 2 - 0.1));
  let y = H / 2 - o.borda - o.margemTopo;
  const porCor: Record<Bloco['cor'], Region[]> = { qr: [], texto: [], logo: [] };
  validos.forEach((b, i) => {
    const bb = regionBounds(b.regiao);
    porCor[b.cor].push(translateRegion(b.regiao, -(bb.minX + bb.maxX) / 2, y - alturas[i]! / 2 - (bb.minY + bb.maxY) / 2));
    y -= alturas[i]! + o.espaco;
  });
  const E = o.espessura;
  const pecas: Peca[] = [{ nome: 'Base', cor: 0, camadas: [{ region: base, z0: 0, z1: E }] }];
  const dentro = contornar(base, -(o.borda + 0.5));
  const add = (nome: string, cor: number, r: Region[], h: number) => {
    const reg = intersectRegion(unir(r), dentro);
    if (regionArea(reg) > 0.01) pecas.push({ nome, cor, camadas: [{ region: reg, z0: E, z1: E + h }] });
  };
  add('QR Code', 1, porCor.qr, o.relevoQr);
  add('Texto', 2, porCor.texto, o.relevoTexto);
  add('Logo', 4, porCor.logo, o.relevoLogo);
  if (o.borda > 0) pecas.push({ nome: 'Borda', cor: 3, camadas: [{ region: diffRegion(base, contornar(base, -o.borda)), z0: E, z1: E + Math.max(o.relevoTexto, o.relevoQr) }] });
  return soCoresUsadas({ itens: [{ nome: 'Placa', pecas }], cores: nomes, hex, avisos });
}

const camposPlaca = (larg: number, qr: number, espaco: number): Parametro[] => [
  mm('tamQr', 'Tamanho do QR Code', 'Tamanho', qr, 20, 120, 1, 'Pequeno demais pode não ler'),
  mm('largura', 'Largura da placa', 'Tamanho', larg, 60, 220, 1),
  mm('espaco', 'Espaço entre os itens', 'Tamanho', espaco, 0, 20, 0.5),
  mm('margemTopo', 'Margem de cima', 'Tamanho', 12, 0, 30, 0.5),
  mm('margemBase', 'Margem de baixo', 'Tamanho', 10, 0, 30, 0.5),
  mm('espessura', 'Espessura da placa', 'Espessuras', 3, 1.2, 10, 0.2),
  mm('relevoTexto', 'Relevo do texto', 'Espessuras', 0.6, 0.2, 2, 0.1),
  mm('relevoLogo', 'Relevo do logo', 'Espessuras', 0.6, 0.2, 2, 0.1),
  mm('relevoQr', 'Relevo do QR Code', 'Espessuras', 0.6, 0.2, 2, 0.1),
  mm('raio', 'Cantos arredondados', 'Espessuras', 10, 0, 30, 0.5),
  mm('borda', 'Largura da borda', 'Espessuras', 1, 0, 4, 0.1, '0 = sem borda'),
  cor('corBase', 'Base', '#4a1f2e'),
  cor('corQr', 'QR Code', '#ffffff'),
  cor('corTexto', 'Texto', '#ffffff'),
  cor('corBorda', 'Borda', '#ffffff'),
  cor('corLogo', 'Logo', '#ffffff'),
];
const lerPlaca = (v: Valores): OpcoesPlaca => ({
  largura: num(v, 'largura'), espessura: num(v, 'espessura'), relevoTexto: num(v, 'relevoTexto'), relevoLogo: num(v, 'relevoLogo'), relevoQr: num(v, 'relevoQr'),
  raio: num(v, 'raio'), borda: num(v, 'borda'), espaco: num(v, 'espaco'), margemTopo: num(v, 'margemTopo'), margemBase: num(v, 'margemBase'),
});
const coresPlaca = (v: Valores) => ({ base: txt(v, 'corBase'), qr: txt(v, 'corQr'), texto: txt(v, 'corTexto'), borda: txt(v, 'corBorda'), logo: txt(v, 'corLogo') });

/** Linha de texto como bloco (vazio quando o texto e vazio). */
function linha(ctx: Contexto, t: string, fonte: string, altura: number, maxW: number): Bloco {
  const s = t.trim();
  if (!s) return { regiao: [], cor: 'texto' };
  const f = ctx.fonte(fonte);
  return { regiao: textoNaCaixa([s], { fonte: f, reserva: temEmoji(s) ? ctx.fonte('noto-emoji') : undefined, maxW, maxH: altura }).regiao, cor: 'texto' };
}

/** Logo do SVG enviado, na altura pedida (vazio sem arquivo, ou o selo de exemplo com `exemplo`). */
function logo(v: Valores, id: string, altura: number, maxW: number, exemplo = false): Bloco {
  if (!desenho(v, id) && !exemplo) return { regiao: [], cor: 'logo' };
  const r = desenhoNoTamanho(v, id, altura, 'altura').regiao;
  const b = regionBounds(r);
  return { regiao: b.w > maxW ? desenhoNoTamanho(v, id, maxW, 'largura').regiao : r, cor: 'logo' };
}

/** O QR como bloco; erro vira aviso. */
function qr(payload: () => string, tam: number, avisos: string[], nivel: 'M' | 'H' = 'M'): Bloco {
  try {
    return { regiao: qrParaRegiao(payload(), tam, 0.8, nivel).regiao, cor: 'qr' };
  } catch (e) {
    avisos.push((e as Error).message);
    return { regiao: [], cor: 'qr' };
  }
}

const fontesDe = (...ids: string[]) => (v: Valores) => [...new Set(ids.map((id) => String(v[id])).filter(Boolean))];

/** Placa de avaliacao Google: estrelas (ou o seu logo), titulo, QR do link e subtitulo. */
export const placaGoogleReview: Receita = {
  ...ficha('placa-google-review'),
  parametros: [
    texto('link', 'Link de avaliação', 'Conteúdo', 'https://g.page/r/SEU-CODIGO/review', 300, 'O link "Pedir avaliações" do seu Perfil da Empresa no Google'),
    texto('titulo', 'Título (acima do QR)', 'Conteúdo', 'Avalie-nos no Google!', 60),
    texto('subtitulo', 'Subtítulo (abaixo do QR)', 'Conteúdo', 'Sua opinião é muito importante para nós!', 80),
    { tipo: 'liga', id: 'estrelas', rotulo: 'Cinco estrelas no topo', grupo: 'Conteúdo', padrao: true, dica: 'Desenho nosso; ou envie o seu logo' },
    { ...campoDesenho('Logo (opcional)'), grupo: 'Conteúdo' },
    mm('altLogo', 'Altura do logo/estrelas', 'Conteúdo', 14, 6, 60, 1),
    { tipo: 'fonte', id: 'fonteTitulo', rotulo: 'Fonte do título', grupo: 'Texto', padrao: 'cal-sans' },
    mm('tamTitulo', 'Altura do título', 'Texto', 7, 2, 20, 0.5),
    { tipo: 'fonte', id: 'fonteSub', rotulo: 'Fonte do subtítulo', grupo: 'Texto', padrao: 'cal-sans' },
    mm('tamSub', 'Altura do subtítulo', 'Texto', 4.5, 2, 15, 0.5),
    ...camposPlaca(110, 56, 8),
  ],
  fontes: fontesDe('fonteTitulo', 'fonteSub'),
  gerar(v, ctx): Resultado {
    const avisos: string[] = [];
    const W = num(v, 'largura') - 12;
    const topo: Bloco = desenho(v, 'desenho') ? logo(v, 'desenho', num(v, 'altLogo'), W) : liga(v, 'estrelas') ? { regiao: estrelas(Math.min(W, num(v, 'altLogo') * 5)), cor: 'logo' } : { regiao: [], cor: 'logo' };
    const r = placaEmPilha([
      topo,
      linha(ctx, txt(v, 'titulo'), txt(v, 'fonteTitulo'), num(v, 'tamTitulo'), W),
      qr(() => payloadUrl(txt(v, 'link')), num(v, 'tamQr'), avisos),
      linha(ctx, txt(v, 'subtitulo'), txt(v, 'fonteSub'), num(v, 'tamSub'), W),
    ], lerPlaca(v), coresPlaca(v));
    return { ...r, avisos: [...avisos, ...r.avisos] };
  },
};

/** Placa de rede social: QR do perfil, o @ embaixo, titulo e logo opcionais. */
export const placaQrSocial: Receita = {
  ...ficha('placa-qr-social'),
  parametros: [
    { tipo: 'escolha', id: 'rede', rotulo: 'Rede', grupo: 'Conteúdo', padrao: 'instagram', opcoes: REDES },
    texto('handle', 'Perfil', 'Conteúdo', '@formma3d', 120, 'Só o @ (em "Outra", a URL completa)'),
    texto('titulo', 'Título (acima do QR)', 'Conteúdo', 'Siga a gente!', 60),
    texto('subtitulo', 'Subtítulo (abaixo do QR)', 'Conteúdo', '', 80, 'Vazio = o @ do perfil'),
    { tipo: 'liga', id: 'nomeRede', rotulo: 'Nome da rede no topo', grupo: 'Conteúdo', padrao: true, dica: 'Escrito (o logo da plataforma é marca dela; envie o seu se tiver licença)' },
    { ...campoDesenho('Logo (opcional)'), grupo: 'Conteúdo' },
    mm('altLogo', 'Altura do logo', 'Conteúdo', 16, 6, 80, 1),
    { tipo: 'fonte', id: 'fonteTitulo', rotulo: 'Fonte do título', grupo: 'Texto', padrao: 'cal-sans' },
    mm('tamTitulo', 'Altura do título', 'Texto', 6, 2, 20, 0.5),
    { tipo: 'fonte', id: 'fonteSub', rotulo: 'Fonte do subtítulo', grupo: 'Texto', padrao: 'cal-sans' },
    mm('tamSub', 'Altura do subtítulo', 'Texto', 7, 2, 15, 0.5),
    ...camposPlaca(100, 56, 8),
  ],
  fontes: fontesDe('fonteTitulo', 'fonteSub'),
  gerar(v, ctx): Resultado {
    const avisos: string[] = [];
    const W = num(v, 'largura') - 12, rede = txt(v, 'rede');
    const nomeRede = REDES.find((r) => r.valor === rede)?.rotulo ?? '';
    const sub = txt(v, 'subtitulo').trim() || (rede === 'outra' ? '' : '@' + txt(v, 'handle').trim().replace(/^@/, ''));
    const r = placaEmPilha([
      desenho(v, 'desenho') ? logo(v, 'desenho', num(v, 'altLogo'), W) : linha(ctx, liga(v, 'nomeRede') && rede !== 'outra' ? nomeRede.toUpperCase() : '', txt(v, 'fonteTitulo'), num(v, 'tamTitulo') * 1.2, W),
      linha(ctx, txt(v, 'titulo'), txt(v, 'fonteTitulo'), num(v, 'tamTitulo'), W),
      qr(() => urlDoPerfil(rede, txt(v, 'handle')), num(v, 'tamQr'), avisos),
      linha(ctx, sub, txt(v, 'fonteSub'), num(v, 'tamSub'), W),
    ], lerPlaca(v), coresPlaca(v));
    return { ...r, avisos: [...avisos, ...r.avisos] };
  },
};

/**
 * QR com logo: o logo em cima ou no meio do QR (com correcao H e os modulos debaixo do
 * logo limpos, no maximo ~20% da area). Titulo e subtitulo opcionais.
 */
export const placaQrLogo: Receita = {
  ...ficha('placa-qr-logo'),
  parametros: [
    texto('link', 'Link do QR Code', 'Conteúdo', 'https://formma3d.com', 300),
    { ...campoDesenho('Logo'), grupo: 'Conteúdo' },
    { tipo: 'escolha', id: 'posLogo', rotulo: 'Logo', grupo: 'Conteúdo', padrao: 'acima', opcoes: [{ valor: 'acima', rotulo: 'Acima do QR' }, { valor: 'centro', rotulo: 'No meio do QR' }] },
    mm('altLogo', 'Altura do logo', 'Conteúdo', 25, 8, 150, 1),
    texto('titulo', 'Título (acima do QR)', 'Conteúdo', 'INSTAGRAM', 60),
    texto('subtitulo', 'Subtítulo (abaixo do QR)', 'Conteúdo', '@formma3d', 80),
    { tipo: 'fonte', id: 'fonteTitulo', rotulo: 'Fonte do título', grupo: 'Texto', padrao: 'cal-sans' },
    mm('tamTitulo', 'Altura do título', 'Texto', 6, 2, 30, 0.5),
    { tipo: 'fonte', id: 'fonteSub', rotulo: 'Fonte do subtítulo', grupo: 'Texto', padrao: 'cal-sans' },
    mm('tamSub', 'Altura do subtítulo', 'Texto', 5, 2, 15, 0.5),
    ...camposPlaca(110, 56, 9),
  ],
  fontes: fontesDe('fonteTitulo', 'fonteSub'),
  gerar(v, ctx): Resultado {
    const avisos: string[] = [];
    const W = num(v, 'largura') - 12, tq = num(v, 'tamQr');
    const centro = txt(v, 'posLogo') === 'centro';
    let bq = qr(() => payloadUrl(txt(v, 'link')), tq, avisos, centro ? 'H' : 'M');
    let blocoLogo: Bloco = { regiao: [], cor: 'logo' };
    if (centro && bq.regiao.length) {
      // Logo no meio: ate ~20% da area util do QR, com 1 modulo limpo em volta.
      const lado = tq * 0.38;
      const l = logo(v, 'desenho', lado, lado, true);
      const limpo = contornar(semBuracos(contornar(l.regiao, 1.2)), 0);
      bq = { regiao: diffRegion(bq.regiao, limpo), cor: 'qr' };
      blocoLogo = l;
      if (regionArea(limpo) > tq * tq * 0.22) avisos.push('O logo cobre muito do QR: ele pode não ler. Diminua o logo.');
    } else blocoLogo = logo(v, 'desenho', num(v, 'altLogo'), W, true);
    if (!desenho(v, 'desenho')) avisos.push(AVISO_EXEMPLO);
    const blocos: Bloco[] = centro
      ? [linha(ctx, txt(v, 'titulo'), txt(v, 'fonteTitulo'), num(v, 'tamTitulo'), W), { regiao: unir([bq.regiao]), cor: 'qr' }, linha(ctx, txt(v, 'subtitulo'), txt(v, 'fonteSub'), num(v, 'tamSub'), W)]
      : [blocoLogo, linha(ctx, txt(v, 'titulo'), txt(v, 'fonteTitulo'), num(v, 'tamTitulo'), W), bq, linha(ctx, txt(v, 'subtitulo'), txt(v, 'fonteSub'), num(v, 'tamSub'), W)];
    const r = placaEmPilha(blocos, lerPlaca(v), coresPlaca(v));
    if (centro && blocoLogo.regiao.length) {
      // O logo vai no meio do QR (que ja foi posto na pilha): acha o centro do QR.
      const pecaQr = r.itens[0]!.pecas.find((p) => p.nome === 'QR Code');
      if (pecaQr) {
        const qb = regionBounds(pecaQr.camadas[0]!.region);
        const lb = regionBounds(blocoLogo.regiao);
        const E = num(v, 'espessura');
        r.itens[0]!.pecas.push({ nome: 'Logo', cor: r.cores.length, camadas: [{ region: translateRegion(blocoLogo.regiao, (qb.minX + qb.maxX) / 2 - (lb.minX + lb.maxX) / 2, (qb.minY + qb.maxY) / 2 - (lb.minY + lb.maxY) / 2), z0: E, z1: E + num(v, 'relevoLogo') }] });
        r.cores.push('Logo');
        r.hex?.push(txt(v, 'corLogo'));
      }
    }
    return { ...r, avisos: [...avisos, ...r.avisos] };
  },
};

const camposPix = (): Parametro[] => [
  texto('chavePix', 'Chave Pix', 'Pix', '', 77, 'CPF, CNPJ, e-mail, telefone (+55...) ou chave aleatória'),
  texto('nomePix', 'Nome do recebedor', 'Pix', '', 25),
  texto('cidadePix', 'Cidade', 'Pix', '', 15),
  { tipo: 'numero', id: 'valorPix', rotulo: 'Valor (0 = aberto)', grupo: 'Pix', padrao: 0, min: 0, max: 99999999, passo: 0.01, unidade: 'R$' },
  texto('subtitulo', 'Texto embaixo do QR', 'Pix', '', 60, 'Vazio = a própria chave'),
  { tipo: 'numero', id: 'escalaSub', rotulo: 'Tamanho do texto de baixo', grupo: 'Pix', padrao: 100, min: 10, max: 200, passo: 1, unidade: '%' },
  { tipo: 'fonte', id: 'fonteSub', rotulo: 'Fonte do texto de baixo', grupo: 'Pix', padrao: 'cal-sans' },
];
const qrPix = (v: Valores, avisos: string[]) => qr(() => gerarPixEstatico({ chave: txt(v, 'chavePix'), nome: txt(v, 'nomePix'), cidade: txt(v, 'cidadePix'), valor: num(v, 'valorPix') || undefined }), num(v, 'tamQr'), avisos);
const subPix = (v: Valores, ctx: Contexto, W: number) => linha(ctx, txt(v, 'subtitulo').trim() || txt(v, 'chavePix'), txt(v, 'fonteSub'), 4.5 * (num(v, 'escalaSub') / 100), W);

/** Sem chave nao ha Pix: nada de inventar recebedor. */
const semChave = (v: Valores): Resultado => ({ itens: [], cores: ['Base', 'QR Code', 'Texto', 'Borda', 'Logo'], hex: [txt(v, 'corBase'), txt(v, 'corQr'), txt(v, 'corTexto'), txt(v, 'corBorda'), txt(v, 'corLogo')], avisos: ['Digite a chave Pix, o nome e a cidade do recebedor.'] });

/** Pix com logo: logo, titulo, QR Pix (BR Code estatico) e a chave embaixo. */
export const placaPixLogo: Receita = {
  ...ficha('placa-pix-logo'),
  parametros: [
    ...camposPix(),
    texto('titulo', 'Título (acima do QR)', 'Conteúdo', 'PAGUE COM PIX', 60),
    { ...campoDesenho('Logo (opcional)'), grupo: 'Conteúdo' },
    mm('altLogo', 'Altura do logo', 'Conteúdo', 20, 6, 150, 1),
    { tipo: 'fonte', id: 'fonteTitulo', rotulo: 'Fonte do título', grupo: 'Texto', padrao: 'cal-sans' },
    mm('tamTitulo', 'Altura do título', 'Texto', 6, 2, 20, 0.5),
    ...camposPlaca(100, 56, 8),
  ],
  fontes: fontesDe('fonteTitulo', 'fonteSub'),
  gerar(v, ctx): Resultado {
    if (!txt(v, 'chavePix').trim()) return semChave(v);
    const avisos: string[] = [];
    const W = num(v, 'largura') - 12;
    const r = placaEmPilha([logo(v, 'desenho', num(v, 'altLogo'), W), linha(ctx, txt(v, 'titulo'), txt(v, 'fonteTitulo'), num(v, 'tamTitulo'), W), qrPix(v, avisos), subPix(v, ctx, W)], lerPlaca(v), coresPlaca(v));
    return { ...r, avisos: [...avisos, ...r.avisos] };
  },
};

/** Pix com texto: ate 3 linhas acima do QR (fonte e tamanho de cada uma) e a chave embaixo. */
export const placaPixTexto: Receita = {
  ...ficha('placa-pix-texto'),
  parametros: [
    ...camposPix(),
    ...[1, 2, 3].flatMap((n): Parametro[] => [
      texto(`linha${n}`, `Linha ${n}`, 'Texto', n === 1 ? 'MINHA LOJA' : n === 2 ? 'PAGUE COM PIX' : '', 60),
      { tipo: 'fonte', id: `fonte${n}`, rotulo: `Fonte da linha ${n}`, grupo: 'Texto', padrao: 'cal-sans', visivel: (v) => !!String(v[`linha${n}`] ?? '').trim() },
      { tipo: 'numero', id: `escala${n}`, rotulo: `Tamanho da linha ${n}`, grupo: 'Texto', padrao: n === 1 ? 140 : 100, min: 10, max: 250, passo: 1, unidade: '%', visivel: (v) => !!String(v[`linha${n}`] ?? '').trim() },
    ]),
    ...camposPlaca(100, 56, 6),
  ],
  fontes: fontesDe('fonte1', 'fonte2', 'fonte3', 'fonteSub'),
  gerar(v, ctx): Resultado {
    if (!txt(v, 'chavePix').trim()) return semChave(v);
    const avisos: string[] = [];
    const W = num(v, 'largura') - 12;
    const linhas = [1, 2, 3].map((n) => linha(ctx, txt(v, `linha${n}`), txt(v, `fonte${n}`), 5 * (num(v, `escala${n}`) / 100), W));
    const r = placaEmPilha([...linhas, qrPix(v, avisos), subPix(v, ctx, W)], lerPlaca(v), coresPlaca(v));
    return { ...r, avisos: [...avisos, ...r.avisos] };
  },
};

/** Os QR que uma lista pode ter: id, nome escrito embaixo, campos e o conteudo. */
const TIPOS_LISTA: { id: string; nome: string; campos: Parametro[]; payload: (v: Valores) => string; padrao: boolean }[] = [
  { id: 'link1', nome: 'Site', padrao: true, campos: [texto('url1', 'Link', 'Link 1', 'https://formma3d.com', 300), texto('rotulo1', 'Nome embaixo', 'Link 1', 'Site', 30)], payload: (v) => payloadUrl(txt(v, 'url1')) },
  { id: 'link2', nome: 'Link', padrao: false, campos: [texto('url2', 'Link', 'Link 2', 'https://formma3d.com/catalogo', 300), texto('rotulo2', 'Nome embaixo', 'Link 2', 'Catálogo', 30)], payload: (v) => payloadUrl(txt(v, 'url2')) },
  {
    id: 'wifi', nome: 'Wi-Fi', padrao: false,
    campos: [texto('ssid', 'Nome da rede', 'Wi-Fi', 'Minha rede', 32), texto('senhaWifi', 'Senha', 'Wi-Fi', '', 63), { tipo: 'escolha', id: 'segurancaWifi', rotulo: 'Segurança', grupo: 'Wi-Fi', padrao: 'WPA', opcoes: [{ valor: 'WPA', rotulo: 'WPA / WPA2' }, { valor: 'WEP', rotulo: 'WEP' }, { valor: 'nopass', rotulo: 'Sem senha' }] }],
    payload: (v) => payloadWifi(txt(v, 'ssid'), txt(v, 'senhaWifi'), txt(v, 'segurancaWifi') as 'WPA'),
  },
  { id: 'whatsapp', nome: 'WhatsApp', padrao: true, campos: [texto('telefone', 'Telefone internacional', 'WhatsApp', '+5511999999999', 16), texto('mensagem', 'Mensagem (opcional)', 'WhatsApp', '', 200)], payload: (v) => payloadWhatsapp(txt(v, 'telefone'), txt(v, 'mensagem')) },
  { id: 'instagram', nome: 'Instagram', padrao: true, campos: [texto('instagram', '@ do Instagram', 'Instagram', '@formma3d', 60)], payload: (v) => urlDoPerfil('instagram', txt(v, 'instagram')) },
  { id: 'tiktok', nome: 'TikTok', padrao: false, campos: [texto('tiktok', '@ do TikTok', 'TikTok', '@formma3d', 60)], payload: (v) => urlDoPerfil('tiktok', txt(v, 'tiktok')) },
  { id: 'youtube', nome: 'YouTube', padrao: false, campos: [texto('youtube', '@ do YouTube', 'YouTube', '@formma3d', 60)], payload: (v) => urlDoPerfil('youtube', txt(v, 'youtube')) },
  {
    id: 'pix', nome: 'Pix', padrao: false,
    campos: [texto('chavePix', 'Chave Pix', 'Pix', '', 77), texto('nomePix', 'Nome do recebedor', 'Pix', '', 25), texto('cidadePix', 'Cidade', 'Pix', '', 15)],
    payload: (v) => gerarPixEstatico({ chave: txt(v, 'chavePix'), nome: txt(v, 'nomePix'), cidade: txt(v, 'cidadePix') }),
  },
  { id: 'google', nome: 'Avalie no Google', padrao: false, campos: [texto('google', 'Link de avaliação', 'Google', 'https://g.page/r/SEU-CODIGO/review', 300)], payload: (v) => payloadUrl(txt(v, 'google')) },
];

const camposLista = (padraoQr: number): Parametro[] => [
  ...TIPOS_LISTA.map((t): Parametro => ({ tipo: 'liga', id: `usar_${t.id}`, rotulo: `QR ${t.nome}`, grupo: 'QR Codes', padrao: t.padrao })),
  ...TIPOS_LISTA.flatMap((t) => t.campos.map((c) => ({ ...c, visivel: (v: Valores) => v[`usar_${t.id}`] === true }) as Parametro)),
  texto('negocio', 'Nome do negócio', 'Topo', 'Formma3D', 40, 'Usado quando não há logo'),
  texto('negocio2', 'Segunda linha', 'Topo', '', 60),
  { tipo: 'fonte', id: 'fonteNegocio', rotulo: 'Fonte', grupo: 'Topo', padrao: 'cal-sans' },
  mm('tamNegocio', 'Altura do nome', 'Topo', 10, 3, 25, 0.5),
  { ...campoDesenho('Logo do negócio (opcional)'), grupo: 'Topo' },
  mm('altLogo', 'Altura do logo', 'Topo', 26, 5, 100, 1),
  { tipo: 'fonte', id: 'fonteRotulo', rotulo: 'Fonte dos nomes embaixo', grupo: 'QR Codes', padrao: 'cal-sans' },
  mm('tamRotulo', 'Altura dos nomes embaixo', 'QR Codes', 4, 2, 10, 0.5),
  mm('tamQr', 'Tamanho de cada QR', 'Tamanho', padraoQr, 30, 70, 1),
  mm('espaco', 'Espaço entre os QR', 'Tamanho', 6, 0, 30, 0.5),
  mm('margem', 'Margem', 'Tamanho', 10, 2, 40, 0.5),
  { tipo: 'liga', id: 'topoRedondo', rotulo: 'Topo arredondado', grupo: 'Tamanho', padrao: true },
  mm('espessura', 'Espessura da base', 'Espessuras', 2.8, 1.2, 10, 0.2),
  mm('relevo', 'Relevo do QR e dos textos', 'Espessuras', 0.6, 0.2, 2, 0.1),
  mm('borda', 'Largura da borda', 'Espessuras', 3, 0, 8, 0.1, '0 = sem borda'),
  cor('corBase', 'Base', '#4a1f2e'),
  cor('corQr', 'QR e textos', '#ffffff'),
  cor('corBorda', 'Borda', '#f5d0a9'),
];

/** Celulas da lista (QR + nome embaixo, centradas), so os ligados; erros viram aviso. */
function celulasDaLista(v: Valores, ctx: Contexto, avisos: string[]): { qr: Region; rotulo: Region }[] {
  const out: { qr: Region; rotulo: Region }[] = [];
  for (const t of TIPOS_LISTA) {
    if (v[`usar_${t.id}`] !== true) continue;
    const b = qr(() => t.payload(v), num(v, 'tamQr'), avisos);
    if (!b.regiao.length) { avisos.push(`(${t.nome})`); continue; }
    const nome = t.id === 'link1' ? txt(v, 'rotulo1') : t.id === 'link2' ? txt(v, 'rotulo2') : t.nome;
    const rot = linha(ctx, nome, txt(v, 'fonteRotulo'), num(v, 'tamRotulo'), num(v, 'tamQr')).regiao;
    const qb = regionBounds(b.regiao), rb = regionBounds(rot);
    out.push({ qr: b.regiao, rotulo: rot.length ? translateRegion(rot, -(rb.minX + rb.maxX) / 2, qb.minY - 2 - rb.h / 2 - (rb.minY + rb.maxY) / 2) : [] });
  }
  return out;
}

/** Cabecalho da lista: logo ou nome (1 ou 2 linhas), centrado em (0, 0). */
function topoDaLista(v: Valores, ctx: Contexto, maxW: number): Region {
  if (desenho(v, 'desenho')) return logo(v, 'desenho', num(v, 'altLogo'), maxW).regiao;
  const l = [txt(v, 'negocio'), txt(v, 'negocio2')].filter((s) => s.trim());
  if (!l.length) return [];
  return textoNaCaixa(l, { fonte: ctx.fonte(txt(v, 'fonteNegocio')), maxW, maxH: num(v, 'tamNegocio') * (l.length > 1 ? 1.6 : 1), entrelinha: 1.5, razoes: [1, 0.55] }).regiao;
}

/**
 * Lista de QR (vertical ou horizontal): placa com o logo/nome no topo e ate 9 QR (site,
 * Wi-Fi, WhatsApp, redes, Pix, Google), cada um com o nome escrito embaixo.
 */
export const listaQr: Receita = {
  ...ficha('lista-qr'),
  parametros: [
    { tipo: 'escolha', id: 'direcao', rotulo: 'Direção', grupo: 'Lista', padrao: 'vertical', opcoes: [{ valor: 'vertical', rotulo: 'Vertical' }, { valor: 'horizontal', rotulo: 'Horizontal' }] },
    ...camposLista(40),
    mm('largura', 'Largura mínima da placa', 'Tamanho', 80, 50, 220, 1, 'Cresce sozinha se os QR não couberem'),
  ],
  fontes: fontesDe('fonteNegocio', 'fonteRotulo'),
  gerar(v, ctx): Resultado {
    const nomes = ['Base', 'QR e textos', 'Borda'], hex = [txt(v, 'corBase'), txt(v, 'corQr'), txt(v, 'corBorda')];
    const avisos: string[] = [];
    const cel = celulasDaLista(v, ctx, avisos);
    if (!cel.length) return { itens: [], cores: nomes, hex, avisos: avisos.length ? avisos : ['Ligue ao menos um QR.'] };
    const vertical = txt(v, 'direcao') !== 'horizontal';
    const m = num(v, 'margem'), esp = num(v, 'espaco'), bw = num(v, 'borda'), tq = num(v, 'tamQr');
    const altCel = Math.max(...cel.map((c) => regionBounds(unir([c.qr, c.rotulo])).h));
    const n = cel.length;
    const largCont = vertical ? tq : n * tq + (n - 1) * esp;
    const W = Math.max(num(v, 'largura'), largCont + 2 * (m + bw));
    const topo = topoDaLista(v, ctx, W - 2 * (m + bw));
    const ht = topo.length ? regionBounds(topo).h + esp : 0;
    const corpo = vertical ? n * altCel + (n - 1) * esp : altCel;
    const H = ht + corpo + 2 * (m + bw);
    // Topo em arco: meia elipse (meio circulo na placa estreita) por cima do retangulo.
    const arco = liga(v, 'topoRedondo') ? Math.min(W / 2, 40) : 0;
    let base = retanguloArredondado(0, 0, W, H, Math.min(6, W / 4));
    if (arco) base = unir([retanguloArredondado(0, -arco * 0.15, W, H - arco * 0.3, Math.min(6, W / 4)), retanguloArredondado(0, H / 2 - arco * 0.3 - 4, W, 8, 0), translateRegion(escalarXY(circulo(0, 0, W / 2, 160), 1, arco / (W / 2)), 0, H / 2 - arco * 0.3)]);
    const bb = regionBounds(base);
    let y = bb.maxY - arco - bw - m + arco * 0.3;
    const desenhos: Region[] = [];
    if (topo.length) { const tb = regionBounds(topo); desenhos.push(translateRegion(topo, -(tb.minX + tb.maxX) / 2, y - tb.h / 2 - (tb.minY + tb.maxY) / 2)); y -= ht; }
    cel.forEach((c, i) => {
      const junto = unir([c.qr, c.rotulo]), jb = regionBounds(junto);
      const cx = vertical ? 0 : -largCont / 2 + tq / 2 + i * (tq + esp);
      const cy = vertical ? y - i * (altCel + esp) - altCel / 2 : y - altCel / 2;
      desenhos.push(translateRegion(junto, cx - (jb.minX + jb.maxX) / 2, cy - (jb.minY + jb.maxY) / 2 + (altCel - jb.h) / 2 * 0));
    });
    const E = num(v, 'espessura'), h = num(v, 'relevo');
    const pecas: Peca[] = [
      { nome: 'Base', cor: 0, camadas: [{ region: base, z0: 0, z1: E }] },
      { nome: 'QR e textos', cor: 1, camadas: [{ region: intersectRegion(unir(desenhos), contornar(base, -(bw + 0.5))), z0: E, z1: E + h }] },
    ];
    if (bw > 0) pecas.push({ nome: 'Borda', cor: 2, camadas: [{ region: diffRegion(base, contornar(base, -bw)), z0: E, z1: E + h + 0.4 }] });
    return soCoresUsadas({ itens: [{ nome: 'Lista de QR', pecas }], cores: nomes, hex, avisos: [...new Set(avisos)] });
  },
};

/**
 * Lista em camadas: tabua de fundo com o nome do negocio na faixa da esquerda (girado) e
 * os QR em plaquinhas proprias, cada uma em cima da tabua (outra cor), mais um pe com
 * fenda para ficar em pe.
 */
export const listaQrCamadas: Receita = {
  ...ficha('lista-qr-camadas'),
  parametros: [
    ...camposLista(40).filter((p) => !['topoRedondo', 'borda', 'corBorda'].includes(p.id)),
    mm('largPlaca', 'Largura das plaquinhas', 'Camadas', 60, 40, 120, 1),
    mm('espPlaquinha', 'Espessura das plaquinhas', 'Camadas', 2, 0.6, 6, 0.2),
    { tipo: 'numero', id: 'faixa', rotulo: 'Faixa do nome', grupo: 'Camadas', padrao: 30, min: 15, max: 50, passo: 1, unidade: '%', dica: 'Parte da largura da tábua, à esquerda, para o nome' },
    mm('alturaPe', 'Altura do pé', 'Camadas', 24, 0, 50, 1, '0 = sem pé'),
    cor('corPlaquinha', 'Plaquinhas', '#f5d0a9'),
  ],
  fontes: fontesDe('fonteNegocio', 'fonteRotulo'),
  gerar(v, ctx): Resultado {
    const nomes = ['Tábua', 'QR e textos', 'Plaquinhas e nome'], hex = [txt(v, 'corBase'), txt(v, 'corQr'), txt(v, 'corPlaquinha')];
    const avisos: string[] = [];
    const cel = celulasDaLista(v, ctx, avisos);
    if (!cel.length) return { itens: [], cores: nomes, hex, avisos: avisos.length ? avisos : ['Ligue ao menos um QR.'] };
    const m = num(v, 'margem'), esp = num(v, 'espaco'), lp = Math.max(num(v, 'largPlaca'), num(v, 'tamQr') + 6);
    const altCel = Math.max(...cel.map((c) => regionBounds(unir([c.qr, c.rotulo])).h)) + 6;
    const n = cel.length;
    const corpo = n * altCel + (n - 1) * esp;
    const faixa = num(v, 'faixa') / 100;
    const W = (lp + 2 * m) / (1 - faixa), H = corpo + 2 * m;
    const tabua = retanguloArredondado(0, 0, W, H, 6);
    const xQr = -W / 2 + W * faixa + m + lp / 2;
    // Nome do negocio girado na faixa da esquerda.
    const topo = topoDaLista(v, ctx, H - 2 * m);
    const nome = topo.length ? (() => { const r = rotacionar90(topo); const b = regionBounds(r); const k = Math.min(1, (W * faixa - 2 * m) / b.w); return translateRegion(escalar(r, k), -W / 2 + (W * faixa) / 2 - (b.minX + b.maxX) / 2 * k, -(b.minY + b.maxY) / 2 * k); })() : [];
    const E = num(v, 'espessura'), ep = num(v, 'espPlaquinha'), h = num(v, 'relevo');
    const plaquinhas: Region[] = [], desenhos: Region[] = [nome];
    cel.forEach((c, i) => {
      const cy = H / 2 - m - altCel / 2 - i * (altCel + esp);
      plaquinhas.push(retanguloArredondado(xQr, cy, lp, altCel, 3));
      const junto = unir([c.qr, c.rotulo]), jb = regionBounds(junto);
      desenhos.push(translateRegion(junto, xQr - (jb.minX + jb.maxX) / 2, cy - (jb.minY + jb.maxY) / 2));
    });
    const pl = unir(plaquinhas);
    const qrs = unir(desenhos.slice(1));
    const pecas: Peca[] = [
      { nome: 'Tábua', cor: 0, camadas: [{ region: tabua, z0: 0, z1: E }] },
      { nome: 'Plaquinhas', cor: 2, camadas: [{ region: pl, z0: E, z1: E + ep }] },
      { nome: 'QR e textos', cor: 1, camadas: [{ region: intersectRegion(qrs, pl), z0: E + ep, z1: E + ep + h }] },
    ];
    if (nome.length) pecas.push({ nome: 'Nome', cor: 2, camadas: [{ region: intersectRegion(nome, contornar(tabua, -2)), z0: E, z1: E + Math.max(h, 0.8) }] });
    const itens: Item[] = [{ nome: 'Lista em camadas', pecas }];
    const hp = num(v, 'alturaPe');
    if (hp > 0) {
      const frente = retanguloArredondado(0, hp / 2, Math.min(W * 0.8, 120), hp, 3);
      const pe = baseDeitada(frente, hp, 30, 0, [{ cx: 0, largura: Math.min(W * 0.8, 120) - 20, espessura: E, profundidade: Math.min(10, hp - 4) }], 0.2, 0.25);
      itens.push({ nome: 'Pé', pecas: [{ nome: 'Pé', cor: 0, camadas: pe.camadas }] });
      avisos.push(...pe.avisos);
    }
    return soCoresUsadas({ itens: emGrade(itens, 2, 10), cores: nomes, hex, avisos: [...new Set(avisos)], notas: hp > 0 ? ['Encaixe a base da tábua na fenda do pé.'] : [] });
  },
};

const rotacionar90 = (r: Region): Region => r.map((p) => ({ outer: p.outer.map((q) => ({ x: -q.y, y: q.x })), holes: p.holes.map((h) => h.map((q) => ({ x: -q.y, y: q.x }))) }));
const escalarXY = (r: Region, kx: number, ky: number): Region => r.map((p) => ({ outer: p.outer.map((q) => ({ x: q.x * kx, y: q.y * ky })), holes: p.holes.map((h) => h.map((q) => ({ x: q.x * kx, y: q.y * ky }))) }));
const escalar = (r: Region, k: number): Region => escalarXY(r, k, k);

/**
 * @social de 2 cores com QR: base grossa no contorno do texto, que se estende num
 * quadrado a direita onde fica o QR; topo com as letras e o QR na outra cor.
 */
export const socialComQr: Receita = {
  ...ficha('social-com-qr'),
  parametros: [
    texto('usuario', 'Texto', 'Texto', '@formma3d', 30),
    texto('link', 'Link do QR', 'Texto', 'https://instagram.com/formma3d', 300, 'Use o link mais curto que puder'),
    { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte', grupo: 'Texto', padrao: 'cal-sans' },
    mm('largura', 'Largura total', 'Texto', 190, 80, 280, 1),
    { tipo: 'numero', id: 'escalaQr', rotulo: 'Tamanho do QR', grupo: 'Texto', padrao: 100, min: 50, max: 300, passo: 1, unidade: '%', dica: '100% = a altura do texto com a base' },
    mm('contornoBase', 'Contorno da base', 'Camadas', 7, 4, 10, 0.5),
    mm('engrossarTopo', 'Engrossar as letras', 'Camadas', 0.4, 0, 1, 0.01),
    { tipo: 'liga', id: 'preencher', rotulo: 'Tapar o miolo da base', grupo: 'Camadas', padrao: true },
    mm('espBase', 'Altura da base', 'Camadas', 18, 4, 30, 0.5),
    mm('espTopo', 'Altura do topo', 'Camadas', 2.2, 0.6, 5, 0.1),
    mm('folga', 'Folga do encaixe', 'Camadas', 0.22, 0.1, 0.5, 0.01),
    { tipo: 'escolha', id: 'montagem', rotulo: 'Como imprimir', grupo: 'Camadas', padrao: 'ams', opcoes: [{ valor: 'ams', rotulo: 'Uma peça multicor' }, { valor: 'encaixe', rotulo: 'Topo encaixado na base' }] },
    cor('corBase', 'Base', '#4a1f2e'),
    cor('corTopo', 'Topo e QR', '#ffffff'),
  ],
  fontes: (v) => [String(v.fonte)],
  gerar(v, ctx): Resultado {
    const nomes = ['Base', 'Topo e QR'], hex = [txt(v, 'corBase'), txt(v, 'corTopo')];
    const avisos: string[] = [];
    const u = txt(v, 'usuario').trim();
    if (!u) return { itens: [], cores: nomes, hex, avisos: ['Digite o texto.'] };
    const f: Font = ctx.fonte(txt(v, 'fonte'));
    const cb = num(v, 'contornoBase');
    // Primeiro o QR na altura do texto+base; depois o texto encolhe para tudo caber na largura.
    const compor = (k: number) => comporLinhas([{ texto: u, fonte: f, altura: 10 * k }], 0);
    const larguraCom = (k: number) => { const t = compor(k); const lado = (t.bounds.h + 2 * cb) * (num(v, 'escalaQr') / 100); return t.bounds.w + 1.4 * cb + lado; };
    const k = escalaParaLargura(larguraCom, num(v, 'largura'));
    const t = compor(k);
    const lado = (t.bounds.h + 2 * cb) * (num(v, 'escalaQr') / 100);
    let qrR: Region = [];
    try { qrR = qrParaRegiao(payloadUrl(txt(v, 'link')), lado - 2, 0.8).regiao; } catch (e) { avisos.push((e as Error).message); }
    const xQr = t.bounds.maxX + 0.4 * cb + lado / 2;
    const quadrado = retanguloArredondado(xQr, 0, lado, lado, Math.min(4, cb));
    let base = unir([contornar(t.regiao, cb), quadrado]);
    if (liga(v, 'preencher')) base = semBuracos(base);
    const topo = num(v, 'engrossarTopo') > 0 ? contornar(t.regiao, num(v, 'engrossarTopo')) : t.regiao;
    const qrPosto = translateRegion(qrR, xQr, 0);
    const topoTudo = unir([topo, qrPosto]);
    const eb = num(v, 'espBase'), et = num(v, 'espTopo');
    const encaixe = txt(v, 'montagem') === 'encaixe';
    const p = encaixe ? Math.min(0.8, eb - 0.6) : 0;
    const pecas: Peca[] = [
      { nome: 'Base', cor: 0, camadas: p > 0 ? comVazios(base, 0, eb, [{ regiao: contornar(topoTudo, num(v, 'folga')), z0: eb - p, z1: eb }]) : [{ region: base, z0: 0, z1: eb }] },
      { nome: 'Topo e QR', cor: 1, camadas: [{ region: topoTudo, z0: eb - p, z1: eb - p + et }] },
    ];
    if (base.length > 1) avisos.push('A base saiu em partes: aumente o contorno.');
    return { itens: [{ nome: u, pecas }], cores: nomes, hex, avisos };
  },
};

/** Campos do porta-cartao (pe com fenda e texto na frente). */
const camposPorta: Parametro[] = [
  { tipo: 'liga', id: 'porta', rotulo: 'Porta-cartões', grupo: 'Porta-cartões', padrao: true },
  mm('largPorta', 'Largura do porta-cartões', 'Porta-cartões', 100, 60, 200, 1, undefined, (v) => v.porta === true),
  texto('textoPorta', 'Texto na frente', 'Porta-cartões', '', 30, undefined, (v) => v.porta === true),
  { tipo: 'fonte', id: 'fontePorta', rotulo: 'Fonte', grupo: 'Porta-cartões', padrao: 'cal-sans', visivel: (v) => v.porta === true && !!String(v.textoPorta ?? '').trim() },
  mm('tamPorta', 'Altura do texto', 'Porta-cartões', 8, 3, 30, 0.5, undefined, (v) => v.porta === true && !!String(v.textoPorta ?? '').trim()),
  cor('corPorta', 'Porta-cartões', '#a85f78', (v) => v.porta === true),
];

/** Porta-cartao deitado: bloco com fenda para a pilha de cartoes e texto na frente. */
function portaCartao(v: Valores, ctx: Contexto, corIdx: number): { item: Item; avisos: string[] } {
  const W = num(v, 'largPorta'), H = 22, L = 34;
  const frente = retanguloArredondado(0, H / 2, W, H, 3);
  const b = baseDeitada(frente, H, L, 4, [{ cx: 0, largura: Math.min(92, W - 6), espessura: 14, profundidade: 12 }], 0, 0.3);
  const pecas: Peca[] = [{ nome: 'Porta-cartões', cor: corIdx, camadas: b.camadas }];
  const t = txt(v, 'textoPorta').trim();
  if (t) {
    const r = textoNaCaixa([t], { fonte: ctx.fonte(txt(v, 'fontePorta')), maxW: W * 0.85, maxH: Math.min(num(v, 'tamPorta'), H - 12) }).regiao;
    pecas.push({ nome: 'Texto do porta-cartões', cor: corIdx, camadas: [{ region: translateRegion(r, 0, (H - 4) / 2), z0: L, z1: L + 0.8 }] });
  }
  return { item: { nome: 'Porta-cartões', pecas }, avisos: b.avisos };
}

const camposCartao: Parametro[] = [
  texto('linha1', 'Nome', 'Cartão', 'Ana Souza', 40),
  texto('linha2', 'Cargo ou empresa', 'Cartão', 'Design e impressão 3D', 50),
  texto('linha3', 'Contato 1', 'Cartão', '+55 11 99999-9999', 50),
  texto('linha4', 'Contato 2', 'Cartão', 'ana@formma3d.com', 50),
  { tipo: 'fonte', id: 'fonteNome', rotulo: 'Fonte do nome', grupo: 'Cartão', padrao: 'cal-sans' },
  { tipo: 'fonte', id: 'fonteResto', rotulo: 'Fonte das outras linhas', grupo: 'Cartão', padrao: 'montserrat-900' },
  texto('linkQr', 'Link do QR (opcional)', 'Cartão', 'https://formma3d.com', 300, 'Vazio = sem QR'),
  mm('largura', 'Largura', 'Cartão', 90, 70, 100, 0.5),
  mm('altura', 'Altura', 'Cartão', 50, 40, 60, 0.5),
];

/**
 * Texto (4 linhas, a 1a maior, centradas na altura) e QR do cartao. O QR fica no lado
 * direito; com `nfcNoLugar`, o lugar dele fica livre (para a capa do NFC) e volta em `lugar`.
 */
function conteudoCartao(v: Valores, ctx: Contexto, W: number, H: number, margem: number, avisos: string[], nfcNoLugar = false): { regiao: Region; lugar: { cx: number; lado: number } | null } {
  const temLugar = nfcNoLugar || !!txt(v, 'linkQr').trim();
  const lq = temLugar ? Math.min(H - 2 * margem, W * 0.38) : 0;
  const cxLugar = W / 2 - margem - lq / 2 + 2;
  let qrR: Region = [];
  if (temLugar && !nfcNoLugar) {
    try { qrR = translateRegion(qrParaRegiao(payloadUrl(txt(v, 'linkQr')), lq, 0.6).regiao, cxLugar, 0); } catch (e) { avisos.push((e as Error).message); }
  }
  const largTexto = W - 2 * margem - lq;
  const fn = ctx.fonte(txt(v, 'fonteNome')), fr = ctx.fonte(txt(v, 'fonteResto'));
  const nome = txt(v, 'linha1').trim(), resto = ['linha2', 'linha3', 'linha4'].map((id) => txt(v, id).trim()).filter(Boolean);
  const blocos: Region[] = [];
  let y = H / 2 - margem;
  if (nome) { const t = textoNaCaixa([nome], { fonte: fn, maxW: largTexto, maxH: H * 0.18 }).regiao, b = regionBounds(t); blocos.push(translateRegion(t, -W / 2 + margem - b.minX, y - b.maxY)); y -= b.h + H * 0.08; }
  for (const l of resto) { const t = textoNaCaixa([l], { fonte: fr, maxW: largTexto, maxH: H * 0.085 }).regiao, b = regionBounds(t); blocos.push(translateRegion(t, -W / 2 + margem - b.minX, y - b.maxY)); y -= b.h + H * 0.05; }
  if (y < -H / 2 + margem - 1) avisos.push('O texto passa da altura do cartão: encurte as linhas.');
  const sobra = blocos.length ? regionBounds(unir(blocos)).minY - (-H / 2 + margem) : 0;
  const texto = sobra > 0 ? translateRegion(unir(blocos), 0, -sobra / 2) : unir(blocos);
  return { regiao: unir([texto, qrR]), lugar: temLugar ? { cx: cxLugar, lado: lq } : null };
}

/** Cartao de visita: texto e QR em relevo (face para cima) ou embutidos (face para baixo), borda e textura de Hilbert opcional na base. */
export const cartaoVisita: Receita = {
  ...ficha('cartao-visita'),
  parametros: [
    ...camposCartao,
    { tipo: 'escolha', id: 'face', rotulo: 'Impressão', grupo: 'Impressão', padrao: 'cima', opcoes: [{ valor: 'cima', rotulo: 'Face para cima (relevo)' }, { valor: 'baixo', rotulo: 'Face para baixo (liso)' }] },
    mm('espessura', 'Espessura do cartão', 'Impressão', 0.8, 0.6, 3, 0.2),
    mm('relevo', 'Relevo do texto e do QR', 'Impressão', 0.4, 0.2, 1, 0.2),
    mm('borda', 'Largura da borda', 'Impressão', 0.8, 0, 3, 0.1),
    { tipo: 'liga', id: 'textura', rotulo: 'Textura de Hilbert na base', grupo: 'Impressão', padrao: false, dica: 'Só na base, por baixo do texto' },
    ...camposPorta,
    cor('corCartao', 'Cartão', '#1f2937'),
    cor('corTexto', 'Texto, QR e borda', '#ffffff'),
  ],
  fontes: fontesDe('fonteNome', 'fonteResto', 'fontePorta'),
  gerar(v, ctx): Resultado {
    const nomes = ['Cartão', 'Texto, QR e borda', 'Porta-cartões'], hex = [txt(v, 'corCartao'), txt(v, 'corTexto'), txt(v, 'corPorta')];
    const avisos: string[] = [];
    const W = num(v, 'largura'), H = num(v, 'altura'), E = num(v, 'espessura'), h = num(v, 'relevo'), bw = num(v, 'borda');
    const cartao = retanguloArredondado(0, 0, W, H, 3);
    const borda = bw > 0 ? diffRegion(cartao, contornar(cartao, -bw)) : [];
    const conteudo = intersectRegion(conteudoCartao(v, ctx, W, H, bw + 3, avisos).regiao, contornar(cartao, -(bw + 0.8)));
    const frente = unir([conteudo, borda]);
    const pecas: Peca[] = [];
    if (txt(v, 'face') === 'baixo') {
      // Face para baixo: tudo embutido rente a face da mesa, espelhado.
      const m = espelharX(frente), e = Math.min(h, E - 0.2);
      pecas.push({ nome: 'Cartão', cor: 0, camadas: comVazios(espelharX(cartao), 0, E, [{ regiao: m, z0: 0, z1: e }]) }, { nome: 'Frente', cor: 1, camadas: [{ region: m, z0: 0, z1: e }] });
    } else {
      const tex = liga(v, 'textura') ? diffRegion(intersectRegion(textura('hilbert', regionBounds(cartao), 3, 0.8), contornar(cartao, -(bw + 0.5))), contornar(conteudo, 1)) : [];
      pecas.push({ nome: 'Cartão', cor: 0, camadas: [{ region: cartao, z0: 0, z1: E }, ...(regionArea(tex) > 0.5 ? [{ region: tex, z0: E, z1: E + h * 0.5 }] : [])] }, { nome: 'Frente', cor: 1, camadas: [{ region: frente, z0: E, z1: E + h }] });
    }
    const itens: Item[] = [{ nome: 'Cartão', pecas }];
    if (liga(v, 'porta')) { const p = portaCartao(v, ctx, 2); itens.push(p.item); avisos.push(...p.avisos); }
    return soCoresUsadas({ itens: emGrade(itens, 1, 10), cores: nomes, hex, avisos: [...new Set(avisos)] });
  },
};

/**
 * Cartao com tecido: moldura do cartao; na pausa (2a camada) entra o tecido e o texto/QR
 * imprimem em cima dele. NFC opcional numa capa redonda (bolsao fechado, outra pausa).
 */
export const cartaoTecido: Receita = {
  ...ficha('cartao-tecido'),
  parametros: [
    ...camposCartao,
    mm('espessura', 'Espessura do cartão', 'Impressão', 1.2, 1, 2.4, 0.1),
    mm('borda', 'Largura da moldura', 'Impressão', 2.8, 1.5, 8, 0.1),
    { tipo: 'liga', id: 'nfc', rotulo: 'NFC', grupo: 'Impressão', padrao: false, dica: 'Capa redonda com a etiqueta dentro (25 mm)' },
    ...camposPorta,
    cor('corCartao', 'Moldura e texto', '#1f2937'),
    cor('corNfc', 'Capa do NFC', '#ffffff', (v) => v.nfc === true),
  ],
  fontes: fontesDe('fonteNome', 'fonteResto', 'fontePorta'),
  gerar(v, ctx): Resultado {
    const nomes = ['Moldura e texto', 'Capa do NFC', 'Porta-cartões'], hex = [txt(v, 'corCartao'), txt(v, 'corNfc'), txt(v, 'corPorta')];
    const avisos: string[] = [], notas: string[] = [];
    const W = num(v, 'largura'), H = num(v, 'altura'), E = num(v, 'espessura'), bw = num(v, 'borda'), zp = 0.4;
    const cartao = retanguloArredondado(0, 0, W, H, 3), janela = contornar(cartao, -bw);
    const nfc = liga(v, 'nfc');
    const c = conteudoCartao(v, ctx, W, H, bw + 3, avisos, nfc);
    const conteudo = intersectRegion(c.regiao, contornar(janela, -0.5));
    const pecas: Peca[] = [
      { nome: 'Moldura', cor: 0, camadas: [{ region: diffRegion(cartao, janela), z0: 0, z1: E }] },
      { nome: 'Texto e QR', cor: 0, camadas: [{ region: conteudo, z0: zp, z1: E }] },
    ];
    notas.push(`Pause em ${zp.toLocaleString('pt-BR')} mm (2ª camada), estique o tecido sobre o cartão e continue.`);
    if (nfc && c.lugar) {
      // A capa do NFC fica no lugar do QR (encostar o celular em vez de ler).
      const rc = Math.min(14.5, c.lugar.lado / 2), zb = zp + 0.2, eb = 0.4;
      const capa = circulo(c.lugar.cx, 0, rc, 96), simbolo = translateRegion(simboloNfc(rc * 1.1), c.lugar.cx + rc * 0.1, 0);
      if (rc < 13.5) avisos.push('O cartão é baixo demais para a etiqueta NFC de 25 mm: aumente a altura.');
      if (E < zb + eb + 0.2) avisos.push('O cartão é fino demais para o NFC: use 1,2 mm ou mais (etiqueta adesiva fina).');
      const marca = Math.min(0.4, E - (zb + eb));
      pecas.push({ nome: 'Capa do NFC', cor: 1, camadas: comVazios(capa, zp, E, [{ regiao: circulo(c.lugar.cx, 0, Math.min(12.8, rc - 1), 96), z0: zb, z1: zb + eb }, { regiao: simbolo, z0: E - marca, z1: E }]) });
      pecas[1] = { ...pecas[1]!, camadas: [...pecas[1]!.camadas, { region: simbolo, z0: E - marca, z1: E }] };
      notas.push(`Pause também em ${(zb + eb).toLocaleString('pt-BR')} mm para pôr a etiqueta NFC de 25 mm.`);
      if (txt(v, 'linkQr').trim()) notas.push('Com NFC, a capa dele fica no lugar do QR.');
    }
    const itens: Item[] = [{ nome: 'Cartão', pecas }];
    if (liga(v, 'porta')) { const p = portaCartao(v, ctx, 2); itens.push(p.item); avisos.push(...p.avisos); }
    return soCoresUsadas({ itens: emGrade(itens, 1, 10), cores: nomes, hex, avisos: [...new Set(avisos)], notas });
  },
};
