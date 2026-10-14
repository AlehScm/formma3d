import type { Resultado, Valores } from '@/lib/gerador/tipos';

export interface ModeloPronto {
  elementoId: string;
  chave: string;
  receita: string;
  valores: Valores;
  idsFonte: string[];
  tentativa: number;
  resultado: Resultado;
}

export function chaveModeloPronto(receita: string, valores: Valores, idsFonte: string[], tentativa: number): string {
  const valoresOrdenados = Object.keys(valores).sort().map((id) => [id, valores[id]]);
  return JSON.stringify([receita, valoresOrdenados, [...new Set(idsFonte)].sort(), tentativa]);
}

export function validarModelosProntos(modelos: ModeloPronto[]): void {
  const ids = new Set<string>();
  for (const modelo of modelos) {
    if (ids.has(modelo.elementoId)) throw new Error(`Modelo pronto duplicado: ${modelo.elementoId}`);
    ids.add(modelo.elementoId);
    const chave = chaveModeloPronto(modelo.receita, modelo.valores, modelo.idsFonte, modelo.tentativa);
    if (chave !== modelo.chave) throw new Error(`Modelo pronto incompatível: ${modelo.elementoId}`);
  }
}

export function resolverModeloPronto(modelos: ModeloPronto[]) {
  validarModelosProntos(modelos);
  const mapa = new Map(modelos.map((modelo) => [modelo.elementoId, modelo]));
  return (elementoId: string, receita: string, valores: Valores, idsFonte: string[], tentativa: number): Resultado => {
    const modelo = mapa.get(elementoId);
    if (!modelo) throw new Error(`Resultado pronto ausente para o modelo ${elementoId}.`);
    const chave = chaveModeloPronto(receita, valores, idsFonte, tentativa);
    if (modelo.chave !== chave || modelo.receita !== receita) throw new Error(`Resultado pronto desatualizado para o modelo ${elementoId}.`);
    return modelo.resultado;
  };
}
