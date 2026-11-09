# formma3d

Letra caixa para impressão 3D: modela, gera o corte da chapa e calcula o preço na mesma tela.

**Usar agora:** https://scarprint.com.br/ — roda inteiro no navegador, nada é enviado
para servidor nenhum.

```bash
npm run dev     # http://localhost:3000

npx tsx scripts/verificar-ops.mts     # extrator de PDF, sem pdfjs (34 testes)
npx tsx scripts/verificar-pdf.mts     # ponta a ponta com pdfjs real (30 testes)
npx tsx scripts/verificar-apoio.mts   # apoios da chapa e colisão (33 testes)
npx tsx scripts/verificar-emenda.mts  # peça maior que a mesa dividida com emenda
npm run testar                        # tudo
```

## O que faz

Você digita o texto, escolhe a fonte e a altura em milímetros. O app gera **uma peça por letra**
e mostra em 3D, já com o preço de venda calculado.

### Modos de fabricação

| Modo | O que gera | Vai na mesa |
|---|---|---|
| Maciça | Bloco extrudado, chanfro opcional | Traseira na mesa, face para cima |
| Oca com face | Face + parede, fundo aberto | Face na mesa (sai lisa) |
| Moldura para chapa ACM | Corpo com apoio para a chapa + **contorno dela em DXF/SVG** | Traseira na mesa, bolsão para cima |
| Luminosa front-lit | Traseira + parede + face translúcida separada + furo de fio | Traseira na mesa |
| Backlit / halo | Face + parede, fundo aberto, espaçadores | Face na mesa |

Nenhum modo precisa de suporte: a orientação de cada um é escolhida para que toda camada
apoie na anterior.

### O apoio da chapa (a "bordinha")

Nos modos com chapa, você escolhe **como ela encosta na peça impressa**:

| Apoio | O que é | A chapa |
|---|---|---|
| **Para dentro** | Degrau interno, chapa embutida no bolsão | Menor que a letra |
| **Para fora** | A peça ganha uma borda que avança além do contorno | Do tamanho da arte |

Com borda, **a peça inteira cresce desde a base**, não só na frente. Isso não é detalhe: uma
aba que aparecesse só na frente imprimiria em voladiço e desabaria.

Dois ajustes que valem conhecer:

- **"A medida vale para a peça pronta"** (ligado por padrão): a borda faz a peça ficar `2 × borda`
  maior que a arte. Com isso marcado a arte encolhe sozinha, e a peça sai na altura que o cliente
  pediu. O rodapé mostra sempre as duas medidas.
- **Borda = parede + folga** faz o contorno de corte da chapa sair **exatamente igual à arte**
  original — o corte bate com o desenho que o cliente aprovou.

A borda também **resolve letra fina**: traço estreito que viraria peça maciça (sem espaço para o
batente) passa a ter miolo suficiente quando a peça cresce.

O app avisa quando a borda fecharia o vazado interno (o miolo do "e", do "a"), e quando duas
letras vizinhas passariam a se encostar — nesse caso dizendo **até quanto** de borda cabe.

### Saídas

- **STL binário** por letra (e a face translúcida separada, no front-lit); peça dividida sai um STL
  por pedaço e por tala
- **DXF e SVG** do contorno da chapa de ACM, em mm reais, já com a folga de encaixe
- **Gabarito 1:1** em SVG: imprime, cola na parede e fura no lugar certo
- **orcamento.txt** com a composição do preço
- Tudo junto em um `.zip`

### Avisos antes de imprimir

Trecho mais fino que duas linhas do bico, parede menor que o bico, letra que não cabe na mesa
(testando também girada 90°), profundidade menor que a chapa, letra sem espaço para o batente.

### Peça maior que a mesa: dividir com emenda

Letra de 600 mm ou logo grande não cabe na X2D (256 × 256) nem na A2L (330 × 320). Em
**Imprimir › Arranjo** (ou no botão direito da peça) **Dividir as que não cabem** corta cada uma em
pedaços que cabem na máquina escolhida (`lib/geom/emenda/`). O corte é feito depois de montar a
peça, com o mesmo cortador em todas as camadas: vale para todo modo, apoio, batente, LED e
espaçadores.

| Peça | Emenda |
|---|---|
| Sólida (com ou sem chanfro) | Dente de encaixe redondo na altura toda, a cada ~60 mm de material; folga de 0,2 mm |
| Oca | A emenda fica aberta por dentro e uma **tala** impressa à parte (placa + pele em "L") encaixa cruzando a emenda, 30 mm para cada lado. Furos para parafuso M3 na tala e no fundo, opcionais |
| Chapa cortada (ACM/acrílico) | Fica inteira e cobre a emenda; aviso se passar de 1220 mm |
| Chapa impressa | Dividida em degrau na espessura, com 15 mm de sobreposição |

- **Onde cortar:** linhas retas em X e em Y, o mínimo de pedaços; entre as posições que cabem,
  as que cruzam a parede de frente, longe da ponta de perna, do furo do fio e dos espaçadores,
  sem deixar lasca no cruzamento de dois cortes.
- **Número de montagem** gravado em cada pedaço (por dentro do fundo na oca, embaixo e espelhado
  na sólida): "A-1", "A-2"... O mesmo número vai no nome do arquivo.
- **Cortes a mão:** no Inspetor da peça (Desenhar), a lista de cortes em mm a partir do canto da
  peça: **+ Vertical**, **+ Horizontal**, **+ Inclinado** (ângulo em graus). "Voltar aos cortes
  automáticos" volta ao corte calculado, "Juntar de novo" desfaz.
- **Cortar à mão no 3D** (como o corte manual do Split3MF): a câmera vai para cima da peça.
  - Arrastar a bolinha do meio move o corte; a da ponta inclina (Shift prende em 15°).
  - **Desenhar corte**: cada clique põe um ponto de uma linha quebrada; duplo clique ou Enter
    termina, Backspace desfaz, Shift prende em 45°, Esc desiste. As pontas se estendem sozinhas
    até sair da peça.
  - Clique na linha põe um dente ali, clique no dente tira, botão direito troca o lado.
- **Encaixe de cada corte** (seta ao lado do corte no Inspetor), como os conectores do Split3MF.
  Todo encaixe é forma vista de cima × faixa de altura (o cortador é uma pilha de faixas,
  aplicada na malha da peça com booleana 3D):

  | Encaixe | Peça | Como fica |
  |---|---|---|
  | Dente | sólida | Na altura toda. Desenho redondo (quebra-cabeça), rabo de andorinha, reto ou triângulo |
  | Dente escondido | sólida | Da mesa até 60% da altura; em cima a emenda é reta e a frente só mostra a linha |
  | Cavilha solta | sólida | Vão nos dois pedaços no meio da altura e uma barra impressa à parte |
  | Pino deitado | sólida | Pino redondo (6 mm, entra 8 mm em cada pedaço) deitado no meio da altura, atravessando a emenda; furo com folga nos dois pedaços e o pino impresso em pé à parte. Só vai onde o material cerca o furo inteiro, longe dos outros cortes |
  | Borboleta | sólida | Vão em gravata borboleta por baixo, cruzando a emenda, e a chave impressa à parte |
  | Degrau | sólida | Meia-madeira em rampa: embaixo um pedaço passa 15 mm da linha, em cima para nela; nenhum dos dois imprime em balanço |
  | Tala | oca | A de sempre. O traço fino demais para ter vão por dentro leva dente pequeno |
  | Só cola | as duas | Corte reto, sem folga |

  E mais: quem leva o dente, largura (diâmetro e profundidade no pino deitado), um a cada tantos
  mm ou **onde eu clicar**, altura do dente escondido. O que o corte não escolhe vem do **Encaixe padrão** e do **Desenho do dente**.
- **Corte na altura (Z)**: **+ Na altura**, em mm da mesa. Parte a peça num plano; a parte de
  cima imprime com o corte na mesa. Serve para peça mais alta que a máquina (o automático corta
  em partes iguais) ou para imprimir em partes que cabem (a frente de outra cor, por exemplo): a
  peça que já cabe também mostra **Na altura** e **Desenhar** no Inspetor.

  | Encaixe | Peça | Como fica |
  |---|---|---|
  | Pino solto | sólida (padrão), oca onde couber | Pino redondo de 6 mm impresso em pé, 8 mm em cada parte; furo com folga nas duas. Só vai onde o material cerca o furo inteiro |
  | Pino fixo | as duas | O pino sai da parte de baixo e entra num furo da de cima (que abre para a mesa) |
  | Anel por dentro | oca (padrão) | Anel de 1,6 mm colado por dentro da parede de baixo (com rampa de 45°, sem balanço), sobe 8 mm e a parede de cima encaixa por fora dele |
  | Só cola | as duas | Corte reto |

  Diâmetro, profundidade, altura e espessura do anel por corte. Os pinos vão espalhados, um a
  cada tantos mm, ou **onde eu clicar**: no Cortar à mão, clique na peça (fora das linhas) põe
  um pino, clique no pino tira. Na Montagem, a parte de cima sobe.

  **Plano inclinado**: no encaixe do corte, **Inclinação** (até 60°) inclina o plano em torno do
  meio da peça, na altura escolhida, e **Direção** diz para que lado ele desce. A peça gira até
  o plano ficar deitado, é cortada e encaixada como no corte reto, e volta; a parte de cima
  imprime deitada na face do corte (com o número gravado nela). Encaixe: pino solto ou fixo,
  perpendicular ao plano, ou só cola (o anel não, porque ele acompanha a parede na horizontal).
  Os pinos do plano inclinado vão no automático.
- Cada pedaço, tala, cavilha, borboleta e pino é uma peça de impressão: mesa, arranjo, placas,
  custo e exportação tratam um por um. No `.zip`: `01_A_p1de4.stl`, `01_A_tala1.stl`,
  `01_A_cavilha1.stl`, `01_A_pino1.stl`.

## Como o preço é montado

Filamento + máquina + energia + mão de obra + chapa + LED = custo direto.
A **taxa de falha** entra no custo (você paga pelos jobs perdidos) e a **margem** só no final,
para o preço continuar legível quando você negociar.

Calibre a **vazão efetiva** (g/h) em `Impressora` com um job real: pegue as gramas do job e
divida pelas horas que ele levou. É o número que faz a estimativa de tempo valer alguma coisa.

## A interface

Header com o nome do trabalho, as medidas que mais se mexe (altura, profundidade, borda) e o
**peso e o preço ao vivo**. À esquerda, um trilho de ícones com as seções: arquivo e texto,
estilo, medidas e encaixe, camadas e peças, custo.

Sobre o 3D: o slider **Montagem** afasta a chapa do corpo para conferir o encaixe, e o rodapé
mostra X/Y/Z da peça montada nas cores dos eixos.

## Como funciona por dentro

O tipo central é `Region` (`lib/geom/region.ts`): contornos externos com seus buracos, em mm.
Ele atravessa todo o pipeline — glifo → modo → extrusão → STL/DXF/SVG.

A peça é uma **malha sólida** (fechada, sem buraco nem face sobrando), feita a partir de uma
receita de **prismas retos**: cada modo é uma lista de `Region` entre dois planos Z
(`receitaDaPeca`). O batente do ACM, por exemplo, é só a parede grossa embaixo e a parede fina
em cima — o degrau aparece sozinho.

- **Montar a pilha:** a malha da receita sai direto, sem booleana (`lib/malha/pilha.ts`). Unir
  prismas que se encostam em face plana é o caso mais caro de uma booleana 3D (700 ms no
  chanfro de um "g"); montando direto, sai em poucos ms. Em cada plano onde a pilha muda
  entram as faces de cima e de baixo; em cada faixa, as paredes. Pontos a menos de 0,0015 mm
  viram um, ponto de outro contorno que cai numa aresta entra nela (sem junta em T), e a malha
  é conferida: toda aresta em dois triângulos, um em cada sentido, e o volume da pilha.
- **Cortar e encaixar:** as ferramentas mexem na malha com a manifold-3d (WASM, booleanas com
  saída sempre fechada, `lib/malha/`): o cortador de cada corte, o plano do corte na altura, os
  furos do pino e do parafuso, o número gravado. Onde vai o dente ou o pino continua decidido
  em 2D, na seção (`slice`) e na sombra (`project`) da malha.
- **Cor:** cada prisma da receita marca as faces dele (`originalID`), e as booleanas preservam
  a marca: é o que a tela usa para pintar face, parede, bolsão.
- **Geradores e /design:** cada peça de receita também sai num sólido só no arquivo (3MF, STL),
  pela mesma pilha (`lib/gerador/malha.ts`). As texturas de relevo com centenas de camadas cujos
  contornos diferem por micra não fecham direto; essas saem com cada camada fechada (encostadas,
  sem booleana: unir leva segundos e a peça impressa é a mesma), e o teste lista quais são. A
  prévia, que refaz a cada mudança, usa um prisma da manifold por camada: a mesma superfície
  numa fração do tempo. O worker do gerador carrega o motor antes de montar.

O motor carrega uma vez (`iniciarMalha`, 0,5 MB) e só se usa dentro de `comEscopo`, que apaga
todo objeto WASM criado ali; a peça guarda a malha como dados (`Malha`), nunca um objeto vivo.
Se a carga falhar (rede), o editor diz isso e oferece **Tentar de novo**; o `manifold.wasm` vai
para `public/` no `predev`, no `prebuild` e no `npm run publicar`.

`minThickness` mede a menor espessura por abertura morfológica. É a operação mais cara do
projeto, e por isso é calculada uma vez por letra (em `letrasBase`), fora do caminho dos
sliders de fabricação.

```
lib/geom/region.ts    Region, offset, booleanas 2D, medição   (Clipper)
lib/geom/modes.ts     os 5 modos e os apoios -> receita de prismas -> malha
lib/geom/emenda/      peça maior que a mesa -> pedaços com emenda (booleana na malha):
                      planejar (onde cortar), linha, encaixe (X/Y), cortar, altura (Z),
                      pecas (tala, número, assentar), dividir (junta as etapas)
lib/geom/extrude.ts   malha -> BufferGeometry por papel        (three)
lib/malha/            motor de malha (manifold-3d): escopo, pilha de prismas, seção
lib/text/glyphs.ts    fonte -> contornos, kerning, cap height (opentype)
lib/import/pdf-ops.ts extrator de operadores do PDF (puro, testável sem pdfjs)
lib/import/matrix.ts  matriz 2D do PDF, pt -> mm, /Rotate
lib/import/pdf.ts     pdfjs, worker, diagnóstico de arquivo
lib/import/pecas.ts   objetos do desenho -> peças separadas
lib/export/           STL binário, DXF, SVG, gabarito
lib/cost/calc.ts      custo e preço
```

## Importar .ai / .pdf / .svg

O botão **Abrir** aceita o desenho já pronto. Um `.ai` moderno é um PDF por dentro,
então os vetores saem exatos — sem redesenhar nada. O `.svg` (logo) entra do mesmo jeito: cada
forma preenchida vira peça, o traço é engrossado pela largura, e a medida vem do `width` com
unidade (sem unidade, px a 96 dpi).

- **Separação em peças:** por padrão, cada forma solta do desenho vira uma peça (cada letra sai
  sozinha, mesmo que esteja tudo num objeto só). Dá para alternar para "objetos do arquivo" ou
  "camadas", e ligar/desligar cada peça na lista. Formas que se **encostam** viram uma peça só,
  que é o certo para fabricar. Acentos e o pingo do i se resolvem com "Juntar peças próximas".
- **Tamanho:** o app lê a medida real do desenho em mm e você digita a altura final. Tudo reescala
  junto, mantendo a proporção.

### O que o arquivo precisa ter

- **Texto convertido em contornos.** Texto vivo não vira peça — no Illustrator, Texto > Criar
  contornos (Ctrl+Shift+O) antes de salvar. O app avisa quando encontra texto não convertido.
- **`.ai` salvo com "Criar arquivo compatível com PDF"** (é o padrão). Sem isso o arquivo só tem
  os dados privados do Illustrator e não há o que ler; o app diz exatamente isso quando acontece.
- `.ai` de Illustrator 8 ou anterior é PostScript, não PDF — reexporte.

Traço solto (sem preenchimento) é ignorado por padrão, porque costuma ser linha de corte ou guia.
Se o arquivo *só* tem traços, o app engrossa pela largura da linha e avisa.

## Fontes

Abre com fontes web (Anton, Archivo Black, Bebas Neue...). Você também pode carregar um `.ttf`
do computador ou usar **Fontes do PC**, que lê as fontes já instaladas no Windows via Local
Font Access API (Chrome/Edge). É o mesmo acervo que você usa no Corel.

Para trazer um desenho do Corel, exporte como **.ai** (ou PDF). O `.cdr` é formato fechado e não
se abre direto. O `.psd` foi descartado de propósito: o Corel rasteriza ao exportar PSD, e o
desenho chegaria como pixels para redesenhar por aproximação — sempre pior que o `.ai`, que já
traz a curva exata.
