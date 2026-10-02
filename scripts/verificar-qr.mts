import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { Font } from 'opentype.js';
import { parseFont } from '../lib/text/glyphs';
import { valoresPadrao } from '../lib/gerador/tipos';
import { payloadWhatsapp, payloadWifi, payloadUrl } from '../lib/gerador/payloads';
import { crc16Ccitt, gerarPixEstatico } from '../lib/gerador/pix';
import { qrParaRegiao } from '../lib/gerador/qr';
import { payloadDaPlacaQr, placaQr, placaPixSimples, placaQrTexto, placaQrWhatsapp, placaQrWifi } from '../lib/gerador/receitas/qr';
import { cartaoTecido, cartaoVisita, listaQrVertical, listaQrHorizontal, listaQrCamadas, placaGoogleReview, placaPixLogo, placaPixTexto, placaQrLogo, placaQrSocial, socialComQr } from '../lib/gerador/receitas/qrplacas';
import { receitaPorId } from '../lib/gerador/receitas';
import { FICHAS } from '../lib/gerador/receitas/fichas';
import { regionArea, regionBounds } from '../lib/geom/region';
import { malhaFechada } from '../lib/mesh/relevo';
import { posicoesDaPeca } from '../lib/gerador/malha';
import { blob3mfMontado, blob3mfSoltas, zipStl } from '../lib/gerador/exportar';
import { lerTresMf } from '../lib/import/tresmf';
import JSZip from 'jszip';

assert.equal(payloadUrl('https://example.com/a?x=1'), 'https://example.com/a?x=1');
assert.throws(() => payloadUrl('javascript:alert(1)'), /http/);
assert.equal(payloadWifi('Rede; 5G', 's,enha\\1'), 'WIFI:T:WPA;S:Rede\\; 5G;P:s\\,enha\\\\1;;');
assert.equal(payloadWifi('Aberta', '', 'nopass'), 'WIFI:T:nopass;S:Aberta;;');
assert.equal(payloadWhatsapp('+55 (11) 99999-9999', 'Olá mundo'), 'https://wa.me/5511999999999?text=Ol%C3%A1+mundo');
assert.throws(() => payloadWhatsapp('11999999999'), /E.164/);

const pix = gerarPixEstatico({ chave: '123e4567-e12b-12d1-a456-426655440000', nome: 'João Silva', cidade: 'São Paulo', valor: 12.5 });
assert.ok(pix.startsWith('000201'));
assert.ok(pix.includes('br.gov.bcb.pix'));
assert.ok(pix.includes('540512.50'));
assert.ok(pix.includes('5802BR'));
assert.ok(pix.includes('5910Joao Silva'));
assert.ok(pix.includes('6009Sao Paulo'));
assert.ok(pix.endsWith(crc16Ccitt(pix.slice(0, -4))));
assert.throws(() => gerarPixEstatico({ chave: 'nao-e-chave', nome: 'Nome', cidade: 'Cidade' }), /formato reconhecido/);
const amostraOficial = gerarPixEstatico({ chave: '123e4567-e12b-12d1-a456-426655440000', nome: 'Fulano de Tal', cidade: 'BRASILIA' });
assert.equal(amostraOficial, '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D');

const qr = qrParaRegiao('https://example.com', 82);
assert.ok(qr.modulos > 0);
assert.equal(qr.margem, 4);
assert.ok(qr.moduloMm >= 0.8);
assert.ok(regionArea(qr.regiao) > 0);
const b = regionBounds(qr.regiao);
assert.ok(b.minX >= -qr.larguraTotal / 2 + 4 * qr.moduloMm - 0.001);
assert.ok(b.maxX <= qr.larguraTotal / 2 - 4 * qr.moduloMm + 0.001);
assert.throws(() => qrParaRegiao('https://example.com', 15), /módulos/);

const valores = valoresPadrao(placaQr);
let fonte: Font | undefined;
const contexto = { fonte: () => {
  if (!fonte) {
    const bytes = fs.readFileSync('C:/Windows/Fonts/arialbd.ttf');
    fonte = parseFont(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  }
  return fonte;
} };
const resultado = placaQr.gerar(valores, contexto);
assert.equal(resultado.itens.length, 1);
assert.equal(resultado.itens[0]!.pecas.length, 2);
const [base, codigo] = resultado.itens[0]!.pecas;
assert.ok(base!.camadas[0]!.z1 > 0);
assert.ok(codigo!.camadas[0]!.z1 > codigo!.camadas[0]!.z0);
assert.ok(regionArea(codigo!.camadas[0]!.region) > 0);
assert.deepEqual(resultado.hex, ['#ffffff', '#111111', '#111111']);
for (const peca of resultado.itens[0]!.pecas) {
  for (const camada of peca.camadas) assert.ok(malhaFechada(posicoesDaPeca({ ...peca, camadas: [camada] })), `${peca.nome}: camada fechada`);
}
const testaFechamento = (v: typeof valores, etiqueta: string) => {
  const gerado = placaQr.gerar(v, contexto);
  assert.equal(gerado.itens.length, 1, `${etiqueta}: placa gerada`);
  for (const peca of gerado.itens[0]!.pecas) {
    for (const camada of peca.camadas) assert.ok(malhaFechada(posicoesDaPeca({ ...peca, camadas: [camada] })), `${etiqueta}: ${peca.nome} fechada`);
  }
};
testaFechamento({ ...valores, texto: '' }, 'URL sem texto');
testaFechamento({ ...valores, texto: 'Aponte a câmera' }, 'URL com texto');
testaFechamento({ ...valores, tipoQr: 'pix', chavePix: '123e4567-e12b-12d1-a456-426655440000', nomePix: 'Fulano de Tal', cidadePix: 'BRASILIA', texto: '' }, 'Pix sem texto');
testaFechamento({ ...valores, tipoQr: 'pix', chavePix: '123e4567-e12b-12d1-a456-426655440000', nomePix: 'Fulano de Tal', cidadePix: 'BRASILIA', texto: 'Pague aqui' }, 'Pix com texto');

const modelos = [
  { receita: placaQrWifi, id: 'placa-qr-wifi', padroes: { ssid: 'Minha rede', senhaWifi: '', segurancaWifi: 'WPA' }, payload: { ssid: 'Atelie Formma', senhaWifi: 'ImprimaEm3D', segurancaWifi: 'WPA' }, esperado: 'WIFI:T:WPA;S:Atelie Formma;P:ImprimaEm3D;;' },
  { receita: placaQrWhatsapp, id: 'placa-qr-whatsapp', padroes: { telefone: '+5511999999999', mensagem: '' }, payload: { telefone: '+5511999999999', mensagem: 'Olá!' }, esperado: 'https://wa.me/5511999999999?text=Ol%C3%A1%21' },
  { receita: placaQrTexto, id: 'placa-qr-texto', padroes: { url: 'https://example.com' }, payload: { url: 'https://example.com' }, esperado: 'https://example.com/' },
  { receita: placaPixSimples, id: 'placa-pix-simples', padroes: { chavePix: '', nomePix: '', cidadePix: '', valorPix: 0 }, payload: { chavePix: '123e4567-e12b-12d1-a456-426655440000', nomePix: 'Fulano de Tal', cidadePix: 'BRASILIA' }, esperado: amostraOficial },
];
for (const { receita, id, padroes, payload, esperado } of modelos) {
  assert.equal(receita.id, id);
  assert.equal(receitaPorId(id), receita);
  assert.ok(!receita.parametros.some((p) => p.id === 'tipoQr'), `${id}: sem seletor de conteúdo`);
  assert.ok(FICHAS.some((f) => f.id === id), `${id}: ficha registrada`);
  assert.deepEqual(Object.fromEntries(Object.keys(padroes).map((key) => [key, valoresPadrao(receita)[key]])), padroes, `${id}: defaults`);
  const ficha = FICHAS.find((f) => f.id === id)!;
  const exemplo = receita.gerar({ ...valoresPadrao(receita), ...ficha.exemplo }, contexto);
  assert.equal(exemplo.itens.length, 1, `${id}: exemplo da ficha gera`);
  assert.equal(payloadDaPlacaQr({ ...valoresPadrao(receita), ...payload, tipoQr: ({ 'placa-qr-wifi': 'wifi', 'placa-qr-whatsapp': 'whatsapp', 'placa-qr-texto': 'url', 'placa-pix-simples': 'pix' } as Record<string, string>)[id]! }), esperado, `${id}: payload`);
  const gerado = receita.gerar({ ...valoresPadrao(receita), ...payload }, contexto);
  assert.equal(gerado.itens.length, 1, `${id}: placa gerada`);
  assert.equal(gerado.itens[0]!.pecas.length, 2, `${id}: base e QR`);
}
const wifiSenha = placaQrWifi.parametros.find((p) => p.id === 'senhaWifi')!;
assert.equal(wifiSenha.visivel?.({ ...valoresPadrao(placaQrWifi), segurancaWifi: 'WPA' }), true);
assert.equal(wifiSenha.visivel?.({ ...valoresPadrao(placaQrWifi), segurancaWifi: 'nopass' }), false);
assert.equal(placaQrWifi.gerar(valoresPadrao(placaQrWifi), contexto).itens.length, 0, 'Wi-Fi sem senha nao inventa credencial');
assert.equal(placaPixSimples.gerar(valoresPadrao(placaPixSimples), contexto).itens.length, 0, 'Pix sem chave nao inventa destinatario');
const textoPosicionado = (posicaoTexto: string, alturaTexto: number) => {
  const gerado = placaQrTexto.gerar({ ...valoresPadrao(placaQrTexto), texto: 'QR', posicaoTexto, alturaTexto }, contexto);
  assert.equal(gerado.itens.length, 1, `texto ${posicaoTexto}: placa gerada`);
  const pecas = gerado.itens[0]!.pecas;
  return { qr: regionBounds(pecas.find((p) => p.nome === 'QR Code')!.camadas[0]!.region), texto: regionBounds(pecas.find((p) => p.nome === 'Texto')!.camadas[0]!.region) };
};
const textoAcima = textoPosicionado('acima', 14), textoAbaixo = textoPosicionado('abaixo', 14);
assert.ok(textoAcima.texto.minY > textoAcima.qr.maxY + 2, 'texto acima respeita a zona livre do QR');
assert.ok(textoAbaixo.texto.maxY < textoAbaixo.qr.minY - 2, 'texto abaixo respeita a zona livre do QR');
assert.ok(textoPosicionado('acima', 8).texto.h < textoAcima.texto.h, 'altura do texto configuravel');
for (const receita of [placaQrWifi, placaQrWhatsapp, placaQrTexto]) {
  const exemplo = FICHAS.find((f) => f.id === receita.id)!.exemplo;
  const baseValores = { ...valoresPadrao(receita), ...exemplo };
  const soPlaca = receita.gerar({ ...baseValores, montagem: 'placa' }, contexto);
  const comPes = receita.gerar({ ...baseValores, montagem: 'suporte' }, contexto);
  const comFuro = receita.gerar({ ...baseValores, montagem: 'suporteFuro' }, contexto);
  assert.equal(soPlaca.itens.length, 1, `${receita.id}: so placa`);
  assert.equal(comPes.itens.length, 3, `${receita.id}: placa e dois pes`);
  assert.equal(comFuro.itens.length, 3, `${receita.id}: placa e dois pes furados`);
  const pe = comPes.itens[1]!.pecas[0]!, peFurado = comFuro.itens[1]!.pecas[0]!;
  assert.ok(regionArea(peFurado.camadas[0]!.region) < regionArea(pe.camadas[0]!.region) - 25, `${receita.id}: furo remove material do pe`);
  for (const it of comFuro.itens.slice(1)) for (const peca of it.pecas) assert.ok(malhaFechada(posicoesDaPeca(peca)), `${receita.id}: pe furado fechado`);
  const montado = await lerTresMf(await (await blob3mfMontado(comFuro)).arrayBuffer(), receita.id);
  assert.equal(montado.length, comFuro.itens.length, `${receita.id}: 3MF com placa e pes`);
  const zip = await JSZip.loadAsync(await (await zipStl(comFuro)).arrayBuffer());
  assert.equal(Object.keys(zip.files).filter((f) => f.endsWith('.stl')).length, comFuro.itens.flatMap((it) => it.pecas).length, `${receita.id}: STL de cada peca`);
}
const [montado, soltas, stl] = await Promise.all([blob3mfMontado(resultado), blob3mfSoltas(resultado), zipStl(resultado)]);
assert.ok(montado.size > 0);
assert.ok(soltas.size > 0);
assert.ok(stl.size > 0);
const placaEstreita = placaQr.gerar({ ...valores, larguraPlaca: 50 }, contexto);
assert.equal(placaEstreita.itens.length, 0);
assert.match(placaEstreita.avisos[0]!, /margem livre de quatro módulos/);
const placaBaixa = placaQr.gerar({ ...valores, alturaPlaca: 50 }, contexto);
assert.equal(placaBaixa.itens.length, 0);
assert.match(placaBaixa.avisos[0]!, /altura da placa/);

const qrObrigatorios = [
  { receita: placaGoogleReview, valores: { link: 'javascript:alert(1)' } },
  { receita: placaQrSocial, valores: { rede: 'outra', handle: 'perfil-invalido' } },
  { receita: placaQrLogo, valores: { link: 'javascript:alert(1)', posLogo: 'centro' } },
  { receita: placaPixLogo, valores: { chavePix: 'chave-invalida', nomePix: 'Ana', cidadePix: 'Sao Paulo' } },
  { receita: placaPixTexto, valores: { chavePix: 'chave-invalida', nomePix: 'Ana', cidadePix: 'Sao Paulo' } },
  { receita: socialComQr, valores: { link: 'javascript:alert(1)' } },
  { receita: listaQrVertical, valores: { url1: 'javascript:alert(1)' } },
  { receita: listaQrHorizontal, valores: { url1: 'javascript:alert(1)' } },
  { receita: listaQrCamadas, valores: { url1: 'javascript:alert(1)' } },
  { receita: cartaoVisita, valores: { linkQr: 'javascript:alert(1)' } },
  { receita: cartaoTecido, valores: { linkQr: 'javascript:alert(1)', nfc: false } },
];
for (const { receita, valores: alteracoes } of qrObrigatorios) {
  const gerado = receita.gerar({ ...valoresPadrao(receita), ...alteracoes }, contexto);
  assert.equal(gerado.itens.length, 0, `${receita.id}: QR inválido bloqueia exportação`);
  assert.ok(gerado.avisos.length > 0, `${receita.id}: mostra o motivo`);
}
assert.ok(cartaoTecido.gerar({ ...valoresPadrao(cartaoTecido), linkQr: 'javascript:alert(1)', nfc: true }, contexto).itens.length > 0, 'NFC substitui o QR no cartão de tecido');
const qrCortado = placaGoogleReview.gerar({ ...valoresPadrao(placaGoogleReview), largura: 60, tamQr: 120 }, contexto);
assert.equal(qrCortado.itens.length, 0, 'QR que não cabe na placa bloqueia exportação');
assert.match(qrCortado.avisos.join(' '), /não cabe na placa/);

console.log('QR/PIX: payloads, vetor oficial do Pix, geometria e exportações passaram.');
