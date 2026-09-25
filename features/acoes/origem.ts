'use client';

import { useProjeto } from '@/store/projeto';
import { FONTES_WEB, carregarFonteWeb, carregarFonteArquivo, listarFontesSistema, carregarFonteSistema, type FonteSistema } from '@/lib/text/fontes';
import { importarArquivo, importarPdf, ErroImport } from '@/lib/import/pdf';

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
    if (!r.pecas.length) {
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
