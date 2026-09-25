/**
 * Tira o PostScript do Illustrator de dentro de um arquivo .ai.
 *
 * Um .ai e um PDF que carrega, alem da pagina, o desenho editavel num bloco
 * proprio (`/AIPrivateData`). Quando o arquivo e salvo sem "Criar arquivo
 * compativel com PDF" -- que e como o CorelDRAW exporta -- a pagina sai VAZIA e
 * todo o desenho fica so nesse bloco.
 *
 * A boa noticia: o bloco usa filtros padrao de PDF (`ASCIIHexDecode`,
 * `FlateDecode`), nada proprietario. Descomprimido, e PostScript do Illustrator,
 * que `ai-ps.ts` sabe ler.
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

  const fim = texto.indexOf('endstream', ini);
  if (fim < 0) return null;

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

/**
 * Devolve o PostScript do Illustrator embutido, ou null se o arquivo nao tiver.
 *
 * Os blocos sao numerados (`/AIPrivateData1`, `/AIPrivateData2`, ...) e podem ser
 * partes de um documento so, entao vao concatenados na ordem do numero.
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

  const partes: string[] = [];
  for (const { obj } of refs) {
    const s = lerStream(bytes, texto, obj);
    if (!s) continue;
    try {
      partes.push(txtDe(await decodificar(s)));
    } catch {
      // Um bloco ilegivel nao invalida os outros: o desenho costuma estar
      // inteiro no maior deles.
    }
  }

  const ps = partes.join('\n');
  return ps.includes('%!PS') || /[-\d.]+\s+[-\d.]+\s+m[\r\n]/.test(ps) ? ps : null;
}
