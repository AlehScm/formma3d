/** Numeros da emenda: folgas, tamanhos dos encaixes e limites da escolha dos cortes. */
import type { OpcoesEmenda } from './tipos';

export const EMENDA_PADRAO: OpcoesEmenda = {
  folga: 0.2,
  larguraTala: 30,
  espTala: 3,
  alturaTala: 12,
  peleTala: 2,
  folgaTala: 0.3,
  parafusos: false,
  gravarNumero: true,
  margem: 4,
  sobreposicaoChapa: 15,
  forma: 'auto',
  desenho: 'redondo',
};

/** Diametro do furo do parafuso M3 (passa folgado). */
export const FURO_M3 = 3.4;

/** Profundidade da gravacao do numero, mm. */
export const PROF_GRAVACAO = 0.4;

/** Espacamento do dente ao longo do material na linha de corte, mm. */
export const PASSO_DENTE = 60;

/** Menor trecho de material que recebe dente, mm. */
export const TRECHO_MIN_DENTE = 6;

/** Quanto o dente avanca alem da linha (no maximo 1,8 x raio 8). */
export const AVANCO_DENTE = 15;

/** Menor pedaco ao longo de um eixo, mm. */
export const PEDACO_MIN = 30;

/** Pedaco menor que isto (mm2) e lasca: some, com aviso. */
export const LASCA = 20;

/** Menor trecho de material entre a linha de corte e um corte do outro eixo, mm. */
export const TRECHO_MIN = 20;

/** Maior tala ao longo da linha de corte, mm (as mais compridas viram varias). */
export const TALA_MAX = 150;

/** Pedaco mais raso que isto (da linha de corte ate onde o material acaba) pesa na nota, mm. */
export const FUNDO_BOM = 80;

/** Peso, por mm, da diferenca entre um pedaco e a divisao em partes iguais (so desempata). */
export const EQUILIBRIO = 0.03;

/** Pedacinho que um corte solta (refaz o plano longe dele): area, mm2, e maior lado, mm. */
export const PEDACINHO_AREA = 600;

export const PEDACINHO_LADO = 40;

/** Quanto o corte que soltou pedacinho fica evitado, para cada lado, mm. */
export const RAIO_EVITAR = 12;

export const GRANDE = 1e5;

/** Pino do corte na altura: diametro e quanto entra na parte de cima, mm. */
export const PINO_DIAMETRO = 6;

export const PINO_FUNDO = 8;

/** Material em volta do furo do pino, mm. */
export const PINO_BORDA = 1.5;

/** Folga no fundo do furo do pino e do anel, mm (o pino nao bate no fundo). */
export const FUNDO_LIVRE = 0.3;

/** Anel por dentro da parede (oca, corte na altura): quanto sobe na parte de cima e desce colado na de baixo, mm. */
export const ANEL_ALTURA = 8;

export const ANEL_COLADO = 4;

/** Folgas mais perto que isto, mm, empatam na escolha do lugar do pino. */
export const EMPATE_FOLGA = 0.01;
