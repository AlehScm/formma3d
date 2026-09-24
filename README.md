# formma3d

Letra caixa para impressão 3D: modela, gera o corte da chapa e calcula o preço na mesma tela.

**Usar agora:** https://alehscm.github.io/formma3d/ — roda inteiro no navegador, nada é enviado
para servidor nenhum.

```bash
npm run dev     # http://localhost:3000

npx tsx scripts/verificar-ops.mts     # extrator de PDF, sem pdfjs (34 testes)
npx tsx scripts/verificar-pdf.mts     # ponta a ponta com pdfjs real (30 testes)
npx tsx scripts/verificar-apoio.mts   # apoios da chapa e colisão (33 testes)
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
| **Dos dois lados** | Degrau por baixo + borda por fora, com lábio travando pela frente | Do tamanho da arte |

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

- **STL binário** por letra (e a face translúcida separada, no front-lit)
- **DXF e SVG** do contorno da chapa de ACM, em mm reais, já com a folga de encaixe
- **Gabarito 1:1** em SVG: imprime, cola na parede e fura no lugar certo
- **orcamento.txt** com a composição do preço
- Tudo junto em um `.zip`

### Avisos antes de imprimir

Trecho mais fino que duas linhas do bico, parede menor que o bico, letra que não cabe na mesa
(testando também girada 90°), profundidade menor que a chapa, letra sem espaço para o batente.

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

A peça nunca usa CSG (booleana 3D), que quebra com frequência em contorno de fonte. Em vez
disso, cada modo é uma lista de **prismas retos**: uma `Region` entre dois planos Z. O batente
do ACM, por exemplo, é só a parede grossa embaixo e a parede fina em cima — o degrau aparece
sozinho. Como todo sólido é prismático, o volume é `área × altura`, exato, e não uma
aproximação em cima da malha.

`minThickness` mede a menor espessura por abertura morfológica. É a operação mais cara do
projeto, e por isso é calculada uma vez por letra (em `letrasBase`), fora do caminho dos
sliders de fabricação.

```
lib/geom/region.ts    Region, offset, booleanas 2D, medição   (Clipper)
lib/geom/modes.ts     os 5 modos e os 3 apoios -> camadas prismáticas
lib/geom/letreiro.ts  checagens do letreiro inteiro (colisão entre vizinhas)
lib/geom/extrude.ts   camadas -> BufferGeometry               (three)
lib/text/glyphs.ts    fonte -> contornos, kerning, cap height (opentype)
lib/import/pdf-ops.ts extrator de operadores do PDF (puro, testável sem pdfjs)
lib/import/matrix.ts  matriz 2D do PDF, pt -> mm, /Rotate
lib/import/pdf.ts     pdfjs, worker, diagnóstico de arquivo
lib/import/pecas.ts   objetos do desenho -> peças separadas
lib/export/           STL binário, DXF, SVG, gabarito
lib/cost/calc.ts      custo e preço
```

## Importar .ai / .pdf

O botão **Abrir .ai / .pdf** aceita o desenho já pronto. Um `.ai` moderno é um PDF por dentro,
então os vetores saem exatos — sem redesenhar nada.

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
