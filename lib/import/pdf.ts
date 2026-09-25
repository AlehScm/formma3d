import { opListToDrawing, type Aviso, type DesenhoBruto, type OpsMap } from './pdf-ops';
import {
  desenhoParaPecas,
  resolverTracos,
  OPCOES_PADRAO,
  type OpcoesPecas,
  type PecaImportada,
  type TracoResolvido,
} from './pecas';
import { regionBounds } from '../geom/region';
import { extrairAIPrivateData } from './ai-priv';
import { aiPostScriptParaDesenho } from './ai-ps';

type PdfjsModule = typeof import('pdfjs-dist');

let pdfjsPromise: Promise<PdfjsModule> | null = null;

/**
 * Carrega o pdfjs sob demanda: o bundle inicial nao paga nada por uma funcao que
 * so roda quando o usuario abre um arquivo.
 *
 * O worker e criado com `new Worker(new URL(...))`, que o Turbopack reconhece e
 * emite como asset -- a versao do worker sempre casa com a do main porque vem do
 * mesmo node_modules. Copiar para public/ diverge em silencio quando o postinstall
 * nao roda, e o sintoma ("API version does not match Worker version") e obscuro.
 */
async function getPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import('pdfjs-dist');
      try {
        pdfjs.GlobalWorkerOptions.workerPort = new Worker(
          new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url),
          { type: 'module' }
        );
      } catch {
        // Sem worker o pdf.js roda na thread principal: mais lento, mas funciona.
        await import('pdfjs-dist/build/pdf.worker.min.mjs');
      }
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

// getOperatorList concorrente no mesmo PDFPageProxy corrompe a saida; a fila
// tambem evita interleaving entre dois arquivos abertos em sequencia rapida.
let fila: Promise<unknown> = Promise.resolve();
function enfileirar<T>(fn: () => Promise<T>): Promise<T> {
  const p = fila.then(fn, fn);
  fila = p.then(
    () => undefined,
    () => undefined
  );
  return p;
}

export interface ResultadoImport {
  pecas: PecaImportada[];
  desenho: DesenhoBruto;
  avisos: Aviso[];
  paginas: number;
  pagina: number;
  /** Tamanho da pagina/prancheta. */
  paginaMm: { w: number; h: number };
  /** Tamanho do desenho em si, sem as margens da pagina. E esta a medida util. */
  conteudoMm: { w: number; h: number };
  /** O que foi feito com o traco -- ja resolvido, para o painel poder mostrar. */
  tracos: TracoResolvido;
}

function sniff(buf: ArrayBuffer): 'pdf' | 'postscript' | 'desconhecido' {
  const head = new TextDecoder('latin1').decode(new Uint8Array(buf, 0, Math.min(1024, buf.byteLength)));
  if (head.startsWith('%PDF-')) return 'pdf';
  if (head.startsWith('%!PS')) return 'postscript';
  return head.includes('%PDF-') ? 'pdf' : 'desconhecido';
}

/**
 * O .ai guarda o desenho editavel num bloco proprio (`AIPrivateData`), em formato
 * fechado, e so escreve uma copia em PDF quando "Criar arquivo compativel com PDF"
 * esta marcado. Sem essa opcao o arquivo continua abrindo -- ele e um PDF valido --
 * mas a pagina vem vazia, e e por isso que a deteccao nao pode ser pelo cabecalho.
 *
 * Procurar o marcador e o unico jeito de distinguir "salvo sem compatibilidade" de
 * "desenho realmente vazio", e a diferenca importa: a primeira tem conserto.
 */
function temDadosPrivadosAI(buf: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buf);
  const alvo = 'AIPrivateData';
  const limite = Math.min(bytes.length, 4 * 1024 * 1024); // o marcador fica no inicio
  const primeiro = alvo.charCodeAt(0);
  for (let i = 0; i < limite - alvo.length; i++) {
    if (bytes[i] !== primeiro) continue;
    let bate = true;
    for (let j = 1; j < alvo.length; j++) {
      if (bytes[i + j] !== alvo.charCodeAt(j)) {
        bate = false;
        break;
      }
    }
    if (bate) return true;
  }
  return false;
}

class ErroImport extends Error {}

/** Le a operator list de uma pagina e devolve o desenho bruto, em mm. */
export async function lerDesenho(buf: ArrayBuffer, pagina = 1): Promise<{ desenho: DesenhoBruto; paginas: number }> {
  const tipo = sniff(buf);
  if (tipo === 'postscript') {
    throw new ErroImport(
      'Este arquivo e PostScript/EPS, ou um .ai antigo (Illustrator 8 ou anterior). ' +
        'Abra no Illustrator e salve de novo marcando "Criar arquivo compatível com PDF", ou exporte como PDF.'
    );
  }
  if (tipo === 'desconhecido') {
    throw new ErroImport('Não reconheci este arquivo como .ai ou .pdf.');
  }

  const pdfjs = await getPdfjs();

  return enfileirar(async () => {
    // Nao passamos isEvalSupported: a opcao deixou de existir na 6.x, porque o
    // pdf.js removeu o uso de eval de vez (a mitigacao do CVE-2024-4367 ja e o padrao).
    const task = pdfjs.getDocument({
      data: new Uint8Array(buf.slice(0)),
      disableFontFace: true,
      useSystemFonts: false,
      stopAtErrors: false,
    });
    try {
      const doc = await task.promise;
      const paginas = doc.numPages;
      const page = await doc.getPage(Math.min(Math.max(1, pagina), paginas));

      let nomeCamada: ((id: string) => string | null) | undefined;
      let camadaVisivel: ((id: string) => boolean) | undefined;
      try {
        // getOperatorList emite tambem os operadores de camadas ocultas: sem isto,
        // a camada de guias que o designer escondeu viraria peca.
        const occ = await doc.getOptionalContentConfig();
        if (occ) {
          nomeCamada = (id) => occ.getGroup(id)?.name ?? null;
          camadaVisivel = (id) => {
            try {
              return occ.isVisible({ type: 'OCG', id }) !== false;
            } catch {
              return true;
            }
          };
        }
      } catch {
        /* sem camadas: tudo visivel */
      }

      const opList = await page.getOperatorList();
      const view = page.view as [number, number, number, number];
      const desenho = opListToDrawing(opList, pdfjs.OPS as unknown as OpsMap, {
        view,
        rotate: page.rotate,
        nomeCamada,
        camadaVisivel,
      });
      page.cleanup();
      return { desenho, paginas };
    } finally {
      await task.destroy();
    }
  });
}

/**
 * Um .ai salvo sem compatibilidade PDF AINDA comeca com %PDF- e abre normalmente:
 * o que falta e o conteudo de pagina, que vira um placeholder de texto. Por isso a
 * deteccao e a posteriori (nenhum contorno + texto vivo), nao pelo cabecalho.
 */
function diagnosticar(d: DesenhoBruto, ext: string, dadosPrivadosAI: boolean): Aviso[] {
  const avisos: Aviso[] = [...d.avisos];
  if (d.objetos.length) return avisos;

  // O marcador decide sozinho: ha desenho no arquivo, so nao em formato que se leia.
  // Nao exigir texto vivo junto -- um .ai sem compatibilidade PDF costuma vir com a
  // pagina totalmente vazia, sem nem texto.
  // So chega aqui quando nem a pagina nem o PostScript embutido renderam nada --
  // o caminho do AIPrivateData ja foi tentado antes.
  if (dadosPrivadosAI) {
    avisos.push({
      codigo: 'ai-sem-pdf',
      msg:
        'Este .ai foi salvo sem compatibilidade PDF e também não consegui ler o desenho guardado dentro dele. ' +
        'Peça para reenviarem assim: no Illustrator ou no Corel, Salvar como > PDF. ' +
        'Se for .ai mesmo, marque "Criar arquivo compatível com PDF" ao salvar.',
    });
  } else if (ext === 'ai' && d.temTextoVivo) {
    avisos.push({
      codigo: 'ai-sem-pdf',
      msg:
        'Este .ai não tem contornos legíveis, só texto vivo. Selecione tudo e use Texto > Criar contornos ' +
        '(Ctrl+Shift+O) antes de salvar.',
    });
  } else if (d.temTextoVivo) {
    avisos.push({
      codigo: 'texto-vivo',
      msg:
        'Não encontrei contornos, só texto vivo. Selecione tudo e use Texto > Criar contornos (Ctrl+Shift+O) ' +
        'antes de salvar.',
    });
  } else if (d.temImagem) {
    avisos.push({
      codigo: 'imagem',
      msg: 'Este arquivo só tem imagem (bitmap), não vetor. Envie o arquivo vetorial original.',
    });
  } else {
    avisos.push({ codigo: 'sem-contorno', msg: 'Não encontrei nenhum contorno vetorial neste arquivo.' });
  }
  return avisos;
}

export async function importarPdf(
  buf: ArrayBuffer,
  opcoes: OpcoesPecas = OPCOES_PADRAO,
  pagina = 1,
  ext = 'pdf'
): Promise<ResultadoImport> {
  let desenho: DesenhoBruto;
  let paginas: number;
  try {
    ({ desenho, paginas } = await lerDesenho(buf, pagina));
  } catch (e) {
    if (e instanceof ErroImport) throw e;
    const nome = (e as { name?: string })?.name ?? '';
    if (nome === 'PasswordException') {
      throw new ErroImport('Este PDF esta protegido por senha. Remova a protecao e tente de novo.');
    }
    if (nome === 'InvalidPDFException') {
      throw new ErroImport('Arquivo corrompido ou invalido.');
    }
    throw new ErroImport('Não consegui ler o arquivo: ' + (e instanceof Error ? e.message : String(e)));
  }

  // A pagina do PDF e sempre o caminho primario: quando tem conteudo, e a fonte
  // mais confiavel. So quando ela nao rende nada vale a pena ir atras do
  // PostScript embutido -- que e o caso do .ai exportado pelo CorelDRAW, onde a
  // pagina sai vazia de proposito.
  let veioDoPostScript = false;
  if (!desenho.objetos.length) {
    try {
      const ps = await extrairAIPrivateData(buf);
      if (ps) {
        const alternativo = aiPostScriptParaDesenho(ps);
        if (alternativo.objetos.length) {
          desenho = alternativo;
          veioDoPostScript = true;
        }
      }
    } catch {
      // Se nao der, segue para o diagnostico normal, que explica o que fazer.
    }
  }

  const avisos = veioDoPostScript
    ? [...desenho.avisos]
    : diagnosticar(desenho, ext, temDadosPrivadosAI(buf));
  const tracos = resolverTracos(desenho, opcoes.tracos);
  const pecas = desenhoParaPecas(desenho, opcoes);

  // Um arquivo que e "so o contorno da peca" nao tem preenchimento onde importa, e
  // o usuario nao tem como saber que o app teve de escolher por ele.
  if (tracos === 'preencher' && desenho.objetos.some((o) => o.paint === 'stroke')) {
    const n = desenho.objetos.filter((o) => o.paint === 'stroke').length;
    avisos.push({
      codigo: 'traco-preenchido',
      msg:
        `${n} forma(s) deste arquivo são só contorno, sem preenchimento. Preenchi a área que elas cercam, ` +
        'porque é o que "só o contorno da peça" quer dizer. Se era linha de corte ou guia, troque em "Traço sem preenchimento".',
    });
  }

  if (paginas > 1) {
    avisos.push({
      codigo: 'multipagina',
      msg: `O arquivo tem ${paginas} páginas/pranchetas. Importei a página ${pagina}.`,
    });
  }
  const maior = Math.max(desenho.paginaMm.w, desenho.paginaMm.h);
  if (pecas.length && (maior > 5000 || maior < 1)) {
    avisos.push({
      codigo: 'tamanho-suspeito',
      msg: `O desenho mede ${desenho.paginaMm.w.toFixed(0)} x ${desenho.paginaMm.h.toFixed(0)} mm. Confira a unidade e ajuste a altura.`,
    });
  }

  const bc = regionBounds(pecas.flatMap((p) => p.region));
  return {
    pecas,
    desenho,
    avisos,
    paginas,
    pagina,
    paginaMm: desenho.paginaMm,
    conteudoMm: { w: bc.w, h: bc.h },
    tracos,
  };
}

const EXTS = ['ai', 'pdf'];

export async function importarArquivo(file: File, opcoes: OpcoesPecas = OPCOES_PADRAO, pagina = 1): Promise<ResultadoImport> {
  const ext = (file.name.split('.').pop() ?? '').toLowerCase();
  const buf = await file.arrayBuffer();
  // Despacha tambem por conteudo: .ai renomeado para .pdf (e vice-versa) e comum.
  if (!EXTS.includes(ext) && sniff(buf) !== 'pdf') {
    throw new ErroImport(`Formato .${ext} não suportado. Use .ai ou .pdf.`);
  }
  return importarPdf(buf, opcoes, pagina, ext);
}

export { ErroImport };
