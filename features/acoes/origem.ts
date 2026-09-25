'use client';

import { useProjeto } from '@/store/projeto';
import { FONTES_WEB, carregarFonteWeb, carregarFonteArquivo, listarFontesSistema, carregarFonteSistema, type FonteSistema } from '@/lib/text/fontes';
import { importarArquivo, importarPdf, ErroImport } from '@/lib/import/pdf';
import { chaveFonte } from '@/lib/import/texto-em-curvas';

/**
 * Acoes de origem do letreiro: fonte e arquivo importado.
 *
 * Moram fora dos componentes porque sao assincronas e mexem em varios campos de
 * uma vez; um componente so as chama.
 */

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const S = () => useProjeto.getState();

export async function carregarFonteInicial(): Promise<void> {
  try {
    S().definir('fonte', await carregarFonteWeb('anton'));
  } catch (e) {
    S().definir('erro', `Não consegui baixar a fonte inicial (${msg(e)}). Carregue um .ttf do seu computador.`);
  } finally {
    S().definir('carregando', false);
  }
}

export async function trocarFonteWeb(id: string): Promise<void> {
  if (!id) return;
  const s = S();
  s.definir('carregando', true);
  s.definir('erro', null);
  try {
    s.definir('fonte', await carregarFonteWeb(id));
    s.definir('fonteNome', FONTES_WEB.find((f) => f.id === id)?.nome ?? id);
  } catch (e) {
    s.definir('erro', msg(e));
  } finally {
    s.definir('carregando', false);
  }
}

export async function usarFonteArquivo(f: File): Promise<void> {
  try {
    S().definir('fonte', await carregarFonteArquivo(f));
    S().definir('fonteNome', f.name);
    S().definir('erro', null);
  } catch (e) {
    S().definir('erro', `Não consegui ler essa fonte: ${msg(e)}`);
  }
}

export async function listarFontesDoPC(): Promise<void> {
  const r = await listarFontesSistema();
  const s = S();
  s.definir('fontesSistema', r);
  if (!r.suportado) s.definir('erro', 'Este navegador não expõe as fontes do sistema. Use Chrome ou Edge, ou carregue o .ttf.');
  else if (r.erro) s.definir('erro', `Permissão de fontes negada: ${r.erro}`);
  else s.definir('erro', null);
}

export async function usarFonteDoPC(f: FonteSistema): Promise<void> {
  try {
    S().definir('fonte', await carregarFonteSistema(f));
    S().definir('fonteNome', f.nome);
    S().definir('erro', null);
  } catch (e) {
    S().definir('erro', `Essa fonte do sistema não pode ser lida: ${msg(e)}`);
  }
}

export async function abrirDesenho(file: File, pagina = 1): Promise<void> {
  const s = S();
  s.definir('carregando', true);
  s.definir('erro', null);
  try {
    const r = await importarArquivo(file, { modo: 'forma', tracos: 'auto', fundirProximos: 0, areaMinima: 1 }, pagina);
    // Arquivo so com texto vivo nao tem peca ainda, mas tem conserto: a fonte.
    if (!r.pecas.length && !r.desenho.textos?.length) {
      s.definir('erro', r.avisos[0]?.msg ?? 'Não encontrei contornos neste arquivo.');
      return;
    }
    s.receberImport(
      {
        desenho: r.desenho,
        nomeArquivo: file.name,
        paginas: r.paginas,
        pagina: r.pagina,
        avisos: r.avisos,
        conteudoMm: r.conteudoMm,
        buf: await file.arrayBuffer(),
      },
      r.tracos
    );
  } catch (e) {
    s.definir('erro', e instanceof ErroImport ? e.message : `Não consegui abrir este arquivo: ${msg(e)}`);
  } finally {
    s.definir('carregando', false);
  }
}

export async function trocarPagina(n: number): Promise<void> {
  const s = S();
  const imp = s.imp;
  if (!imp) return;
  s.definir('carregando', true);
  try {
    const r = await importarPdf(imp.buf, { modo: s.impModo, tracos: s.impTracos, fundirProximos: s.impFundir, areaMinima: 1 }, n, 'pdf');
    s.definir('imp', { ...imp, desenho: r.desenho, pagina: r.pagina, avisos: r.avisos, conteudoMm: r.conteudoMm });
    s.definir('impAltura', Math.max(1, Math.round(r.conteudoMm.h)));
    s.definir('impDesativadas', new Set());
  } catch (e) {
    s.definir('erro', msg(e));
  } finally {
    s.definir('carregando', false);
  }
}

/**
 * Acha no computador a fonte que o texto vivo do arquivo pede e guarda para
 * desenha-lo. Precisa de clique do usuario: o navegador so libera as fontes
 * instaladas com permissao.
 *
 * Compara pelo nome PostScript (o que o .ai guarda: "HarmonyOS_Sans_SC") e, na
 * falta, pelo nome completo.
 */
export async function buscarFonteDoTexto(nome: string): Promise<boolean> {
  const s = S();
  const r = await listarFontesSistema();
  if (!r.suportado) {
    s.definir('erro', 'Este navegador não dá acesso às fontes do computador. Use Chrome ou Edge, ou carregue o .ttf.');
    return false;
  }
  if (r.erro) {
    s.definir('erro', `Permissão de fontes negada: ${r.erro}`);
    return false;
  }
  const alvo = chaveFonte(nome);
  const f =
    r.fontes.find((x) => chaveFonte(x.id) === alvo) ??
    r.fontes.find((x) => chaveFonte(x.nome) === alvo) ??
    r.fontes.find((x) => chaveFonte(x.familia) === alvo);
  if (!f) {
    s.definir('erro', `Não achei a fonte “${nome}” instalada neste computador. Carregue o .ttf dela.`);
    return false;
  }
  try {
    s.guardarFonteTexto(alvo, await carregarFonteSistema(f));
    s.definir('erro', null);
    return true;
  } catch (e) {
    s.definir('erro', `A fonte “${nome}” não pôde ser lida: ${msg(e)}`);
    return false;
  }
}

/** Mesma coisa, com um .ttf escolhido pelo usuario. */
export async function usarTtfParaTexto(nome: string, arquivo: File): Promise<void> {
  try {
    S().guardarFonteTexto(chaveFonte(nome), await carregarFonteArquivo(arquivo));
    S().definir('erro', null);
  } catch (e) {
    S().definir('erro', `Não consegui ler essa fonte: ${msg(e)}`);
  }
}
