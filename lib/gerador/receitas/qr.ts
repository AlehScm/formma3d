import { buildRegion, diffRegion, regionArea, regionBounds, translateRegion, type Pt, type Region } from '../../geom/region';
import { circulo, retanguloArredondado, textoNaCaixa } from '../formas';
import { gerarPixEstatico } from '../pix';
import { payloadUrl, payloadWifi, payloadWhatsapp } from '../payloads';
import { qrParaRegiao } from '../qr';
import type { Contexto, Item, Parametro, Receita, Resultado, Valores } from '../tipos';
import { num, txt } from '../tipos';

const mm = (id: string, rotulo: string, grupo: string, padrao: number, min: number, max: number, passo = 1): Parametro =>
  ({ tipo: 'numero', id, rotulo, grupo, padrao, min, max, passo, unidade: 'mm' });
const campo = (id: string, rotulo: string, grupo: string, padrao = '', maxCaracteres = 300): Parametro =>
  ({ tipo: 'texto', id, rotulo, grupo, padrao, maxCaracteres });
const modo = (v: Valores) => String(v.tipoQr ?? 'url');
const centro = (p: Pt[], dx = 0, dy = 0): Pt[] => p.map((q) => ({ x: q.x + dx, y: q.y + dy }));

export function payloadDaPlacaQr(v: Valores): string {
  switch (modo(v)) {
    case 'url': return payloadUrl(txt(v, 'url'));
    case 'wifi': return payloadWifi(txt(v, 'ssid'), txt(v, 'senhaWifi'), txt(v, 'segurancaWifi') as 'WPA' | 'WEP' | 'nopass');
    case 'whatsapp': return payloadWhatsapp(txt(v, 'telefone'), txt(v, 'mensagem'));
    case 'pix': return gerarPixEstatico({ chave: txt(v, 'chavePix'), nome: txt(v, 'nomePix'), cidade: txt(v, 'cidadePix'), valor: num(v, 'valorPix') || undefined });
    default: throw new Error('Escolha URL, Wi-Fi, WhatsApp ou Pix.');
  }
}

export const placaQr: Receita = {
  id: 'placa-qr', nome: 'Placa com QR Code', familia: 'qr',
  resumo: 'Gera uma placa imprimível com QR Code para URL, Wi-Fi, WhatsApp ou Pix estático.',
  parametros: [
    { tipo: 'escolha', id: 'tipoQr', rotulo: 'Conteúdo do QR Code', grupo: 'Conteúdo', padrao: 'url', opcoes: [
      { valor: 'url', rotulo: 'URL' }, { valor: 'wifi', rotulo: 'Wi-Fi' }, { valor: 'whatsapp', rotulo: 'WhatsApp' }, { valor: 'pix', rotulo: 'Pix estático' },
    ] },
    { ...campo('url', 'Endereço completo', 'URL', 'https://example.com', 500), visivel: (v) => modo(v) === 'url' },
    { ...campo('ssid', 'Nome da rede', 'Wi-Fi', 'Minha rede', 32), visivel: (v) => modo(v) === 'wifi' },
    { ...campo('senhaWifi', 'Senha', 'Wi-Fi', '', 63), visivel: (v) => modo(v) === 'wifi' && v.segurancaWifi !== 'nopass' },
    { tipo: 'escolha', id: 'segurancaWifi', rotulo: 'Segurança', grupo: 'Wi-Fi', padrao: 'WPA', visivel: (v) => modo(v) === 'wifi', opcoes: [
      { valor: 'WPA', rotulo: 'WPA / WPA2' }, { valor: 'WEP', rotulo: 'WEP' }, { valor: 'nopass', rotulo: 'Sem senha' },
    ] },
    { ...campo('telefone', 'Telefone internacional', 'WhatsApp', '+5511999999999', 16), visivel: (v) => modo(v) === 'whatsapp' },
    { ...campo('mensagem', 'Mensagem inicial (opcional)', 'WhatsApp', '', 200), visivel: (v) => modo(v) === 'whatsapp' },
    { ...campo('chavePix', 'Chave Pix', 'Pix', '', 77), visivel: (v) => modo(v) === 'pix' },
    { ...campo('nomePix', 'Nome do recebedor', 'Pix', '', 25), visivel: (v) => modo(v) === 'pix' },
    { ...campo('cidadePix', 'Cidade', 'Pix', '', 15), visivel: (v) => modo(v) === 'pix' },
    { tipo: 'numero', id: 'valorPix', rotulo: 'Valor (0 = aberto)', grupo: 'Pix', padrao: 0, min: 0, max: 99999999, passo: 0.01, unidade: 'R$', visivel: (v) => modo(v) === 'pix' },
    campo('texto', 'Texto opcional na placa', 'Placa', '', 50),
    { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte do texto', grupo: 'Placa', padrao: 'cal-sans', visivel: (v) => !!String(v.texto ?? '').trim() },
    { tipo: 'escolha', id: 'posicaoTexto', rotulo: 'Posição do texto', grupo: 'Placa', padrao: 'acima', visivel: (v) => !!String(v.texto ?? '').trim(), opcoes: [
      { valor: 'acima', rotulo: 'Acima do QR' }, { valor: 'abaixo', rotulo: 'Abaixo do QR' },
    ] },
    { ...mm('alturaTexto', 'Altura do texto', 'Placa', 14, 4, 24, 0.5), visivel: (v) => !!String(v.texto ?? '').trim() },
    mm('larguraQr', 'Largura total do QR Code', 'QR Code', 82, 35, 180),
    mm('larguraPlaca', 'Largura da placa', 'Placa', 120, 50, 240),
    mm('alturaPlaca', 'Altura da placa', 'Placa', 132, 50, 280),
    { tipo: 'escolha', id: 'montagem', rotulo: 'Montagem', grupo: 'Placa', padrao: 'placa', visivel: (v) => modo(v) !== 'pix', opcoes: [
      { valor: 'placa', rotulo: 'Só a placa' }, { valor: 'suporte', rotulo: 'Com pés de mesa' }, { valor: 'suporteFuro', rotulo: 'Pés com furo de fixação' },
    ] },
    mm('espBase', 'Espessura da base', 'Impressão', 3, 1, 12, 0.2),
    mm('relevoQr', 'Altura do QR Code', 'Impressão', 0.8, 0.2, 3, 0.2),
    { tipo: 'cor', id: 'corBase', rotulo: 'Base', grupo: 'Cores', padrao: '#ffffff' },
    { tipo: 'cor', id: 'corQr', rotulo: 'QR Code', grupo: 'Cores', padrao: '#111111' },
    { tipo: 'cor', id: 'corTexto', rotulo: 'Texto', grupo: 'Cores', padrao: '#111111', visivel: (v) => !!String(v.texto ?? '').trim() },
  ],
  fontes: (v) => (String(v.texto ?? '').trim() ? [String(v.fonte)] : []),
  gerar(v: Valores, ctx: Contexto): Resultado {
    const cores = ['Base', 'QR Code', 'Texto'];
    const hex = [txt(v, 'corBase'), txt(v, 'corQr'), txt(v, 'corTexto')];
    let payload: string;
    let qr: ReturnType<typeof qrParaRegiao>;
    try {
      payload = payloadDaPlacaQr(v);
      qr = qrParaRegiao(payload, num(v, 'larguraQr'), 0.8);
    } catch (e) {
      return { itens: [], cores, hex, avisos: [e instanceof Error ? e.message : 'Não foi possível gerar o QR Code.'] };
    }

    const W = num(v, 'larguraPlaca'), H = num(v, 'alturaPlaca'), text = txt(v, 'texto').trim();
    const ladoTexto = txt(v, 'posicaoTexto') === 'abaixo' ? -1 : 1;
    const qrY = text ? -3 * ladoTexto : 0;
    const regioesQr = translateRegion(qr.regiao, 0, qrY);
    const base = retanguloArredondado(0, 0, W, H, Math.min(5, W / 10, H / 10));
    const textoCamadas = text ? textoNaCaixa([text], { fonte: ctx.fonte(txt(v, 'fonte')), maxW: W - 12, maxH: num(v, 'alturaTexto') }) : null;
    const textoRegion = textoCamadas?.regiao.length ? translateRegion(textoCamadas.regiao, 0, qrY + ladoTexto * (num(v, 'larguraQr') / 2 + 8 + textoCamadas.bounds.h / 2)) : [];
    const margemPlaca = 4;
    const bQr = regionBounds(regioesQr), bTexto = regionBounds(textoRegion);
    const avisos: string[] = [];
    const metadeQr = num(v, 'larguraQr') / 2;
    if (num(v, 'larguraQr') + 2 * margemPlaca > W) return { itens: [], cores, hex, avisos: ['A largura da placa não comporta o QR Code com sua margem livre de quatro módulos.'] };
    if (qrY - metadeQr < -H / 2 + margemPlaca || qrY + metadeQr > H / 2 - margemPlaca || (textoRegion.length && (bTexto.minY < -H / 2 + margemPlaca || bTexto.maxY > H / 2 - margemPlaca))) {
      return { itens: [], cores, hex, avisos: ['A altura da placa não comporta o QR Code e o texto. Aumente a altura ou remova o texto.'] };
    }
    if (bQr.maxX > W / 2 - margemPlaca || bQr.minX < -W / 2 + margemPlaca) return { itens: [], cores, hex, avisos: ['A largura da placa não comporta o QR Code com margem.'] };
    if (textoRegion.length && regionArea(textoRegion) > 0) {
      const box = regionBounds(textoRegion);
      if ((ladoTexto > 0 && box.minY < bQr.maxY + 2) || (ladoTexto < 0 && box.maxY > bQr.minY - 2)) return { itens: [], cores, hex, avisos: ['O texto invade a zona livre do QR Code; aumente a placa ou encurte o texto.'] };
    }
    const baseOuter = base[0]!.outer;
    const baseRegion: Region = [{ outer: centro(baseOuter), holes: [] }];
    const pecas = [
      { nome: 'Base', cor: 0, camadas: [{ region: baseRegion, z0: 0, z1: num(v, 'espBase') }] },
      { nome: 'QR Code', cor: 1, camadas: [{ region: regioesQr, z0: num(v, 'espBase'), z1: num(v, 'espBase') + num(v, 'relevoQr') }] },
    ];
    if (textoRegion.length) pecas.push({ nome: 'Texto', cor: 2, camadas: [{ region: textoRegion, z0: num(v, 'espBase'), z1: num(v, 'espBase') + num(v, 'relevoQr') }] });
    const itens: Item[] = [{ nome: 'Placa QR', pecas }];
    const notas: string[] = [];
    const montagem = modo(v) === 'pix' ? 'placa' : txt(v, 'montagem');
    if (montagem === 'suporte' || montagem === 'suporteFuro') {
      const fenda = retanguloArredondado(0, 0, 24, num(v, 'espBase') + 0.5, 0);
      let pe = diffRegion(retanguloArredondado(0, 0, 45, 50, 4), fenda);
      if (montagem === 'suporteFuro') pe = diffRegion(pe, circulo(0, 16, 3, 40));
      const quantidade = W < 90 ? 1 : 2;
      for (let i = 0; i < quantidade; i++) {
        const regiao = translateRegion(pe, W / 2 + 30, quantidade === 1 ? 0 : i === 0 ? -30 : 30);
        itens.push({ nome: `Pé de mesa ${i + 1}`, pecas: [{ nome: 'Pé de mesa', cor: 0, camadas: [{ region: regiao, z0: 0, z1: 6 }] }] });
      }
      notas.push(`Encaixe a borda inferior da placa ${quantidade === 1 ? 'no pé' : 'nos dois pés'} após imprimir. A fenda tem 0,5 mm de folga; confira o ajuste antes de colar.`);
      if (montagem === 'suporteFuro') notas.push('Os furos dos pés permitem aparafusá-los a uma bancada.');
    }
    return { itens, cores, hex, avisos, notas };
  },
};

function receitaQrFixa(id: string, nome: string, tipo: 'wifi' | 'whatsapp' | 'url' | 'pix', campos: string[]): Receita {
  const comuns = new Set(['texto', 'fonte', 'posicaoTexto', 'alturaTexto', 'larguraQr', 'larguraPlaca', 'alturaPlaca', 'montagem', 'espBase', 'relevoQr', 'corBase', 'corQr', 'corTexto']);
  return {
    ...placaQr,
    id,
    nome,
    resumo: `${nome} com QR Code próprio; o tipo de conteúdo é fixo para este modelo.`,
    parametros: placaQr.parametros
      .filter((p) => comuns.has(p.id) || campos.includes(p.id))
      .map((p) => ({ ...p, visivel: p.visivel ? (v: Valores) => p.visivel!({ ...v, tipoQr: tipo }) : undefined })),
    gerar(v, ctx) { return placaQr.gerar({ ...v, tipoQr: tipo }, ctx); },
  };
}

export const placaQrWifi = receitaQrFixa('placa-qr-wifi', 'Placa de QR Code para Wi-Fi', 'wifi', ['ssid', 'senhaWifi', 'segurancaWifi']);
export const placaQrWhatsapp = receitaQrFixa('placa-qr-whatsapp', 'Placa de QR Code para WhatsApp', 'whatsapp', ['telefone', 'mensagem']);
export const placaQrTexto = receitaQrFixa('placa-qr-texto', 'Placa de QR Code com Texto', 'url', ['url']);
export const placaPixSimples = receitaQrFixa('placa-pix-simples', 'Placa de Pix Simples', 'pix', ['chavePix', 'nomePix', 'cidadePix', 'valorPix']);
