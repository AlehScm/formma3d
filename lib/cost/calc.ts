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
  /** g/h efetivos: calibre com um job real. */
  vazao: number;
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
  precoRolo: 110,
  rendimento: 1000,
  vazao: 12,
  custoMaquina: 2.5,
  potencia: 120,
  precoKwh: 0.95,
  valorHora: 30,
  setupMin: 10,
  posMin: 5,
  taxaFalha: 8,
  margem: 120,
  precoAcmM2: 90,
  precoFitaLedM: 18,
};

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
  cfg?: CustoCfg;
}

/**
 * Orcamento do job a partir do volume impresso e da area de chapa.
 * Separa CUSTO de PRECO: a taxa de falha entra no custo (voce paga pelos jobs
 * perdidos) e a margem so no final, para o preco continuar legivel na negociacao.
 */
export function orcar({ volumeMm3, areaChapaMm2 = 0, perimetroLedMm = 0, qtdLetras = 1, cfg = PADRAO }: OrcarArgs): Orcamento {
  const fil: Filamento = FILAMENTOS[cfg.filamento] ?? FILAMENTOS.PLA;
  const cm3 = volumeMm3 / 1000;
  const gramas = cm3 * fil.densidade;
  const vazao = cfg.vazao || fil.vazao;
  const horas = gramas / Math.max(0.1, vazao);

  const material = gramas * (cfg.precoRolo / cfg.rendimento);
  const maquina = horas * cfg.custoMaquina;
  const energia = horas * (cfg.potencia / 1000) * cfg.precoKwh;
  const maoDeObra = ((cfg.setupMin + cfg.posMin * qtdLetras) / 60) * cfg.valorHora;
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
    { rotulo: 'Mão de obra', valor: maoDeObra, detalhe: `${cfg.setupMin + cfg.posMin * qtdLetras} min` },
  ];
  if (chapa > 0) itens.push({ rotulo: 'Chapa ACM', valor: chapa, detalhe: `${(areaChapaMm2 / 1e6).toFixed(3)} m2` });
  if (led > 0) itens.push({ rotulo: 'Fita LED', valor: led, detalhe: `${(perimetroLedMm / 1000).toFixed(2)} m` });
  itens.push({ rotulo: `Perdas (${cfg.taxaFalha}%)`, valor: falha, detalhe: 'trabalhos refeitos' });

  return { gramas, cm3, horas, rolos: gramas / cfg.rendimento, itens, custo, lucro: preco - custo, preco };
}
