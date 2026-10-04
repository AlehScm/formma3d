/**
 * Placas e listas de QR (sobre o nucleo de QR/Pix do ChatGPT: `qr.ts`, `payloads.ts`,
 * `pix.ts`): Google Review, rede social, QR com logo, Pix com logo, Pix com texto,
 * listas vertical/horizontal e em camadas, @social de 2 cores com QR e cartoes de visita.
 *
 * Logos de plataformas (Google, Instagram, TikTok...) sao marcas: aqui vai o nome da
 * plataforma escrito, estrelas desenhadas por nos, ou o SVG que a pessoa enviar.
 */
import type { Font } from 'opentype.js';
import { diffRegion, intersectRegion, regionArea, regionBounds, rotateRegion, translateRegion, type Region } from '../../geom/region';
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
  /** QR: o lado do quadrado com a zona de silencio (o QR fica centrado nele; nada encosta ali). */
  caixa?: number;
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
  const alturas = validos.map((b) => b.caixa ?? regionBounds(b.regiao).h);
  const H = o.margemTopo + o.margemBase + alturas.reduce((s, h) => s + h, 0) + o.espaco * Math.max(0, validos.length - 1) + 2 * o.borda;
  const W = o.largura;
  for (const b of validos) if (!b.caixa && regionBounds(b.regiao).w > W - 2 * (o.borda + 3)) avisos.push('Algum item é mais largo que a placa: aumente a largura da placa ou diminua o item.');
  if (validos.some((b) => b.caixa && b.caixa > W - 2 * o.borda + 0.01)) return { itens: [], cores: nomes, hex, avisos: ['O QR Code não cabe na placa: aumente a largura ou diminua o QR.'] };
  const base = retanguloArredondado(0, 0, W, H, Math.min(o.raio, W / 2 - 0.1, H / 2 - 0.1));
  let y = H / 2 - o.borda - o.margemTopo;
  const porCor: Record<Bloco['cor'], Region[]> = { qr: [], texto: [], logo: [] };
  validos.forEach((b, i) => {
    const bb = regionBounds(b.regiao);
    porCor[b.cor].push(b.caixa ? translateRegion(b.regiao, 0, y - alturas[i]! / 2) : translateRegion(b.regiao, -(bb.minX + bb.maxX) / 2, y - alturas[i]! / 2 - (bb.minY + bb.maxY) / 2));
    y -= alturas[i]! + o.espaco;
  });
  const E = o.espessura;
  const dentro = contornar(base, -(o.borda + 0.5));
  const qrCompleto = unir(porCor.qr);
  if (regionArea(diffRegion(qrCompleto, intersectRegion(qrCompleto, dentro))) > 0.01) {
    return { itens: [], cores: nomes, hex, avisos: [...avisos, 'O QR Code não cabe na placa: aumente a largura ou diminua o QR.'] };
  }
  const pecas: Peca[] = [{ nome: 'Base', cor: 0, camadas: [{ region: base, z0: 0, z1: E }] }];
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
  { tipo: 'escolha', id: 'montagem', rotulo: 'Suporte', grupo: 'Suporte', padrao: 'placa', opcoes: [{ valor: 'placa', rotulo: 'Só a placa' }, { valor: 'suporte', rotulo: 'Com pés de mesa' }, { valor: 'suporteFuro', rotulo: 'Pés com furo para parafusar' }] },
  cor('corBase', 'Base', '#4a1f2e'),
  cor('corQr', 'QR Code', '#ffffff'),
  cor('corTexto', 'Texto', '#ffffff'),
  cor('corBorda', 'Borda', '#ffffff'),
  cor('corLogo', 'Logo', '#ffffff'),
];
/**
 * Pes de mesa da placa (as medidas dos da placa-qr do ChatGPT: bloco 45 x 50 x 6 com fenda
 * de 24 mm), um ou dois conforme a largura. A fenda conta a borda em relevo, que tambem
 * entra nela. Junta tambem o aviso/nota de contraste das cores do QR.
 */
function comPes(r: Resultado, v: Valores): Resultado {
  const c = conferirCoresDoQr(txt(v, 'corQr'), txt(v, 'corBase'));
  const out: Resultado = { ...r, avisos: [...r.avisos, ...c.avisos], notas: [...(r.notas ?? []), ...c.notas] };
  const montagem = txt(v, 'montagem');
  if (!r.itens.length || (montagem !== 'suporte' && montagem !== 'suporteFuro')) return out;
  const E = num(v, 'espessura'), naFenda = E + (num(v, 'borda') > 0 ? Math.max(num(v, 'relevoTexto'), num(v, 'relevoQr')) : 0);
  const fenda = retanguloArredondado(0, 0, 24, naFenda + 0.5, 0);
  let pe = diffRegion(retanguloArredondado(0, 0, 45, 50, 4), fenda);
  if (montagem === 'suporteFuro') pe = diffRegion(pe, circulo(0, 16, 3, 40));
  const W = num(v, 'largura'), porPlaca = W < 90 ? 1 : 2, quantos = porPlaca * r.itens.length;
  out.cores = [...r.cores, 'Pés'];
  out.hex = [...(r.hex ?? []), txt(v, 'corBase')];
  const corPe = out.cores.length - 1;
  const pes: Item[] = Array.from({ length: quantos }, (_, i) => ({ nome: `Pé de mesa ${i + 1}`, pecas: [{ nome: 'Pé de mesa', cor: corPe, camadas: [{ region: pe, z0: 0, z1: 6 }] }] }));
  out.itens = emGrade([...r.itens, ...pes], 3, 10);
  out.notas = [...(out.notas ?? []), `Encaixe a borda de baixo de cada placa ${porPlaca === 1 ? 'no pé' : 'em dois pés'}. A fenda tem ${(naFenda + 0.5).toLocaleString('pt-BR')} mm: a placa${num(v, 'borda') > 0 ? ' com a borda' : ''} e 0,5 mm de folga.`];
  if (montagem === 'suporteFuro') out.notas.push('Os furos dos pés servem para parafusá-los na bancada.');
  if (num(v, 'margemBase') < 7) out.avisos.push('A margem de baixo é menor que os 6 mm que entram no pé: o que estiver ali fica escondido.');
  return out;
}

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
    return { regiao: qrParaRegiao(payload(), tam, 0.8, nivel).regiao, cor: 'qr', caixa: tam };
  } catch (e) {
    avisos.push((e as Error).message);
    return { regiao: [], cor: 'qr' };
  }
}

const semItens = (cores: string[], hex: string[], avisos: string[]): Resultado => ({ itens: [], cores, hex, avisos });
const semQrPlaca = (v: Valores, avisos: string[]): Resultado => semItens(
  ['Base', 'QR Code', 'Texto', 'Borda', 'Logo'],
  [txt(v, 'corBase'), txt(v, 'corQr'), txt(v, 'corTexto'), txt(v, 'corBorda'), txt(v, 'corLogo')],
  avisos,
);

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
    const codigo = qr(() => payloadUrl(txt(v, 'link')), num(v, 'tamQr'), avisos);
    if (!codigo.regiao.length) return semQrPlaca(v, avisos);
    const topo: Bloco = desenho(v, 'desenho') ? logo(v, 'desenho', num(v, 'altLogo'), W) : liga(v, 'estrelas') ? { regiao: estrelas(Math.min(W, num(v, 'altLogo') * 5)), cor: 'logo' } : { regiao: [], cor: 'logo' };
    const r = placaEmPilha([
      topo,
      linha(ctx, txt(v, 'titulo'), txt(v, 'fonteTitulo'), num(v, 'tamTitulo'), W),
      codigo,
      linha(ctx, txt(v, 'subtitulo'), txt(v, 'fonteSub'), num(v, 'tamSub'), W),
    ], lerPlaca(v), coresPlaca(v));
    return comPes({ ...r, avisos: [...avisos, ...r.avisos] }, v);
  },
};

/** Placa de rede social: QR do perfil, o @ embaixo, titulo e logo opcionais; ate 3 perfis, uma placa cada. */
const PERFIS = [1, 2, 3] as const;
const sufixo = (n: number) => (n === 1 ? '' : String(n));
export const placaQrSocial: Receita = {
  ...ficha('placa-qr-social'),
  parametros: [
    ...PERFIS.flatMap((n): Parametro[] => {
      const k = sufixo(n), on = (v: Valores) => n === 1 || v[`perfil${n}`] === true, grupo = n === 1 ? 'Conteúdo' : `Perfil ${n}`;
      return [
        ...(n === 1 ? [] : [{ tipo: 'liga', id: `perfil${n}`, rotulo: `Mais uma placa (perfil ${n})`, grupo, padrao: false } as Parametro]),
        { tipo: 'escolha', id: `rede${k}`, rotulo: 'Rede', grupo, padrao: ['instagram', 'tiktok', 'youtube'][n - 1]!, opcoes: REDES, visivel: on },
        texto(`handle${k}`, 'Perfil', grupo, '@formma3d', 120, 'Só o @ (em "Outra", a URL completa)', on),
      ];
    }),
    texto('titulo', 'Título (acima do QR)', 'Conteúdo', 'Siga a gente!', 60),
    texto('subtitulo', 'Subtítulo (abaixo do QR)', 'Conteúdo', '', 80, 'Vazio = o @ de cada perfil'),
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
    const W = num(v, 'largura') - 12;
    const placas: Resultado[] = [];
    for (const n of PERFIS) {
      if (n > 1 && v[`perfil${n}`] !== true) continue;
      const k = sufixo(n), rede = txt(v, `rede${k}`), handle = txt(v, `handle${k}`);
      const antes = avisos.length;
      const codigo = qr(() => urlDoPerfil(rede, handle), num(v, 'tamQr'), avisos);
      if (!codigo.regiao.length) {
        if (n > 1) avisos[antes] = `Perfil ${n}: ${avisos[antes]}`;
        return semQrPlaca(v, avisos);
      }
      const nomeRede = REDES.find((r) => r.valor === rede)?.rotulo ?? '';
      const sub = txt(v, 'subtitulo').trim() || (rede === 'outra' ? '' : '@' + handle.trim().replace(/^@/, ''));
      placas.push(placaEmPilha([
        desenho(v, 'desenho') ? logo(v, 'desenho', num(v, 'altLogo'), W) : linha(ctx, liga(v, 'nomeRede') && rede !== 'outra' ? nomeRede.toUpperCase() : '', txt(v, 'fonteTitulo'), num(v, 'tamTitulo') * 1.2, W),
        linha(ctx, txt(v, 'titulo'), txt(v, 'fonteTitulo'), num(v, 'tamTitulo'), W),
        codigo,
        linha(ctx, sub, txt(v, 'fonteSub'), num(v, 'tamSub'), W),
      ], lerPlaca(v), coresPlaca(v)));
    }
    if (placas.some((p) => !p.itens.length)) return semQrPlaca(v, [...avisos, ...placas.flatMap((p) => p.avisos)]);
    // As placas sairam com as cores que cada uma usa: volta tudo para a lista completa, pelo nome.
    const todas = ['Base', 'QR Code', 'Texto', 'Borda', 'Logo'];
    const itens = placas.flatMap((p, i) => p.itens.map((it) => ({
      ...it,
      nome: placas.length > 1 ? `Placa ${i + 1}` : it.nome,
      pecas: it.pecas.map((pc) => ({ ...pc, cor: todas.indexOf(p.cores[pc.cor]!) })),
    })));
    const hex = [txt(v, 'corBase'), txt(v, 'corQr'), txt(v, 'corTexto'), txt(v, 'corBorda'), txt(v, 'corLogo')];
    return comPes(soCoresUsadas({ itens: emGrade(itens, 3, 10), cores: todas, hex, avisos: [...avisos, ...new Set(placas.flatMap((p) => p.avisos))] }), v);
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
    mm('altLogo', 'Altura do logo', 'Conteúdo', 25, 8, 150, 1, 'No meio do QR, no máximo 28% da largura do código'),
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
    if (!bq.regiao.length) return semQrPlaca(v, avisos);
    let blocoLogo: Bloco = { regiao: [], cor: 'logo' };
    if (centro) {
      // Logo no meio: no maximo 28% da largura do codigo (sem a margem branca); limpa os
      // modulos inteiros debaixo dele, com 1 modulo de folga. A correcao H recupera isso.
      const g = qrParaRegiao(payloadUrl(txt(v, 'link')), tq, 0.8, 'H');
      const S = g.modulos * g.moduloMm, maximo = 0.28 * S;
      const lado = Math.min(num(v, 'altLogo'), maximo);
      if (num(v, 'altLogo') > maximo + 0.01) avisos.push(`Logo no meio reduzido para ${lado.toFixed(1).replace('.', ',')} mm, para o QR continuar lendo. Para um logo maior, aumente o QR ou ponha o logo acima.`);
      const l = logo(v, 'desenho', lado, lado, true);
      const lb = regionBounds(l.regiao), m = g.moduloMm;
      const grade = (x: number, cima: boolean) => -S / 2 + (cima ? Math.ceil : Math.floor)((x + S / 2) / m) * m;
      const x0 = grade(lb.minX - m, false), x1 = grade(lb.maxX + m, true), y0 = grade(lb.minY - m, false), y1 = grade(lb.maxY + m, true);
      bq = { ...bq, regiao: diffRegion(bq.regiao, retanguloArredondado((x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0, 0)) };
      blocoLogo = l;
    } else blocoLogo = logo(v, 'desenho', num(v, 'altLogo'), W, true);
    if (!desenho(v, 'desenho')) avisos.push(AVISO_EXEMPLO);
    const blocos: Bloco[] = centro
      ? [linha(ctx, txt(v, 'titulo'), txt(v, 'fonteTitulo'), num(v, 'tamTitulo'), W), bq, linha(ctx, txt(v, 'subtitulo'), txt(v, 'fonteSub'), num(v, 'tamSub'), W)]
      : [blocoLogo, linha(ctx, txt(v, 'titulo'), txt(v, 'fonteTitulo'), num(v, 'tamTitulo'), W), bq, linha(ctx, txt(v, 'subtitulo'), txt(v, 'fonteSub'), num(v, 'tamSub'), W)];
    const r = placaEmPilha(blocos, lerPlaca(v), coresPlaca(v));
    if (!r.itens.length) return { ...r, avisos: [...avisos, ...r.avisos] };
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
    return comPes({ ...r, avisos: [...avisos, ...r.avisos] }, v);
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
    const codigo = qrPix(v, avisos);
    if (!codigo.regiao.length) return semQrPlaca(v, avisos);
    const r = placaEmPilha([logo(v, 'desenho', num(v, 'altLogo'), W), linha(ctx, txt(v, 'titulo'), txt(v, 'fonteTitulo'), num(v, 'tamTitulo'), W), codigo, subPix(v, ctx, W)], lerPlaca(v), coresPlaca(v));
    return comPes({ ...r, avisos: [...avisos, ...r.avisos] }, v);
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
    const codigo = qrPix(v, avisos);
    if (!codigo.regiao.length) return semQrPlaca(v, avisos);
    const linhas = [1, 2, 3].map((n) => linha(ctx, txt(v, `linha${n}`), txt(v, `fonte${n}`), 5 * (num(v, `escala${n}`) / 100), W));
    const r = placaEmPilha([...linhas, codigo, subPix(v, ctx, W)], lerPlaca(v), coresPlaca(v));
    return comPes({ ...r, avisos: [...avisos, ...r.avisos] }, v);
  },
};

/** Icones desenhados por nos (nao sao as marcas das plataformas), centrados, dentro de w x w. */
type Icone = 'link' | 'wifi' | 'conversa' | 'camera' | 'nota' | 'play' | 'losango' | 'estrela';
const poli = (pts: [number, number][]): Region => unir([[{ outer: pts.map(([x, y]) => ({ x, y })), holes: [] }]]);
const anel = (cx: number, cy: number, r: number, e: number): Region => diffRegion(circulo(cx, cy, r, 72), circulo(cx, cy, r - e, 72));
const moldura = (cx: number, cy: number, w: number, h: number, r: number, e: number): Region =>
  diffRegion(retanguloArredondado(cx, cy, w, h, r), retanguloArredondado(cx, cy, w - 2 * e, h - 2 * e, Math.max(0, r - e)));
/** Escala e centra `r` para caber em `w` x `w`. */
function noQuadrado(r: Region, w: number): Region {
  const b = regionBounds(r);
  if (!(b.w > 0 && b.h > 0)) return [];
  return escalar(translateRegion(r, -(b.minX + b.maxX) / 2, -(b.minY + b.maxY) / 2), w / Math.max(b.w, b.h));
}
function icone(tipo: Icone, w: number): Region {
  const u = 100, e = 9;
  let r: Region;
  switch (tipo) {
    case 'link': {
      const elo = moldura(0, 0, 62, 30, 15, e);
      r = unir([rotateRegion(translateRegion(elo, -17, 0), 45), rotateRegion(translateRegion(elo, 17, 0), 45)]);
      break;
    }
    case 'wifi': r = rotacionar90(simboloNfc(u)); break;
    case 'conversa':
      r = unir([anel(0, 6, 42, e), poli([[-30, -22], [-44, -46], [-6, -34]]), ...[-16, 0, 16].map((x) => circulo(x, 6, 6, 24))]);
      break;
    case 'camera':
      r = unir([moldura(0, -6, 92, 62, 12, e), retanguloArredondado(-20, 28, 30, 14, 3), anel(0, -6, 19, 8)]);
      break;
    case 'nota':
      r = unir([circulo(-24, -30, 13, 40), circulo(26, -22, 13, 40), retanguloArredondado(-14.5, 5, 7, 70, 0), retanguloArredondado(35.5, 13, 7, 70, 0), poli([[-18, 32], [39, 46], [39, 34], [-18, 20]])]);
      break;
    case 'play': r = unir([anel(0, 0, 45, e), poli([[-13, -21], [24, 0], [-13, 21]])]); break;
    case 'losango': r = unir([rotateRegion(moldura(0, 0, 60, 60, 8, e), 45), rotateRegion(retanguloArredondado(0, 0, 20, 20, 2), 45)]); break;
    case 'estrela': r = estrela(u); break;
  }
  return noQuadrado(r, w);
}

/** Os QR que uma lista pode ter: id, nome, icone nosso, campos e o conteudo. */
const TIPOS_LISTA: { id: string; nome: string; icone: Icone; grupo: string; campos: Parametro[]; payload: (v: Valores) => string; padrao: boolean }[] = [
  { id: 'link1', nome: 'Link 1', icone: 'link', grupo: 'Link 1', padrao: true, campos: [texto('url1', 'Link', 'Link 1', 'https://formma3d.com', 300), texto('rotulo1', 'Nome escrito', 'Link 1', 'Site', 30, undefined, (v) => v.marca === 'nome')], payload: (v) => payloadUrl(txt(v, 'url1')) },
  { id: 'link2', nome: 'Link 2', icone: 'link', grupo: 'Link 2', padrao: false, campos: [texto('url2', 'Link', 'Link 2', 'https://formma3d.com/catalogo', 300), texto('rotulo2', 'Nome escrito', 'Link 2', 'Catálogo', 30, undefined, (v) => v.marca === 'nome')], payload: (v) => payloadUrl(txt(v, 'url2')) },
  {
    id: 'wifi', nome: 'Wi-Fi', icone: 'wifi', grupo: 'Wi-Fi', padrao: false,
    campos: [
      texto('ssid', 'Nome da rede', 'Wi-Fi', 'Minha rede', 32), texto('senhaWifi', 'Senha', 'Wi-Fi', '', 63),
      { tipo: 'escolha', id: 'segurancaWifi', rotulo: 'Segurança', grupo: 'Wi-Fi', padrao: 'WPA', opcoes: [{ valor: 'WPA', rotulo: 'WPA / WPA2' }, { valor: 'WEP', rotulo: 'WEP' }, { valor: 'nopass', rotulo: 'Sem senha' }] },
      { tipo: 'liga', id: 'wifiOculta', rotulo: 'Rede oculta', grupo: 'Wi-Fi', padrao: false },
    ],
    payload: (v) => { const p = payloadWifi(txt(v, 'ssid'), txt(v, 'senhaWifi'), txt(v, 'segurancaWifi') as 'WPA'); return liga(v, 'wifiOculta') ? p.replace(/;;$/, ';H:true;;') : p; },
  },
  { id: 'whatsapp', nome: 'WhatsApp', icone: 'conversa', grupo: 'WhatsApp', padrao: true, campos: [texto('telefone', 'Telefone internacional', 'WhatsApp', '+5511999999999', 16), texto('mensagem', 'Mensagem (opcional)', 'WhatsApp', '', 200)], payload: (v) => payloadWhatsapp(txt(v, 'telefone'), txt(v, 'mensagem')) },
  { id: 'instagram', nome: 'Instagram', icone: 'camera', grupo: 'Instagram', padrao: true, campos: [texto('instagram', '@ do Instagram', 'Instagram', '@formma3d', 60)], payload: (v) => urlDoPerfil('instagram', txt(v, 'instagram')) },
  { id: 'tiktok', nome: 'TikTok', icone: 'nota', grupo: 'TikTok', padrao: false, campos: [texto('tiktok', '@ do TikTok', 'TikTok', '@formma3d', 60)], payload: (v) => urlDoPerfil('tiktok', txt(v, 'tiktok')) },
  { id: 'youtube', nome: 'YouTube', icone: 'play', grupo: 'YouTube', padrao: false, campos: [texto('youtube', '@ do YouTube', 'YouTube', '@formma3d', 60)], payload: (v) => urlDoPerfil('youtube', txt(v, 'youtube')) },
  {
    id: 'pix', nome: 'Pix', icone: 'losango', grupo: 'Pix', padrao: false,
    campos: [texto('chavePix', 'Chave Pix', 'Pix', '', 77, 'CPF, CNPJ, e-mail, telefone (+55...) ou aleatória'), texto('nomePix', 'Nome do recebedor', 'Pix', '', 25), texto('cidadePix', 'Cidade', 'Pix', '', 15)],
    payload: (v) => gerarPixEstatico({ chave: txt(v, 'chavePix'), nome: txt(v, 'nomePix'), cidade: txt(v, 'cidadePix') }),
  },
  { id: 'google', nome: 'Avalie no Google', icone: 'estrela', grupo: 'Google', padrao: false, campos: [texto('google', 'Link de avaliação', 'Google', 'https://g.page/r/SEU-CODIGO/review', 300)], payload: (v) => payloadUrl(txt(v, 'google')) },
];

/** Campos de conteudo comuns as listas: quais QR, os dados de cada um e o icone/logo de cada um. */
const camposDosQr = (): Parametro[] => [
  ...TIPOS_LISTA.map((t): Parametro => ({ tipo: 'liga', id: `usar_${t.id}`, rotulo: `QR ${t.nome}`, grupo: 'QR Codes', padrao: t.padrao })),
  { tipo: 'escolha', id: 'marca', rotulo: 'Junto de cada QR', grupo: 'QR Codes', padrao: 'icone', opcoes: [{ valor: 'icone', rotulo: 'Ícone ou logo' }, { valor: 'nome', rotulo: 'Nome escrito' }, { valor: 'nada', rotulo: 'Só o QR' }] },
  { tipo: 'fonte', id: 'fonteRotulo', rotulo: 'Fonte dos nomes', grupo: 'QR Codes', padrao: 'cal-sans', visivel: (v) => v.marca === 'nome' },
  mm('tamRotulo', 'Altura dos nomes', 'QR Codes', 4, 2, 10, 0.5, undefined, (v) => v.marca === 'nome'),
  ...TIPOS_LISTA.flatMap((t) => {
    const on = (v: Valores) => v[`usar_${t.id}`] === true;
    return [
      ...t.campos.map((c) => ({ ...c, visivel: (v: Valores) => on(v) && (!c.visivel || c.visivel(v)) }) as Parametro),
      { tipo: 'svg', id: `logo_${t.id}`, rotulo: 'Logo próprio (opcional)', grupo: t.grupo, padrao: '', dica: 'No lugar do ícone desenhado; SVG, PNG ou JPG', visivel: (v: Valores) => on(v) && v.marca === 'icone' } as Parametro,
      mm(`tamIcone_${t.id}`, 'Tamanho do ícone', t.grupo, 22, 8, 100, 1, undefined, (v) => on(v) && v.marca === 'icone'),
    ];
  }),
];

const camposSuporte = (altura: number): Parametro[] => [
  mm('alturaPe', 'Altura do suporte', 'Suporte', altura, 0, 50, 1, '0 = sem suporte'),
  mm('rebaixo', 'Profundidade da fenda', 'Suporte', 10, 3, 30, 0.5, 'Quanto da placa entra no suporte', (v) => Number(v.alturaPe) > 0),
];

/** Uma celula: QR (com a zona de silencio), o icone/logo ou o nome, posicionados em volta de (0, 0). */
interface Celula {
  qr: Region;
  marca: Region;
}

/**
 * QR ligados com o icone (ao lado ou acima) ou o nome (embaixo). Algum QR invalido: nada
 * (o motivo vai nos avisos, com o nome do QR).
 */
function celulasDaLista(v: Valores, ctx: Contexto, avisos: string[], lugar: 'lado' | 'cima'): Celula[] | null {
  const tq = num(v, 'tamQr'), modo = txt(v, 'marca');
  const out: Celula[] = [];
  let falhou = false;
  for (const t of TIPOS_LISTA) {
    if (v[`usar_${t.id}`] !== true) continue;
    let q: Region;
    try {
      q = qrParaRegiao(t.payload(v), tq).regiao;
    } catch (e) {
      avisos.push(`${t.nome}: ${(e as Error).message}`);
      falhou = true;
      continue;
    }
    let marca: Region = [];
    if (modo === 'icone') {
      const tam = num(v, `tamIcone_${t.id}`);
      marca = desenho(v, `logo_${t.id}`) ? noQuadrado(desenhoNoTamanho(v, `logo_${t.id}`, tam, 'largura').regiao, tam) : icone(t.icone, tam);
      const mb = regionBounds(marca);
      marca = lugar === 'lado' ? translateRegion(marca, -(tq / 2 + 2 + mb.w / 2), 0) : translateRegion(marca, 0, tq / 2 + 2 + mb.h / 2);
    } else if (modo === 'nome') {
      const nome = t.id === 'link1' ? txt(v, 'rotulo1') : t.id === 'link2' ? txt(v, 'rotulo2') : t.nome;
      const r = linha(ctx, nome, txt(v, 'fonteRotulo'), num(v, 'tamRotulo'), tq).regiao, rb = regionBounds(r);
      marca = r.length ? translateRegion(r, -(rb.minX + rb.maxX) / 2, -tq / 2 - 1 - rb.h / 2 - (rb.minY + rb.maxY) / 2) : [];
    }
    out.push({ qr: q, marca });
  }
  if (falhou) return null;
  return out;
}

/** Caixa de uma celula: o quadrado do QR (com a zona de silencio) mais a marca. */
function caixaDaCelula(c: Celula, tq: number) {
  const q = { minX: -tq / 2, maxX: tq / 2, minY: -tq / 2, maxY: tq / 2 };
  if (!c.marca.length) return { ...q, w: tq, h: tq };
  const m = regionBounds(c.marca);
  const minX = Math.min(q.minX, m.minX), maxX = Math.max(q.maxX, m.maxX), minY = Math.min(q.minY, m.minY), maxY = Math.max(q.maxY, m.maxY);
  return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY };
}

/** Contorno com topo em arco (meia elipse de altura `arco`) sobre um retangulo de base `W` x `H` centrado. */
function contornoEmArco(W: number, H: number, arco: number, raio = 6): Region {
  const reto = retanguloArredondado(0, 0, W, H, Math.min(raio, W / 4, H / 4));
  if (!(arco > 0)) return reto;
  const a = Math.min(arco, H * 0.9);
  return unir([
    retanguloArredondado(0, -a * 0.15, W, H - a * 0.3, Math.min(raio, W / 4)),
    retanguloArredondado(0, H / 2 - a * 0.3 - 4, W, 8, 0),
    translateRegion(escalarXY(circulo(0, 0, W / 2, 160), 1, a / (W / 2)), 0, H / 2 - a * 0.3),
  ]);
}

/** Nome do negocio (1 ou 2 linhas, cada uma na sua altura) ou o logo, centrado em (0, 0). */
function topoDaLista(v: Valores, ctx: Contexto, maxW: number): Region {
  if (desenho(v, 'desenho')) {
    const r = desenhoNoTamanho(v, 'desenho', num(v, 'altLogo'), 'altura').regiao, b = regionBounds(r);
    const k = b.w > maxW ? maxW / b.w : 1;
    return rotateRegion(escalar(r, k), num(v, 'giroLogo'));
  }
  const f = ctx.fonte(txt(v, 'fonteNegocio'));
  const l1 = txt(v, 'negocio').trim(), l2 = txt(v, 'negocio2').trim();
  const a = l1 ? textoNaCaixa([l1], { fonte: f, maxW, maxH: num(v, 'tamNegocio') }).regiao : [];
  const b = l2 ? textoNaCaixa([l2], { fonte: f, maxW, maxH: num(v, 'tamNegocio2') }).regiao : [];
  if (!a.length || !b.length) return a.length ? a : b;
  const ab = regionBounds(a), bb = regionBounds(b), g = num(v, 'tamNegocio2') * 0.45;
  return unir([translateRegion(a, -(ab.minX + ab.maxX) / 2, g / 2 - ab.minY), translateRegion(b, -(bb.minX + bb.maxX) / 2, -g / 2 - bb.maxY)]);
}

const camposTopo = (grupo: string, tam1: number, tam2: number, altLogo: number): Parametro[] => [
  texto('negocio', 'Nome do negócio', grupo, 'Formma3D', 40, 'Usado quando não há logo'),
  texto('negocio2', 'Segunda linha', grupo, '', 60),
  { tipo: 'fonte', id: 'fonteNegocio', rotulo: 'Fonte', grupo, padrao: 'cal-sans' },
  mm('tamNegocio', 'Altura da 1ª linha', grupo, tam1, 3, 30, 0.5),
  mm('tamNegocio2', 'Altura da 2ª linha', grupo, tam2, 3, 30, 0.5, undefined, (v) => !!String(v.negocio2 ?? '').trim()),
  { ...campoDesenho('Logo do negócio (opcional)'), grupo },
  mm('altLogo', 'Altura do logo', grupo, altLogo, 3, 100, 1, undefined, (v) => !!desenho(v, 'desenho')),
  mm('posYLogo', 'Subir/descer o logo ou nome', grupo, 0, -100, 100, 0.5),
  { tipo: 'numero', id: 'giroLogo', rotulo: 'Giro do logo', grupo, padrao: 0, min: 0, max: 360, passo: 1, unidade: '°', visivel: (v) => !!desenho(v, 'desenho') },
];

/** Suporte deitado com fenda para a placa (ou tabua + placa) ficar em pe. */
function suporteDeFenda(largura: number, espessuraNaFenda: number, v: Valores, corIdx: number): { item: Item; avisos: string[]; nota: string } | null {
  const hp = num(v, 'alturaPe');
  if (!(hp > 0)) return null;
  const prof = Math.min(num(v, 'rebaixo'), hp - 3);
  const W = largura + 16, L = Math.max(30, espessuraNaFenda + 20);
  const frente = retanguloArredondado(0, hp / 2, W, hp, 3);
  const b = baseDeitada(frente, hp, L, 2, [{ cx: 0, largura: largura + 0.5, espessura: espessuraNaFenda, profundidade: prof }], 0.2, 0.25);
  return {
    item: { nome: 'Suporte', pecas: [{ nome: 'Suporte', cor: corIdx, camadas: b.camadas }] },
    avisos: b.avisos,
    nota: `Fenda do suporte: ${(espessuraNaFenda + 0.5).toLocaleString('pt-BR')} mm de largura (peça + 0,25 mm de cada lado), ${prof.toLocaleString('pt-BR')} mm de fundo.`,
  };
}

/** Luminancia aproximada (0 a 1) de uma cor #rrggbb. */
function luz(hex: string): number {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  if (!Number.isFinite(n)) return 0.5;
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}
/** Contraste do QR com o fundo: pouco contraste vira aviso; QR claro no fundo escuro vira nota. */
export function conferirCoresDoQr(corQr: string, corFundo: string): { avisos: string[]; notas: string[] } {
  const a = luz(corQr), b = luz(corFundo);
  if (Math.abs(a - b) < 0.35) return { avisos: ['Pouco contraste entre o QR e o fundo: a câmera pode não ler. Use cores bem diferentes (claro e escuro).'], notas: [] };
  return { avisos: [], notas: a > b ? ['QR claro em fundo escuro: câmeras de celular atuais leem, alguns leitores antigos não. Teste antes de entregar.'] : [] };
}

const camposCoresLista: Parametro[] = [
  cor('corBase', 'Placa', '#ffffff'),
  cor('corQr', 'QR Code', '#4a1f2e'),
  cor('corLogo', 'Ícones, logo e nome', '#4a1f2e'),
  cor('corBorda', 'Borda', '#4a1f2e'),
  cor('corSuporte', 'Suporte', '#1e3a8a', (v) => Number(v.alturaPe) > 0),
];

/** Lista de QR numa placa em arco: nome/logo no topo e os QR em coluna (vertical) ou em linha (horizontal). */
function receitaLista(id: string, vertical: boolean): Receita {
  return {
    ...ficha(id),
    parametros: [
      ...camposDosQr(),
      ...camposTopo('Topo', 10, 5, 32),
      mm('tamQr', 'Tamanho de cada QR', 'Tamanho', 45, 30, 70, 1, 'Com a margem branca do QR; Pix com chave longa pede 45 ou mais'),
      mm('largura', 'Largura mínima da placa', 'Tamanho', vertical ? 80 : 110, 50, 250, 1, 'Cresce sozinha se os QR não couberem'),
      mm('espaco', 'Espaço entre os QR', 'Tamanho', vertical ? 4 : 8, 0, 30, 0.5),
      mm('margem', 'Margem', 'Tamanho', 10, 2, 40, 0.5),
      mm('arco', 'Altura do arco do topo', 'Tamanho', 40, 0, 200, 1, '0 = topo reto'),
      mm('espessura', 'Espessura da placa', 'Espessuras', 2.8, 1.2, 10, 0.2),
      mm('relevo', 'Relevo do QR, ícones e nome', 'Espessuras', 0.6, 0.2, 2, 0.1),
      mm('borda', 'Largura da borda', 'Espessuras', 3, 0, 8, 0.1, '0 = sem borda'),
      ...camposSuporte(24),
      ...camposCoresLista,
    ],
    fontes: fontesDe('fonteNegocio', 'fonteRotulo'),
    gerar(v, ctx): Resultado {
      const nomes = ['Placa', 'QR Code', 'Ícones e nome', 'Borda', 'Suporte'], hex = ['corBase', 'corQr', 'corLogo', 'corBorda', 'corSuporte'].map((c) => txt(v, c));
      const avisos: string[] = [], notas: string[] = [];
      const cel = celulasDaLista(v, ctx, avisos, vertical ? 'lado' : 'cima');
      if (!cel) return semItens(nomes, hex, avisos);
      if (!cel.length) return semItens(nomes, hex, ['Ligue ao menos um QR.']);
      const tq = num(v, 'tamQr'), m = num(v, 'margem'), esp = num(v, 'espaco'), bw = num(v, 'borda');
      const caixas = cel.map((c) => caixaDaCelula(c, tq));
      // Colunas alinhadas: na vertical o icone mais largo define a coluna dos icones; na horizontal, o mais alto a linha.
      const esq = Math.max(...caixas.map((c) => -c.minX)), dir = Math.max(...caixas.map((c) => c.maxX));
      const cima = Math.max(...caixas.map((c) => c.maxY)), baixo = Math.max(...caixas.map((c) => -c.minY));
      const n = cel.length, cw = esq + dir, ch = cima + baixo;
      const largCont = vertical ? cw : n * cw + (n - 1) * esp;
      const W = Math.max(num(v, 'largura'), largCont + 2 * (m + bw));
      const topo = topoDaLista(v, ctx, W - 2 * (m + bw + 4));
      const ht = topo.length ? regionBounds(topo).h + esp + 2 : 0;
      const pe = num(v, 'alturaPe') > 0 ? Math.min(num(v, 'rebaixo'), num(v, 'alturaPe') - 3) : 0;
      const mBaixo = Math.max(m, pe + 3);
      const corpo = vertical ? n * ch + (n - 1) * esp : ch;
      const H = ht + corpo + m + mBaixo + 2 * bw;
      const base = contornoEmArco(W, H, num(v, 'arco'));
      let y = H / 2 - bw - m;
      const qrs: Region[] = [], marcas: Region[] = [];
      if (topo.length) {
        const tb = regionBounds(topo);
        marcas.push(translateRegion(topo, -(tb.minX + tb.maxX) / 2, y + num(v, 'posYLogo') - tb.h / 2 - (tb.minY + tb.maxY) / 2));
        y -= ht;
      }
      cel.forEach((c, i) => {
        const cx = vertical ? -cw / 2 + esq : -largCont / 2 + esq + i * (cw + esp);
        const cy = vertical ? y - cima - i * (ch + esp) : y - cima;
        qrs.push(translateRegion(c.qr, cx, cy));
        if (c.marca.length) marcas.push(translateRegion(c.marca, cx, cy));
      });
      const E = num(v, 'espessura'), h = num(v, 'relevo');
      const dentro = contornar(base, -(bw + 0.5));
      const pecas: Peca[] = [
        { nome: 'Placa', cor: 0, camadas: [{ region: base, z0: 0, z1: E }] },
        { nome: 'QR Code', cor: 1, camadas: [{ region: unir(qrs), z0: E, z1: E + h }] },
      ];
      const mr = intersectRegion(unir(marcas), dentro);
      if (regionArea(mr) > 0.01) pecas.push({ nome: 'Ícones e nome', cor: 2, camadas: [{ region: mr, z0: E, z1: E + h }] });
      if (bw > 0) pecas.push({ nome: 'Borda', cor: 3, camadas: [{ region: diffRegion(base, contornar(base, -bw)), z0: E, z1: E + h }] });
      const itens: Item[] = [{ nome: vertical ? 'Lista vertical de QR' : 'Lista horizontal de QR', pecas }];
      const s = suporteDeFenda(W, E + (bw > 0 ? h : 0), v, 4);
      if (s) { itens.push(s.item); avisos.push(...s.avisos); notas.push('Encaixe a placa em pé na fenda do suporte.', s.nota); }
      if (regionBounds(base).w > 250 || regionBounds(base).h > 250) notas.push('A placa passa de 25 cm: confira se cabe na mesa da sua impressora (ou diminua os QR).');
      const c = conferirCoresDoQr(txt(v, 'corQr'), txt(v, 'corBase'));
      return soCoresUsadas({ itens: emGrade(itens, 2, 10), cores: nomes, hex, avisos: [...avisos, ...c.avisos], notas: [...notas, ...c.notas] });
    },
  };
}

export const listaQrVertical = receitaLista('lista-qr-vertical', true);
export const listaQrHorizontal = receitaLista('lista-qr-horizontal', false);

/**
 * Lista em camadas: tabua de fundo (nome ou logo girado na faixa da esquerda), placa da
 * frente em arco com icone + QR por linha, e suporte cuja fenda pega as duas juntas.
 * Cada parte tem a sua cor.
 */
export const listaQrCamadas: Receita = {
  ...ficha('lista-qr-camadas'),
  parametros: [
    ...camposDosQr(),
    ...camposTopo('Logo lateral', 11, 5, 40),
    mm('tamQr', 'Tamanho de cada QR', 'Ajustes', 45, 30, 70, 1, 'Com a margem branca do QR; Pix com chave longa pede 45 ou mais'),
    mm('espaco', 'Espaço entre os QR', 'Ajustes', 5, 0, 30, 0.5),
    mm('margem', 'Margem', 'Ajustes', 12, 2, 40, 0.5),
    mm('arco', 'Altura do arco do topo', 'Ajustes', 50, 0, 200, 1, '0 = topo reto'),
    mm('largPlaca', 'Largura da placa dos QR', 'Ajustes', 100, 50, 200, 1, 'Cresce sozinha se os QR não couberem'),
    mm('espessura', 'Espessura da placa dos QR', 'Ajustes', 2, 1, 10, 0.2),
    mm('relevo', 'Relevo do QR e dos ícones', 'Ajustes', 0.6, 0.2, 2, 0.1),
    mm('espFundo', 'Espessura da tábua de fundo', 'Tábua de fundo', 2, 1, 10, 0.2),
    mm('largFundo', 'Largura da tábua de fundo', 'Tábua de fundo', 120, 60, 260, 1),
    { tipo: 'numero', id: 'faixa', rotulo: 'Faixa do nome à esquerda', grupo: 'Tábua de fundo', padrao: 30, min: 10, max: 60, passo: 1, unidade: '%' },
    mm('sobraFundo', 'Tábua mais alta que a placa', 'Tábua de fundo', 15, 0, 60, 1),
    mm('borda', 'Largura da borda da placa', 'Ajustes', 3, 0, 8, 0.1, '0 = sem borda'),
    ...camposSuporte(24),
    cor('corFundo', 'Tábua de fundo', '#8b5e3c'),
    cor('corNome', 'Nome/logo da tábua', '#ffffff'),
    cor('corBase', 'Placa dos QR', '#ffffff'),
    cor('corQr', 'QR Code', '#4a1f2e'),
    cor('corLogo', 'Ícones', '#4a1f2e'),
    cor('corBorda', 'Borda', '#4a1f2e'),
    cor('corSuporte', 'Suporte', '#1e3a8a', (v) => Number(v.alturaPe) > 0),
  ],
  fontes: fontesDe('fonteNegocio', 'fonteRotulo'),
  gerar(v, ctx): Resultado {
    const nomes = ['Tábua de fundo', 'Nome da tábua', 'Placa dos QR', 'QR Code', 'Ícones', 'Borda', 'Suporte'];
    const hex = ['corFundo', 'corNome', 'corBase', 'corQr', 'corLogo', 'corBorda', 'corSuporte'].map((c) => txt(v, c));
    const avisos: string[] = [], notas: string[] = [];
    const cel = celulasDaLista(v, ctx, avisos, 'lado');
    if (!cel) return semItens(nomes, hex, avisos);
    if (!cel.length) return semItens(nomes, hex, ['Ligue ao menos um QR.']);
    const tq = num(v, 'tamQr'), m = num(v, 'margem'), esp = num(v, 'espaco'), bw = num(v, 'borda');
    const caixas = cel.map((c) => caixaDaCelula(c, tq));
    const esq = Math.max(...caixas.map((c) => -c.minX)), dir = Math.max(...caixas.map((c) => c.maxX));
    const cima = Math.max(...caixas.map((c) => c.maxY)), baixo = Math.max(...caixas.map((c) => -c.minY));
    const n = cel.length, cw = esq + dir, ch = cima + baixo;
    const pe = num(v, 'alturaPe') > 0 ? Math.min(num(v, 'rebaixo'), num(v, 'alturaPe') - 3) : 0;
    // Placa dos QR, com o fundo (y = 0) na mesa do suporte.
    const Wp = Math.max(num(v, 'largPlaca'), cw + 2 * (m + bw));
    const Hp = n * ch + (n - 1) * esp + m + Math.max(m, pe + 3) + 2 * bw;
    const arco = num(v, 'arco');
    const placa = translateRegion(contornoEmArco(Wp, Hp, arco), 0, Hp / 2);
    const qrs: Region[] = [], marcas: Region[] = [];
    cel.forEach((c, i) => {
      const cx = -cw / 2 + esq, cy = Hp - bw - m - cima - i * (ch + esp);
      qrs.push(translateRegion(c.qr, cx, cy));
      if (c.marca.length) marcas.push(translateRegion(c.marca, cx, cy));
    });
    const E = num(v, 'espessura'), h = num(v, 'relevo');
    const pecasPlaca: Peca[] = [
      { nome: 'Placa dos QR', cor: 2, camadas: [{ region: placa, z0: 0, z1: E }] },
      { nome: 'QR Code', cor: 3, camadas: [{ region: unir(qrs), z0: E, z1: E + h }] },
    ];
    const mr = intersectRegion(unir(marcas), contornar(placa, -(bw + 0.5)));
    if (regionArea(mr) > 0.01) pecasPlaca.push({ nome: 'Ícones', cor: 4, camadas: [{ region: mr, z0: E, z1: E + h }] });
    if (bw > 0) pecasPlaca.push({ nome: 'Borda', cor: 5, camadas: [{ region: diffRegion(placa, contornar(placa, -bw)), z0: E, z1: E + h }] });
    // Tabua de fundo: a placa comeca no fim da faixa do nome; a tabua vai alem dela em cima.
    const Wf = num(v, 'largFundo'), faixa = (Wf * num(v, 'faixa')) / 100, Hf = Hp + num(v, 'sobraFundo');
    const xPlaca = faixa + Wp / 2;
    const larguraTotal = Math.max(Wf, faixa + Wp);
    if (faixa + Wp > Wf + 0.01) notas.push('A placa dos QR passa da tábua à direita; o suporte segura as duas.');
    const tabua = translateRegion(contornoEmArco(Wf, Hf, arco), Wf / 2, Hf / 2);
    const Ef = num(v, 'espFundo');
    const pecasTabua: Peca[] = [{ nome: 'Tábua de fundo', cor: 0, camadas: [{ region: tabua, z0: 0, z1: Ef }] }];
    const topo = topoDaLista(v, ctx, Hf - 2 * m - pe);
    if (topo.length) {
      const r = desenho(v, 'desenho') ? topo : rotacionar90(topo);
      const b = regionBounds(r), k = Math.min(1, (faixa - 6) / b.w, (Hf - pe - 2 * m) / b.h);
      const nome = translateRegion(escalar(translateRegion(r, -(b.minX + b.maxX) / 2, -(b.minY + b.maxY) / 2), k), faixa / 2, (pe + Hf) / 2 + num(v, 'posYLogo'));
      const dentro = intersectRegion(nome, contornar(tabua, -2));
      if (regionArea(dentro) > 0.01) pecasTabua.push({ nome: 'Nome da tábua', cor: 1, camadas: [{ region: dentro, z0: Ef, z1: Ef + Math.max(h, 0.8) }] });
      if (k < 0.999 && !desenho(v, 'desenho')) avisos.push('O nome foi reduzido para caber na faixa: aumente a faixa ou a largura da tábua.');
    }
    const itens: Item[] = [
      { nome: 'Tábua de fundo', pecas: pecasTabua },
      { nome: 'Placa dos QR', pecas: pecasPlaca.map((p) => ({ ...p, camadas: p.camadas.map((c) => ({ ...c, region: translateRegion(c.region, xPlaca - Wf / 2, 0) })) })) },
    ];
    // A fenda pega tabua + placa juntas (com o relevo da borda da placa, que encosta na fenda).
    const s = suporteDeFenda(larguraTotal, Ef + E + (bw > 0 ? h : 0), v, 6);
    if (s) { itens.push(s.item); avisos.push(...s.avisos); notas.push('Monte a placa dos QR sobre a tábua, alinhadas por baixo, e encaixe as duas juntas na fenda do suporte.', s.nota); }
    const c = conferirCoresDoQr(txt(v, 'corQr'), txt(v, 'corBase'));
    return soCoresUsadas({ itens: emGrade(itens, 3, 10), cores: nomes, hex, avisos: [...new Set([...avisos, ...c.avisos])], notas: [...notas, ...c.notas] });
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
    if (!qrR.length) return semItens(nomes, hex, avisos);
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
function conteudoCartao(v: Valores, ctx: Contexto, W: number, H: number, margem: number, avisos: string[], nfcNoLugar = false): { regiao: Region; lugar: { cx: number; lado: number } | null; qrFalhou: boolean } {
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
  return { regiao: unir([texto, qrR]), lugar: temLugar ? { cx: cxLugar, lado: lq } : null, qrFalhou: temLugar && !nfcNoLugar && !qrR.length };
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
    const conteudoGerado = conteudoCartao(v, ctx, W, H, bw + 3, avisos);
    if (conteudoGerado.qrFalhou) return semItens(nomes, hex, avisos);
    const conteudo = intersectRegion(conteudoGerado.regiao, contornar(cartao, -(bw + 0.8)));
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
    if (c.qrFalhou) return semItens(nomes, hex, avisos);
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
