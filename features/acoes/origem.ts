'use client';

import { useProjeto } from '@/store/projeto';
import { FONTES_WEB, carregarFonteWeb, carregarFonteArquivo, listarFontesSistema, carregarFonteSistema, type FonteSistema } from '@/lib/text/fontes';
import { importarArquivo, importarPdf, ErroImport } from '@/lib/import/pdf';
import { chaveFonte } from '@/lib/import/texto-em-curvas';
import { lerStl } from '@/lib/import/stl';
import { useInterface } from '@/store/interface';

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

/**
 * Abre um arquivo. .ai/.pdf viram pecas do letreiro; .stl vira objeto pronto na
 * placa. `substituir` (Abrir desenho) troca os arquivos do letreiro; sem ele
 * (Adicionar arquivo) o novo entra ao lado dos que ja estao.
 */
export async function abrirArquivo(file: File, substituir: boolean): Promise<void> {
  const s = S();
  s.definir('carregando', true);
  s.definir('erro', null);
  try {
    if (/\.stl$/i.test(file.name)) {
      const m = lerStl(await file.arrayBuffer());
      s.adicionarObjeto3d({ nome: file.name.replace(/\.stl$/i, ''), posicoes: m.posicoes, alturaZ: m.max[2] });
      // O STL so existe na placa: mostra la, senao ele "some" depois de importado.
      useInterface.getState().setEspaco('imprimir');
      return;
    }
    const r = await importarArquivo(file, { modo: 'forma', tracos: 'auto', fundirProximos: 0, areaMinima: 1 }, 1);
    // Arquivo so com texto vivo nao tem peca ainda, mas tem conserto: a fonte.
    if (!r.pecas.length && !r.desenho.textos?.length) {
      s.definir('erro', r.avisos[0]?.msg ?? 'Não encontrei contornos neste arquivo.');
      return;
    }
    s.adicionarArquivo(
      {
        desenho: r.desenho,
        nomeArquivo: file.name,
        paginas: r.paginas,
        pagina: r.pagina,
        avisos: r.avisos,
        conteudoMm: r.conteudoMm,
        buf: await file.arrayBuffer(),
      },
      r.tracos,
      substituir
    );
  } catch (e) {
    s.definir('erro', e instanceof ErroImport ? e.message : `Não consegui abrir “${file.name}”: ${msg(e)}`);
  } finally {
    s.definir('carregando', false);
  }
}

export async function trocarPagina(id: string, n: number): Promise<void> {
  const s = S();
  const a = s.arquivos.find((x) => x.id === id);
  if (!a) return;
  s.definir('carregando', true);
  try {
    const r = await importarPdf(a.buf, { modo: a.modo, tracos: a.tracos, fundirProximos: a.fundir, areaMinima: 1 }, n, 'pdf');
    s.ajustarArquivo(id, {
      desenho: r.desenho,
      pagina: r.pagina,
      avisos: r.avisos,
      conteudoMm: r.conteudoMm,
      altura: Math.max(1, Math.round(r.conteudoMm.h)),
      desativadas: new Set(),
    });
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
