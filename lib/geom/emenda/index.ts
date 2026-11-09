/**
 * Divide uma peca maior que a mesa em pedacos que cabem, com emenda. A peca e um solido
 * (modes.ts); cada corte monta o seu cortador (as faixas de altura do encaixe, empilhadas) e o
 * aplica com booleana 3D (manifold), a peca e a chapa impressa. A emenda depende da peca:
 *
 *  - solida (com ou sem chanfro): dente de encaixe na altura toda, a cada ~60 mm de material
 *    na linha de corte. O pedaco de baixo leva o dente; o de cima, o vao com folga.
 *  - oca: a emenda fica aberta por dentro (sem parede dupla, nada de sombra no acrilico) e uma
 *    tala impressa a parte, em "L", encaixa por dentro cruzando a emenda: placa sobre a tampa
 *    fechada e pele colada na parede. Furos opcionais para parafuso M3 na tala e na tampa.
 *  - chapa cortada (ACM/acrilico): fica inteira e cobre a emenda.
 *  - chapa impressa: emenda em degrau na espessura (metade de baixo de um pedaco, metade de
 *    cima do outro), para sobrepor e colar.
 *
 * `planejarCortes` escolhe cortes retos em X e em Y (linhas inteiras): o minimo de cortes e,
 * entre as posicoes que cabem, as que cruzam a parede reta e de frente, longe do furo do fio e
 * dos espacadores. A mao, o corte tambem pode ser inclinado ou uma linha quebrada desenhada
 * (esboco), e cada corte escolhe o encaixe (`EmendaDoCorte`): o desenho do dente, o lado que
 * leva o macho, tamanho, quantos e onde. Todo encaixe e forma vista de cima x faixa de altura
 * (dente escondido, cavilha e borboleta soltas, degrau). O corte na altura (Z) parte o solido num
 * plano: a parte de cima imprime com o corte na mesa, e o encaixe e pino solto (furo nas duas
 * partes), pino fixo (macho na de baixo) ou, na oca, anel por dentro da parede. Cada pedaco pode
 * levar o numero de montagem gravado por dentro (ou embaixo).
 */
export { ehAltura, ehEsboco, ehReta, inclinado, moverCorte } from './tipos';
export type { Caixa, Corte, CorteDesenhado, CorteNaAltura, CorteReto, DesenhoDente, Divisao, Eixo, EmendaDoCorte, FormaEmenda, LugarDoDente, MarcaDeEncaixe, Mesa, OpcoesEmenda, PedacoDePeca, PlanoDoCorte, Reta } from './tipos';
export { ANEL_ALTURA, EMENDA_PADRAO, PINO_DIAMETRO, PINO_FUNDO } from './constantes';
export { ehSolida, trechosNaLinha } from './geometria';
export { caixaDe, centroDaPeca, direcaoDaReta, distanciaALinha, linhaDoCorte, pontosDoEsboco, tracosDoCorte } from './linha';
export { planejarCortes } from './planejar';
export { formaDoCorte } from './encaixe';
export { assentar, ehPecaSolta, juntarPedacos, pecaSolta } from './pecas';
export { dividirPeca } from './dividir';
