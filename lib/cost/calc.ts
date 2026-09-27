export interface Filamento {
  nome: string;
  /** g/cm3: converte volume em gramas. */
  densidade: number;
  /** g/h que a impressora entrega de verdade neste material. */
  vazao: number;
}

export const FILAMENTOS = {
  PLA: { nome: 'PLA', densidade: 1.24, vazao: 12 },
  'PLA+': { nome: 'PLA+', densidade: 1.24, vazao: 11 },
  PETG: { nome: 'PETG', densidade: 1.27, vazao: 10 },
  ABS: { nome: 'ABS', densidade: 1.04, vazao: 10 },
  ASA: { nome: 'ASA', densidade: 1.07, vazao: 10 },
  TPU: { nome: 'TPU', densidade: 1.21, vazao: 6 },
} as const satisfies Record<string, Filamento>;

export type FilamentoId = keyof typeof FILAMENTOS;

export interface CustoCfg {
  filamento: FilamentoId;
  /** R$ por rolo. */
  precoRolo: number;
  /** g por rolo. */
  rendimento: number;
  /** g/h efetivos. Aprendido dos trabalhos reais (gramas e tempo do fatiador). */
  vazao: number;
  /** Gramas reais / gramas estimadas pelo volume (paredes, preenchimento, suporte). */
  fatorGramas: number;
  /** Placas reais que ensinaram a estimativa (as ultimas 10, uma por placa). */
  amostras: Amostra[];
  /** R$/h de depreciacao + manutencao. */
  custoMaquina: number;
  potencia: number;
  precoKwh: number;
  valorHora: number;
  setupMin: number;
  posMin: number;
  /** % de jobs perdidos. */
  taxaFalha: number;
  /** % sobre o custo. */
  margem: number;
  precoAcmM2: number;
  precoFitaLedM: number;
}

export const PADRAO: CustoCfg = {
  filamento: 'PLA',
  precoRolo: 100,
  rendimento: 1000,
  vazao: 12,
  fatorGramas: 1,
  amostras: [],
  custoMaquina: 2.5,
  potencia: 120,
  precoKwh: 0.95,
  valorHora: 0,
  setupMin: 0,
  posMin: 0,
  taxaFalha: 3,
  margem: 120,
  precoAcmM2: 90,
  precoFitaLedM: 18,
};

/** Gramas pelo volume da peca, corrigidas pelo que os trabalhos reais mostraram. */
export function gramasEstimadas(volumeMm3: number, cfg: CustoCfg = PADRAO): number {
  const fil: Filamento = FILAMENTOS[cfg.filamento] ?? FILAMENTOS.PLA;
  return (volumeMm3 / 1000) * fil.densidade * (cfg.fatorGramas || 1);
}

export interface Amostra {
  /** Identifica a placa: redigitar a mesma placa troca a amostra, nao soma outra. */
  id: string;
  gramas: number;
  horas: number;
  /** Gramas pelo volume, sem fator: o que o fatiador corrige. */
  bruto: number;
}

/**
 * Aprende com uma placa real: a vazao (g/h) e quanto o fatiador gasta a mais ou a
 * menos que o volume. Ponderado pelas ultimas 10 placas, para um trabalho fora da
 * curva nao estragar a estimativa dos proximos.
 */
export function calibrar(cfg: CustoCfg, id: string, real: { gramas: number; horas: number }, volumeMm3: number): CustoCfg {
  if (!(real.gramas > 0) || !(real.horas > 0) || !(volumeMm3 > 0)) return cfg;
  const fil: Filamento = FILAMENTOS[cfg.filamento] ?? FILAMENTOS.PLA;
  const bruto = (volumeMm3 / 1000) * fil.densidade;
  const amostras = [...cfg.amostras.filter((a) => a.id !== id), { id, gramas: real.gramas, horas: real.horas, bruto }].slice(-10);
  const soma = (f: (a: Amostra) => number) => amostras.reduce((t, a) => t + f(a), 0);
  return { ...cfg, amostras, vazao: soma((a) => a.gramas) / soma((a) => a.horas), fatorGramas: soma((a) => a.gramas) / soma((a) => a.bruto) };
}

/** Volta a estimativa para o padrao, sem mexer nos precos. */
export const esquecerCalibracao = (cfg: CustoCfg): CustoCfg => ({ ...cfg, vazao: PADRAO.vazao, fatorGramas: 1, amostras: [] });

export const brl = (v: number): string => 'R$ ' + v.toFixed(2).replace('.', ',');

export interface ItemCusto {
  rotulo: string;
  valor: number;
  detalhe: string;
}

export interface Orcamento {
  gramas: number;
  cm3: number;
  horas: number;
  rolos: number;
  itens: ItemCusto[];
  custo: number;
  lucro: number;
  preco: number;
}

export interface OrcarArgs {
  volumeMm3: number;
  areaChapaMm2?: number;
  perimetroLedMm?: number;
  qtdLetras?: number;
  /** Quantas vezes a maquina e preparada: uma por placa. 0 = so a parte da peca. */
  impressoes?: number;
  /** Do fatiador ou da impressao de verdade: substituem a estimativa pelo volume. */
  gramasReais?: number;
  horasReais?: number;
  cfg?: CustoCfg;
}

/**
 * Orcamento do job a partir do volume impresso e da area de chapa.
 * Separa CUSTO de PRECO: a taxa de falha entra no custo (voce paga pelos jobs
 * perdidos) e a margem so no final, para o preco continuar legivel na negociacao.
 */
export function orcar({
  volumeMm3,
  areaChapaMm2 = 0,
  perimetroLedMm = 0,
  qtdLetras = 1,
  impressoes = 1,
  gramasReais,
  horasReais,
  cfg = PADRAO,
}: OrcarArgs): Orcamento {
  const fil: Filamento = FILAMENTOS[cfg.filamento] ?? FILAMENTOS.PLA;
  const cm3 = volumeMm3 / 1000;
  const gramas = gramasReais ?? gramasEstimadas(volumeMm3, cfg);
  const horas = horasReais ?? gramas / Math.max(0.1, cfg.vazao || fil.vazao);

  const material = gramas * (cfg.precoRolo / cfg.rendimento);
  const maquina = horas * cfg.custoMaquina;
  const energia = horas * (cfg.potencia / 1000) * cfg.precoKwh;
  const minutos = cfg.setupMin * impressoes + cfg.posMin * qtdLetras;
  const maoDeObra = (minutos / 60) * cfg.valorHora;
  const chapa = (areaChapaMm2 / 1e6) * cfg.precoAcmM2;
  const led = (perimetroLedMm / 1000) * cfg.precoFitaLedM;

  const direto = material + maquina + energia + maoDeObra + chapa + led;
  const falha = direto * (1 / (1 - Math.min(0.9, cfg.taxaFalha / 100)) - 1);
  const custo = direto + falha;
  const preco = custo * (1 + cfg.margem / 100);

  const itens: ItemCusto[] = [
    { rotulo: 'Filamento', valor: material, detalhe: `${gramas.toFixed(0)} g` },
    { rotulo: 'Máquina', valor: maquina, detalhe: `${horas.toFixed(1)} h` },
    { rotulo: 'Energia', valor: energia, detalhe: `${((horas * cfg.potencia) / 1000).toFixed(2)} kWh` },
  ];
  // Sem mao de obra configurada (o padrao), a linha so faria ruido com R$ 0,00.
  if (maoDeObra > 0) {
    itens.push({ rotulo: 'Mão de obra', valor: maoDeObra, detalhe: `${minutos} min${impressoes > 1 ? ` (${impressoes} preparos)` : ''}` });
  }
  if (chapa > 0) itens.push({ rotulo: 'Chapa ACM', valor: chapa, detalhe: `${(areaChapaMm2 / 1e6).toFixed(3)} m2` });
  if (led > 0) itens.push({ rotulo: 'Fita LED', valor: led, detalhe: `${(perimetroLedMm / 1000).toFixed(2)} m` });
  itens.push({ rotulo: `Perdas (${cfg.taxaFalha}%)`, valor: falha, detalhe: 'trabalhos refeitos' });

  return { gramas, cm3, horas, rolos: gramas / cfg.rendimento, itens, custo, lucro: preco - custo, preco };
}

/** O que uma peca consome: e daqui que sai o custo dela. */
export interface Insumos {
  volumeMm3: number;
  areaChapaMm2: number;
  perimetroLedMm: number;
}

export const somarInsumos = (lista: Insumos[]): Insumos =>
  lista.reduce(
    (a, x) => ({
      volumeMm3: a.volumeMm3 + x.volumeMm3,
      areaChapaMm2: a.areaChapaMm2 + x.areaChapaMm2,
      perimetroLedMm: a.perimetroLedMm + x.perimetroLedMm,
    }),
    { volumeMm3: 0, areaChapaMm2: 0, perimetroLedMm: 0 }
  );
