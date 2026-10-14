/**
 * Personalizar na pagina do produto: quais campos do gerador aparecem (os principais:
 * texto, fonte, cores e uma medida) e o resumo legivel da configuracao, que vai para o
 * orcamento e para a mensagem. O resto das opcoes continua no gerador completo.
 */
import { prepararModelo } from '@/lib/gerador/exemplo';
import { hrefComSnapshotModelo } from '@/lib/gerador/handoff';
import { FONTES_WEB } from '@/lib/text/fontes';
import type { Parametro, Valores } from '@/lib/gerador/tipos';

const LIMITE = { texto: 2, fonte: 1, cor: 4, numero: 1 } as const;
/** Medidas que fazem sentido para quem compra (o resto e ajuste tecnico). */
const MEDIDA = /^(altura|largura|tamanho|diametro|lado|comprimento)$/;

export function camposPrincipais(id: string, valores: Valores): Parametro[] {
  const { receita } = prepararModelo(id, { base: 'exemplo' });
  const contagem = { texto: 0, fonte: 0, cor: 0, numero: 0 };
  return receita.parametros.filter((p) => {
    if (p.visivel && !p.visivel(valores)) return false;
    if (p.tipo === 'numero' && !(p.unidade === 'mm' && MEDIDA.test(p.id))) return false;
    if (p.tipo !== 'texto' && p.tipo !== 'fonte' && p.tipo !== 'cor' && p.tipo !== 'numero') return false;
    if (contagem[p.tipo] >= LIMITE[p.tipo]) return false;
    contagem[p.tipo]++;
    return true;
  });
}

/** Valores iniciais do produto: o exemplo da ficha do gerador. */
export const valoresIniciais = (id: string, extras?: Valores): Valores => prepararModelo(id, { base: 'exemplo', extras }).valores;

export function hrefParaEditor(id: string, href: string, valores: Valores, basePath = ''): string {
  const { receita } = prepararModelo(id, { base: 'padrao' });
  return hrefComSnapshotModelo(href, { versao: 1, receita: id, valores }, basePath, receita);
}

const legivel = (p: Parametro, v: Valores[string]): string => {
  if (p.tipo === 'fonte') return FONTES_WEB.find((f) => f.id === v)?.nome ?? String(v);
  if (p.tipo === 'cor') return String(v).toUpperCase();
  if (p.tipo === 'numero') return `${v}${p.unidade ? ` ${p.unidade}` : ''}`;
  return String(v).trim();
};

/** "Nomes: Ana; Fonte: Lobster; Base: #F5F5F4" -- so os campos mostrados, na ordem do gerador. */
export function resumoPersonalizacao(campos: Parametro[], valores: Valores): string {
  return campos.map((p) => `${p.rotulo}: ${legivel(p, valores[p.id] ?? p.padrao)}`).filter((t) => !t.endsWith(': ')).join('; ');
}
