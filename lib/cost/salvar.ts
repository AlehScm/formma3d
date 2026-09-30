import { PADRAO, type CustoCfg } from './calc';

/**
 * O que vai para o navegador sao SO os campos que o usuario mudou. Salvar a
 * configuracao inteira congelava os padroes da epoca: mudar o padrao do preco do
 * rolo (110 -> 100) nao chegava a quem ja tinha aberto o app.
 */
export const VERSAO_SALVA = 2;

/** Padroes que ja existiram. Valor salvo igual a um deles nao foi escolha do usuario. */
const PADROES_ANTIGOS: Partial<Record<keyof CustoCfg, unknown[]>> = {
  precoRolo: [110],
  valorHora: [30],
  setupMin: [10],
  posMin: [5],
  taxaFalha: [8],
};

const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Campos diferentes do padrao atual: e so isso que se guarda. */
export function diferencas(cfg: CustoCfg): Partial<CustoCfg> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(cfg) as (keyof CustoCfg)[]) if (!igual(cfg[k], PADRAO[k])) out[k] = cfg[k];
  return out as Partial<CustoCfg>;
}

export const paraSalvar = (cfg: CustoCfg) => ({ versao: VERSAO_SALVA, cfg: diferencas(cfg) });

/**
 * O que foi salvo -> o que aplicar por cima do padrao. Le o formato novo e o antigo
 * (configuracao inteira): no antigo, campo igual a um padrao passado volta a seguir
 * o padrao; o resto (o que o usuario personalizou) fica.
 */
export function lerSalvo(salvo: unknown): Partial<CustoCfg> {
  if (!salvo || typeof salvo !== 'object') return {};
  const s = salvo as { versao?: number; cfg?: unknown };
  const novo = s.versao === VERSAO_SALVA && s.cfg && typeof s.cfg === 'object';
  const bruto = { ...((novo ? s.cfg : salvo) as Record<string, unknown>) };
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(PADRAO) as (keyof CustoCfg)[]) {
    if (!(k in bruto)) continue;
    const v = bruto[k];
    if (!novo && (igual(v, PADRAO[k]) || PADROES_ANTIGOS[k]?.some((x) => igual(x, v)))) continue;
    out[k] = v;
  }
  // Formato antigo das amostras (so a contagem): recomeca o aprendizado.
  if ('amostras' in out && !Array.isArray(out.amostras)) {
    delete out.amostras;
    delete out.vazao;
    delete out.fatorGramas;
  }
  if ('socios' in out && (!Array.isArray(out.socios) || !(out.socios as unknown[]).length)) delete out.socios;
  return out as Partial<CustoCfg>;
}
