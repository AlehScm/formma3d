/**
 * Tira o PostScript do Illustrator de dentro de um arquivo .ai.
 *
 * Um .ai e um PDF que carrega, alem da pagina, o desenho editavel num bloco
 * proprio (`/AIPrivateData`). Quando o arquivo e salvo sem "Criar arquivo
 * compativel com PDF" -- que e como o CorelDRAW exporta -- a pagina sai VAZIA e
 * todo o desenho fica so nesse bloco.
 *
 * A boa noticia: nada e proprietario. Sao duas convencoes, e as duas usam
 * compressao padrao:
 *
 *  - CorelDRAW: cada bloco e um stream de PDF normal, com
 *    `/Filter [/ASCIIHexDecode /FlateDecode]`. Decodifica bloco a bloco e
 *    concatena depois.
 *  - Illustrator CS2 e mais novos: os blocos NAO tem filtro de PDF. Sao fatias de
 *    um unico fluxo comprimido, e o primeiro comeca com o marcador
 *    `%AI12_CompressedData`. Aqui e o contrario: concatena primeiro, descarta o
 *    marcador e descomprime UMA vez. Tentar bloco a bloco falha, porque o corte
 *    cai no meio do fluxo.
 *
 * Descomprimido, e PostScript do Illustrator, que `ai-ps.ts` sabe ler.
 */

/** Um objeto de stream do PDF, ja localizado no arquivo. */
interface StreamPdf {
  filtros: string[];
  dados: Uint8Array;
}

const txtDe = (b: Uint8Array, ini = 0, fim = b.length) => new TextDecoder('latin1').decode(b.subarray(ini, fim));

/** Acha `<num> 0 obj`, le o dicionario e devolve os bytes crus do stream. */
function lerStream(bytes: Uint8Array, texto: string, num: number): StreamPdf | null {
  const marca = new RegExp(`(?:^|[^0-9])${num}\\s+0\\s+obj`, 'g');
  const m = marca.exec(texto);
  if (!m) return null;

  const inicioObj = m.index + m[0].length;
  const iStream = texto.indexOf('stream', inicioObj);
  if (iStream < 0) return null;

  const dic = texto.slice(inicioObj, iStream);
  const filtros = [...dic.matchAll(/\/([A-Za-z0-9]+Decode)/g)].map((x) => x[1]!);

  // Depois de `stream` vem CRLF ou LF antes dos dados.
  let ini = iStream + 'stream'.length;
  if (texto[ini] === '\r') ini++;
  if (texto[ini] === '\n') ini++;

  // `/Length` e a fonte autoritativa do tamanho: os dados sao binarios e podem
  // conter qualquer byte. Procurar `endstream` engole o fim de linha que o PDF poe
  // antes dele, e um byte extra no meio de um fluxo deflate corrompe tudo.
  const len = dic.match(/\/Length\s+(\d+)(?!\s+\d+\s+R)/);
  if (len) {
    const n = parseInt(len[1]!, 10);
    if (ini + n <= bytes.length) return { filtros, dados: bytes.subarray(ini, ini + n) };
  }

  let fim = texto.indexOf('endstream', ini);
  if (fim < 0) return null;
  // Sem /Length utilizavel: descarta o fim de linha que precede `endstream`.
  if (texto[fim - 1] === '\n') fim--;
  if (texto[fim - 1] === '\r') fim--;

  return { filtros, dados: bytes.subarray(ini, fim) };
}

function desfazerHex(dados: Uint8Array): Uint8Array {
  const txt = txtDe(dados);
  const ate = txt.indexOf('>'); // '>' encerra o fluxo hex
  const limpo = (ate >= 0 ? txt.slice(0, ate) : txt).replace(/[^0-9A-Fa-f]/g, '');
  const n = limpo.length - (limpo.length % 2);
  const saida = new Uint8Array(n / 2);
  for (let i = 0; i < n; i += 2) saida[i / 2] = parseInt(limpo.substring(i, i + 2), 16);
  return saida;
}

/**
 * Descomprime deflate/zlib com a API nativa do navegador -- nenhuma biblioteca.
 * O stream do PDF vem em zlib (magic 78 xx); se vier deflate cru, tenta de novo.
 */
async function inflar(dados: Uint8Array): Promise<Uint8Array> {
  const tentar = async (formato: 'deflate' | 'deflate-raw'): Promise<Uint8Array> => {
    const ds = new DecompressionStream(formato);
    const buf = await new Response(new Blob([dados as BlobPart]).stream().pipeThrough(ds)).arrayBuffer();
    return new Uint8Array(buf);
  };
  try {
    return await tentar('deflate');
  } catch {
    return await tentar('deflate-raw');
  }
}

async function decodificar(s: StreamPdf): Promise<Uint8Array> {
  let dados = s.dados;
  for (const f of s.filtros) {
    if (f === 'ASCIIHexDecode') dados = desfazerHex(dados);
    else if (f === 'FlateDecode') dados = await inflar(dados);
    // ASCII85Decode nao aparece em AIPrivateData na pratica; se aparecer, o
    // bloco e ignorado la em cima por nao virar PostScript reconhecivel.
  }
  return dados;
}

function juntar(partes: Uint8Array[]): Uint8Array {
  const total = partes.reduce((a, p) => a + p.length, 0);
  const saida = new Uint8Array(total);
  let i = 0;
  for (const p of partes) {
    saida.set(p, i);
    i += p.length;
  }
  return saida;
}

const ePostScript = (s: string) => s.includes('%!PS') || /[-\d.]+\s+[-\d.]+\s+m[\r\n]/.test(s);

/**
 * Devolve o PostScript do Illustrator embutido, ou null se o arquivo nao tiver.
 *
 * Os blocos sao numerados (`/AIPrivateData1`, `/AIPrivateData2`, ...) e sao fatias
 * de um documento so. A ordem e pelo NUMERO, nao pela ordem no arquivo nem
 * alfabetica: em texto `AIPrivateData10` vem antes de `AIPrivateData2`, e um
 * arquivo grande passa de 9 blocos.
 */
export async function extrairAIPrivateData(buf: ArrayBuffer): Promise<string | null> {
  const bytes = new Uint8Array(buf);
  const texto = txtDe(bytes);
  if (!texto.includes('AIPrivateData')) return null;

  // `/AIPrivateData2 8 0 R` -> bloco 2 mora no objeto 8
  const refs = [...texto.matchAll(/\/AIPrivateData(\d*)\s+(\d+)\s+0\s+R/g)]
    .map((m) => ({ ordem: m[1] ? parseInt(m[1], 10) : 0, obj: parseInt(m[2]!, 10) }))
    .sort((a, b) => a.ordem - b.ordem);
  if (!refs.length) return null;

  const partes: Uint8Array[] = [];
  for (const { obj } of refs) {
    const s = lerStream(bytes, texto, obj);
    if (!s) continue;
    try {
      partes.push(await decodificar(s));
    } catch {
      // Um bloco ilegivel nao invalida os outros: no arquivo do CorelDRAW o
      // desenho vem inteiro no maior deles.
    }
  }
  if (!partes.length) return null;

  const juntos = juntar(partes);
  const cabeca = txtDe(juntos, 0, Math.min(64, juntos.length));

  // Illustrator CS2+: fluxo unico comprimido, com marcador na frente.
  const comp = cabeca.match(/^%AI\d+_(CompressedData|ZStandard_Data)/);
  if (comp) {
    // Zstandard (Illustrator mais recente) nao tem suporte em DecompressionStream.
    // Devolver null cai no aviso que pede para salvar como PDF, que e o conserto
    // certo para esse caso.
    if (comp[1] === 'ZStandard_Data') return null;
    try {
      const ps = txtDe(await inflar(juntos.subarray(comp[0].length)));
      return ePostScript(ps) ? ps : null;
    } catch {
      return null;
    }
  }

  const ps = txtDe(juntos);
  return ePostScript(ps) ? ps : null;
}
