import type { Desenho, Parametro, Valores } from './tipos';
import { validarRegion } from '@/lib/geom/validacaoRegion';

export type AnaliseDesenho =
  | { estado: 'ausente' }
  | { estado: 'valido'; desenho: Desenho }
  | { estado: 'invalido'; mensagem: string };

export function validarDesenho(valor: unknown): valor is Desenho {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return false;
  const d = valor as { nome?: unknown; regiao?: unknown; cores?: unknown };
  if (typeof d.nome !== 'string' || !validarRegion(d.regiao)) return false;
  if (d.cores === undefined) return true;
  if (!Array.isArray(d.cores)) return false;
  for (const cor of d.cores) {
    if (!cor || typeof cor !== 'object' || Array.isArray(cor) || !validarRegion((cor as { regiao?: unknown }).regiao) ||
      typeof (cor as { hex?: unknown }).hex !== 'string' || !/^#[0-9a-f]{6}$/i.test((cor as { hex: string }).hex)) return false;
  }
  return true;
}

export function analisarDesenho(serializado: unknown): AnaliseDesenho {
  if (serializado === '') return { estado: 'ausente' };
  if (typeof serializado !== 'string') return { estado: 'invalido', mensagem: 'O desenho deve ser um texto JSON.' };
  let dado: unknown;
  try { dado = JSON.parse(serializado); }
  catch { return { estado: 'invalido', mensagem: 'O desenho salvo não contém JSON válido.' }; }
  return validarDesenho(dado)
    ? { estado: 'valido', desenho: dado }
    : { estado: 'invalido', mensagem: 'O desenho salvo tem nome, regiões ou cores inválidas.' };
}

export function validarCamposDesenho(parametros: Parametro[], valores: Valores): { rotulo: string; mensagem: string } | null {
  for (const parametro of parametros) {
    if (parametro.tipo !== 'svg') continue;
    const valor = valores[parametro.id];
    if (typeof valor !== 'string' || !valor) continue;
    const analise = analisarDesenho(valor);
    if (analise.estado === 'invalido') return { rotulo: parametro.rotulo, mensagem: analise.mensagem };
  }
  return null;
}
