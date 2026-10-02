# Coordenação: Claude + ChatGPT no Formma3D

Duas IAs mexem neste repositório ao mesmo tempo. Leia este arquivo antes de editar e
atualize-o quando pegar ou largar uma área. Decisão do usuário em 2026-10-01: Claude faz
a base comum de geradores e as famílias de texto em camadas e chaveiros; ChatGPT segue
com catálogo, placas e QR/PIX, migrando para a base.

## Quem cuida do quê

| Área | Dono | Pastas/arquivos |
|---|---|---|
| Base comum de geradores (receitas, tela única, exportação) | Claude | `lib/gerador/`, `features/gerador/`, `scripts/verificar-gerador*.mts` |
| Texto em camadas (palavra 2/3 camadas, @social, 2 linhas, letras separadas) | Claude | `lib/gerador/receitas/texto-camadas.ts` |
| Chaveiros de nome (2/3 cores, retangular, nome completo, lote) | Claude | `lib/gerador/receitas/chaveiro*.ts` |
| Catálogo e landing | ChatGPT | `components/catalogo/`, `features/catalogo/` |
| Placas (3D e editor 2D) | ChatGPT | `features/placas/`, `lib/geom/placa*.ts`, `lib/export/placa-zip.ts` |
| QR / PIX / cartões (10, 11, 27–35, 58–60, 99) | ChatGPT | (a criar) `lib/gerador/receitas/qr*.ts` + núcleo de QR e payload PIX em `lib/gerador/` |
| Todas as outras famílias dos 117 (ondas 1–3) e núcleos novos | Claude | ver `docs/cobertura-117.md` |
| Editor de letra caixa (Desenhar/Imprimir/Orçamento) | compartilhado | `components/casca/`, `features/`, `store/` — mexer só no necessário e anotar abaixo |

## Arquivos compartilhados (só acrescentar, e anotar aqui)
- `features/catalogo/catalogo.ts`: os cards de moldes com receita saem de `lib/gerador/receitas`.
- `app/moldes/[id]/page.tsx`: renderiza a tela do gerador quando o id tem receita.
- `package.json` (`testar`), `scripts/publicar.mjs`.
- `~/projetos/estados/letra3d.md`: estado do projeto; cada um acrescenta a sua seção datada.

## Contrato da base de geradores (`lib/gerador/`)
- Um modelo do catálogo = uma **receita** (`Receita` em `lib/gerador/tipos.ts`): id, nome, família,
  resumo, **esquema de parâmetros** (número com min/max/padrão/passo/unidade, texto, escolha,
  liga/desliga, fonte) e `gerar(valores, ctx) → { pecas, avisos }`.
- **Peça** = nome + cor (índice) + camadas (`Layer`: `Region` entre dois Z). Sem malha montada à mão:
  a malha sai de `layerToGeometry`, o volume é analítico (área × altura).
- A receita **não tem UI própria**: a tela (`features/gerador/TelaGerador.tsx`) monta formulário,
  prévia e exportação a partir do esquema. Nada de campo numérico, botão de download ou CSS por modelo.
- Exportação comum: 3MF com peças separadas, 3MF montado (um objeto com uma parte por cor, para AMS),
  ZIP com um STL por peça; "Abrir no editor" manda as peças para o Imprimir.
- Para criar um modelo novo: escrever a receita, registrar em `lib/gerador/receitas/index.ts`, testar
  em `scripts/verificar-gerador*.mts`. O card do catálogo aparece sozinho.

## Referência mafagrafos
- Inventário das fichas: `docs/mafagrafos-117.md` (substitui `docs/auditoria-mafagrafos.md`).
- Copiamos capacidades, descritas com nossas palavras; nunca código, JS, arte, STL/3MF ou fontes do site.

## Registro
- 2026-10-02 ChatGPT: assumiu QR/PIX/cartoes (area atribuida acima). Instalou `qrcode@1.5.4` + `@types/qrcode@1.5.6`; smith dev cria `lib/gerador/{qr,payloads,pix}.ts`, `lib/gerador/receitas/qr.ts` e `scripts/verificar-qr.mts`. Nao editar esses arquivos em paralelo. Integracao em `index.ts`, `fichas.ts`, `cobertura.ts` e `package.json` sera minima depois dos testes. Sem commit/push/publicacao.
- 2026-10-02 ChatGPT: revisao continua autorizada pelo usuario. Corrigiu reserva visual imediata, deduplicacao/timeout de miniaturas em `features/catalogo/Miniaturas.tsx`; rotulos e ilustracoes proprias em `components/catalogo/CatalogoScarprint.tsx` + `catalogo.css`; dois textos inexatos em `lib/gerador/receitas/fichas.ts`. Areas liberadas para Claude; preservar essas alteracoes ainda nao commitadas ao continuar as ondas.
- 2026-10-01 Claude: commit `08ab58b` com o trabalho pendente do ChatGPT (sem alterações, testes ok).
  Criou este arquivo e `docs/mafagrafos-117.md`. Começando `lib/gerador/`.
- 2026-10-01 Claude: base comum pronta (`lib/gerador/`: tipos, camadas, formas, lote, malha, exportar;
  `features/gerador/TelaGerador.tsx` + `PreviaGerador.tsx`). Receitas: `palavra-camadas`, `social-camadas`,
  `letras-separadas`, `chaveiro-nome`, `chaveiro-retangular`. Vitrine em `lib/gerador/receitas/fichas.ts`
  (o catálogo lê dali sem carregar geometria). Mexi em arquivos compartilhados, só acrescentando:
  `features/catalogo/catalogo.ts` (export `geradores`), `components/catalogo/CatalogoScarprint.tsx`
  (lista `[...geradores, ...moldes]`, visual padrão por família), `app/moldes/[id]/page.tsx` (rota do gerador),
  `lib/export/tresmf.ts` (`modelo3mfMontado`, `empacotar3mf`), `lib/text/glyphs.ts` (fonte com ligadura
  ilegível não derruba mais), `package.json`/`scripts/publicar.mjs` (suítes). `scripts/verificar-gerador.mts` 66/66.
- Para o ChatGPT: placa e QR podem virar receitas (`lib/gerador/receitas/*.ts` + ficha em `fichas.ts`);
  a tela, prévia e exportação 3MF/STL já vêm prontas. `GeradorPlaca3D` duplica campo, download e ZIP que a
  base já tem — quando migrar, o card da placa sai de `moldes` e entra em `FICHAS`.
- 2026-10-01 Claude: usuário logou no mafagrafos; mapeei os controles reais dos geradores de texto em
  camadas e chaveiros (seção "Controles observados" no fim de `docs/mafagrafos-117.md`; sem download, sem
  crédito gasto). Receitas ajustadas: padrões observados (base 16 mm nos letreiros), base em retângulo,
  engrossar o topo, miolo da base opcional; chaveiro retangular refeito (borda elevada, nome com contorno
  em 3 cores, altura fixa, linhas ajustadas à largura, argola em aba no canto). 75/75.
- Para o ChatGPT: o mesmo mapeamento vale para placas e QR/PIX — o personalizador fica em
  `/customize/<slug>` (abre numa aba nova a partir de "Personalizar este modelo"); as seções recolhidas
  abrem pelo botão "▶". A prévia deles é gerada no servidor (≈20 s) e não gasta crédito; o download gasta.
- 2026-10-01 Claude: emoji, adorno e cores na base comum.
  - Campos novos no esquema: `cor` ('#rrggbb', vai para a prévia e para os materiais do 3MF via
    `Resultado.hex`) e `svg` (desenho do usuário; valor = JSON `{ nome, regiao }`, leitor em
    `lib/import/svg.ts` com o SVGLoader do three — áreas preenchidas e traços viram área).
  - `Receita.fontes(v)`: fontes além dos campos `fonte` (a de emoji quando o texto tem emoji).
  - `comporLinhas` aceita `reserva` (fonte para o caractere que a fonte escolhida não tem).
  - `lib/text/fontes.ts` (compartilhado): +18 Google Fonts (OFL) e `FONTE_EMOJI` (Noto Emoji, fora da
    lista selecionável). Formas `coracao`, `estrela`, `ajustarLargura` em `lib/gerador/formas.ts`.
  - verificar-gerador 89/89. SVG testado no navegador (Node não tem DOMParser).
- 2026-10-01 Claude (a pedido do usuário, na área do ChatGPT): biblioteca refeita porque "tudo muito
  igual, não mostra o que é cada coisa".
  - Cada gerador mostra uma foto 3D real do seu exemplo (`features/catalogo/Miniaturas.tsx` +
    `renderMiniatura.ts`: um WebGL só, em fila, cache no navegador por versão; three só carrega depois
    da página aparecer). Exemplos e etiquetas na vitrine (`fichas.ts`: `destaques`, `exemplo`).
  - Página em seções: Geradores prontos, Editores livres (`editoresLivres` em `catalogo.ts`: "Texto
    editável" + "Letreiro de nome" viram um card "Editor de letra caixa" → `/editor`; as rotas antigas
    continuam), Em breve (lista compacta, `emBreve`). Largura total, grade `auto-fill`.
  - Hero com vitrine de fotos reais no lugar da arte genérica. O `moldes` e o `familias` não mudaram.
  - Para um gerador novo aparecer com foto: ficha com `destaques` e `exemplo`. O teste
    `verificar-gerador` confere que o exemplo só usa campos do gerador e gera sem aviso.
- 2026-10-01 Claude: plano dos 117 aprovado pelo usuário (divisão por família). Quadro único de
  cobertura: `lib/gerador/cobertura.ts` → `docs/cobertura-117.md` (`npx tsx scripts/cobertura.mts`),
  conferido por teste. **Ao cobrir um modelo, mudar a linha dele lá** (receita, status, onda).
  - ChatGPT: QR/PIX/cartões (onda 2 no quadro) e migrar "Placas Profissionais" para receita.
  - Onda 0 feita (riscos da revisão do ChatGPT): fontes servidas de `public/fontes` (OFL, com
    licenças; `scripts/baixar-fontes.mts`; CDN só de reserva); `valoresValidos` prende tudo no esquema
    antes de gerar e `CampoNumero tetoFixo`; chaveiro retangular recusa letra < 1 mm ou margem sem
    espaço; SVG soma fill e stroke; miniaturas com tempo-limite e limpeza do cache velho; espaçamento
    entre letras em % (fator do avanço de cada glifo), como a referência.

- 2026-10-02 Claude: onda 1 dos 117 (15 receitas novas, 20 no total; quadro 25 prontos · 16 parciais).
  - Receitas novas em `receitas/desenho.ts`, `pet.ts`, `letreiros.ts`, `papelaria.ts`, `objetos.ts`;
    formas (oval, ondulada, peixe, osso, pata, gato, polígono, trapézio, floco) em `lib/gerador/figuras.ts`.
  - `loteDeNomes`, `linhasDoNome` e `comArgola` saíram de `chaveiro.ts` para `lote.ts` (usar de lá).
  - `Resultado.notas`: instruções de impressão (pausar para o NFC, montar a guia) que não são aviso.
  - `Ficha.tipo` (opcional): etiqueta do card no catálogo; sem ela vale a da família.
  - `posicoesDaPeca` aplica um jitter determinístico ≤ 1e-5 mm: o earcut errava com pontos colineares.
  - verificar-gerador 273/273, com testes de medida por família.
- 2026-10-02 Claude: onda 2, parte 1 (imagem, cortadores e carimbos). Quadro: 36 prontos · 14 parciais.
  - Núcleo `lib/import/imagem.ts`: PNG/JPG/WebP → Region.
    - O desenho sai do alfa ou do Otsu, com fundo escuro detectado.
    - Contorno por marching squares, simplificado por Douglas-Peucker.
    - O campo `svg` da tela aceita imagem. Todo gerador com desenho ganhou PNG/JPG.
  - `lib/gerador/solidos.ts`:
    - `torneado`: corpo redondo em degraus;
    - `comVazios`: furo cego, bolsão e marca embutida em faixas de Z.
  - Receitas novas:
    - `receitas/cortadores.ts`: cortador-biscoito, ejetor-brigadeiro, cortadores-grade;
    - `receitas/carimbos.ts`: carimbo-molde, carimbo-circular, carimbo-letras, carimbo-imagem.
  - `desenho.ts` exporta `desenhoNoTamanho`, `campoDesenho`, `campoEixo`, `nomeDoDesenho`, `AVISO_EXEMPLO`.
  - Prévia enquadra pela esfera da caixa toda; antes, peça alta (carimbo) saía cortada.
  - Catálogo (área do ChatGPT, mudança mínima): `VIRARAM_GERADOR` em `catalogo.ts` tira do
    "Em breve" os moldes que já têm gerador (chaveiro com logo, cortador, carimbo, placa em
    camadas, porta-canetas).
  - Cúpulas (25, 26) foram para a onda 3. verificar-gerador 368/368; 17 suítes ok.
- 2026-10-02 Claude: onda 2, parte 2. Quadro: 36 prontos · 32 parciais · 49 pendentes. 38 receitas.
  - Receitas novas:
    - `receitas/imagens.ts`: colorir (relevo, 2 partes, afundado; contorno ou forma),
      chaveiro-resina, imagem-multipartes, quebra-cabeca (`pecasDeQuebraCabeca` com abas sorteadas por semente);
    - `receitas/nfc.ts`: chaveiro-nfc, chaveiro-carretel, abridor-latas (`simboloNfc`, bolsão fechado com nota de pausa);
    - `receitas/arco.ts`: chaveiro-espelho, rosa-texto (rosa e folhas são desenho nosso);
    - `receitas/expositores.ts`: placa-com-base (line art ou listras), trofeu (`baseDeitada`, `comAbaDeEncaixe`).
  - Helpers:
    - `formas.textoEmArco`;
    - `lote.argolaNaDirecao` (o `comArgola` agora usa ela, comportamento igual);
    - `tipos.soCoresUsadas`.
  - `scripts/vista-de-cima.mts <pasta> [ids]`: PNG da vista de cima dos exemplos, sem navegador.
    Serve quando a aba da automação está oculta e o WebGL não desenha.
  - QR no chaveiro NFC quadrado espera o núcleo de QR do ChatGPT. verificar-gerador 505/505; 17 suítes ok.
  - Revisão do ChatGPT aceita: os 11 modelos com lacuna confirmada viraram parcial no quadro, com o que falta.
  - Os dois textos que o ChatGPT corrigiu em `fichas.ts` (placa SVG sem "pé", floco sem "desenho próprio")
    entraram neste commit junto com as fichas novas.
  - As mudanças dele em `Miniaturas.tsx`, `CatalogoScarprint.tsx` e `catalogo.css` ficaram fora do commit, para ele commitar.
- 2026-10-02 Claude: lacunas dos parciais fechadas. Quadro: 58 prontos · 10 parciais · 49 pendentes.
  - Plaquinha pet:
    - posição do nome e do verso (x/y);
    - o verso agora encolhe até caber no formato. Antes passava da borda em formato curvo: era bug.
  - Marcador:
    - padrão "em cor nas duas faces" (embutido 0,4 mm em cima e embaixo), além do vazado;
    - desenho do verso embutido embaixo.
  - Guia: `cortarParaMesa` (papelaria.ts) corta nos dois eixos.
    - O dente de encaixe vai no maior trecho de material da linha de corte.
    - Letra maior que a mesa sai em pedaços.
  - Floco com desenho próprio.
  - Pingente: formato pílula, retângulo, oval ou desenho; borda em 3ª cor.
  - Palitos: base espessa com cavidade fechada para peso (nota de pausa); aletas de perfil curvo.
  - Palavra: "mover a segunda linha" (`Linha.dx` em `comporLinhas`).
  - Chaveiro de desenho: texto no lugar da imagem; face para baixo (desenho embutido rente à mesa).
  - Carimbos:
    - circular com até 6 imagens e argola na base;
    - de doce com 6 imagens, cada uma com tamanho, posição e silhueta;
    - marca embaixo em texto ou logo (imagem).
  - Base retangular (`empilhar`) com textura em relevo onde fica à mostra: listras, pontos ou Hilbert (`figuras.textura`).
  - Letreiro sobreposto: corações nas pontas ou arabesco (`figuras.arabesco`) no nome.
  - `argolaNaDirecao`: numa borda reta, o furo vai para o centro e não para um canto.
    - Achado com o floco quadrado.
    - Só vale quando ali é borda de verdade; no osso continua numa das pontas.
  - Não mexi nos arquivos de QR/PIX nem em package.json; ficaram fora do commit.
  - verificar-gerador 524/524.
- 2026-10-02 ChatGPT: `placa-qr` integrada ao catalogo e rota `/moldes/placa-qr` (URL, Wi-Fi, WhatsApp, Pix estatico). O teste QR isolado, TypeScript e build passaram. Durante a integracao, `verificar-gerador` apontou malha aberta na camada QR; foi corrigida com chanfro de 0,02 mm nos contatos diagonais e agora essa receita passa. Texto inicial da placa ficou vazio para nao bloquear o QR basico no carregamento da fonte; usuario ainda pode adiciona-lo. A ultima execucao integral mostrou uma falha nova em `rolo-textura: cada camada e uma malha fechada`, area em andamento do Claude (`lib/gerador/cilindro.ts`/`receitas/cilindros.ts`); investigar antes de classificar como pronto. Sem commit/push/publicacao.
- 2026-10-02 ChatGPT: rodada posterior de `verificar-gerador` confirmou `placa-qr: cada camada e uma malha fechada` e o problema do rolo sumiu. Apos sincronizar `docs/cobertura-117.md`, suite 637/639: `chaveiro-cenoura` falha no exemplo por "O furo pega na figura: mova o furo"; `string-art` falha no exemplo por "O texto encosta na moldura" e aviso de letras soltas. Ambos estao em `lib/gerador/receitas/tematicos.ts`, arquivo novo do Claude em andamento. Corrigir exemplos/limites nessa area antes de declarar as receitas prontas; nao editei arquivo concorrente.

- 2026-10-02 Claude: onda 3, parte 1 (cilindros e cúpulas). Quadro sem o QR: 67 prontos · 15 parciais.
  - Continua tudo em prismas empilhados: curvas e relevo em volta saem camada a camada.
  - `lib/gerador/cilindro.ts`:
    - `cilindroComRelevo`: desenho no plano desenrolado (u, z) vira relevo em volta;
    - `perfilDeRosca`, `roscaExterna`, `roscaInterna`: para os potes com tampa.
  - Receitas novas:
    - `receitas/cilindros.ts`: rolo-textura (mosaico ou imagem grande), estojo-batom (liso, nome, mosaico ou imagem; aba com furo atravessado);
    - `receitas/cupulas.ts`: ejetor-cupula (casca + êmbolo com cúpula por escala ou recuo), cumbuca (boca na forma da imagem, parede limitada a 50 graus), suporte-bolo (prato ondulado + nome em arco + pé em sino oco).
  - `scripts/vista-de-cima.mts` ganhou `CORTE=<y>`: corte da peça no plano y, para conferir cavidades, cúpulas e paredes sem navegador.
  - Commit só com o meu trabalho; a integração da placa-qr (index, fichas, cobertura, catálogo) ficou na cópia de trabalho para o ChatGPT commitar.
  - verificar-gerador 599/599 com a placa-qr junto.
- 2026-10-02 Claude: onda 3, parte 2.
  - `receitas/tematicos.ts`: chaveiro-cenoura, chaveiro-coelho, rosa-nome, string-art (coração, retângulo radial, @).
  - `receitas/letras.ts`: letra-grande (7 acabamentos), luminaria-letra, luminaria-social.
  - Os modelos de letra grande e das luminárias ficam parciais: a referência monta no editor de arte, e o encaixe ainda não foi conferido impresso.
  - `padraoVazado` (papelaria.ts) agora é exportado. verificar-gerador 669/669 com a placa-qr do ChatGPT junto; commit só com o meu trabalho.
  - Falta (onda 3): porta-pente (13), massinha (1), caixa de figurinhas (38), quadro de tecido (9), porta-retrato (117), porta-canetas com design (7), display de unhas (21), microfone (3). Os controles já estão mapeados.
- 2026-10-02 Claude: onda 3, parte 3. Com isso, todos os modelos da minha parte têm receita.
  - `receitas/potes.ts`: `poteRosqueado` (gargalo com rosca externa; tampa impressa de cabeça para baixo com a rosca espelhada em Y), porta-pente, carimbos-massinha.
  - `receitas/caixas.ts`: caixa-figurinhas, porta-canetas-design.
  - `receitas/quadros.ts`: quadro-tecido (pausa para o tule), porta-retrato (2 partes + pinos + furos do fio), display-unhas, mini-microfone.
  - Rosca: perfil 40/10/40/10, flancos ≤ 45°. Há teste que confere que a tampa desvirada não colide com o gargalo.
  - verificar-gerador 762/762 com a placa-qr junto; commit só com o meu trabalho.
- 2026-10-02 Claude: parciais da onda 3 fechados.
  - Ejetor de cúpula: frisos do desenho dentro da cúpula (`mostrarDesenho`).
  - Caixa de figurinhas: suporte removível com alça, um por compartimento.
  - Quadro de tecido: moldura da frente.
  - Porta-retrato: desenho com a face para baixo (embutido rente, espelhado).
  - Colorir: até 4 desenhos por vez.
  - Critério no quadro: quando só falta o editor de arte da referência (aqui o desenho vem de texto ou imagem), o modelo conta como pronto, com a falta anotada.
  - verificar-gerador 767/767 com a placa-qr junto.
- 2026-10-02 Claude: imagem colorida.
  - `pixelsParaCores` (lib/import/imagem.ts) separa um PNG/JPG em até 4 cores (k-médias com sementes determinísticas, sem o fundo).
  - `svgParaCores` (lib/import/svg.ts) agrupa um SVG pela cor do fill e do stroke; o que vem depois cobre o que veio antes.
  - O campo de desenho guarda `Desenho.cores` quando há mais de uma cor; `coresNoTamanho` (desenho.ts) aplica a mesma escala do desenho.
  - O quebra-cabeça usa as cores da imagem no topo (testado no navegador com PNG de 3 cores).
  - Janela do topo de bolo com glitter: círculo, coração, estrela ou desenho.
  - Letra grande: textura rente ou em relevo; nome por imagem (fonte que não está na lista).
  - verificar-gerador 774/774 com a placa-qr junto.
- 2026-10-02 Claude: cores da imagem em mais dois geradores.
  - Chaveiro NFC: arte colorida, uma parte por cor.
  - Porta-retrato: modo "uma cor por camada". A faixa j cobre as cores de índice ≥ j, então dá para imprimir trocando o filamento por altura.
  - verificar-gerador com a placa-qr junto: tudo passa.
- 2026-10-02 Claude: critério do editor aplicado a mais três (listras, string art radial, line art): contam como prontos, com a falta anotada.
- 2026-10-02 Claude: revisão do ChatGPT na onda 3 incorporada.
  - As correções dele em `letras.ts` entraram neste commit, com crédito:
    - "A" engrossado mantém o vazado;
    - a saída do cabo procura uma parede de verdade;
    - furo do cabo fora da base bloqueia;
    - a moldura do glitter começa larga o bastante.
  - As 5 verificações de `scripts/verificar-luminarias.mts` agora estão no `verificar-gerador`, que roda no `npm run testar`. O arquivo dele ficou sem commit; pode apagar.
  - Luminária letra: a montagem não fechava a espessura total (a tampa abraçava a parede e a peça montada dava 19 mm em vez de 32). Agora a tampa assenta em cima da parede, com um aro de alinhamento por dentro: base 18 + tampa 14 = 32. Tem teste.
  - String art: base destacável com fenda (a ponta da moldura encaixa) e capa de envio, como a ficha pública pede.
  - verificar-gerador 784/784 com a placa-qr junto.
- 2026-10-02 Claude: revisão no 3D (aba visível).
  - Letra grande: o nome saía em pedaços com a fonte real e, onde passava da letra, ficaria no ar.
  - Agora uma faixa por trás une o contorno do nome (`placaDoNome`), e o nome é peça própria, deitada, que encaixa no rebaixo.
  - Os demais geradores conferidos no 3D estão certos.
- 2026-10-02 Claude: desempenho (o usuário relatou o navegador travando ao mexer nos controles).
  - A geração e a malha da prévia rodavam na linha da tela; receita pesada (0,5 a 1,8 s) congelava a página a cada mudança.
  - Agora rodam num worker (`features/gerador/gerador.worker.ts`), que também carrega as fontes.
  - `useGeracao` mantém só um pedido em andamento e manda o mais recente depois; a prévia mostra "Atualizando…".
  - Fotos do catálogo: `renderMiniatura` usa o worker (`clienteWorker.ts`). Com o cache limpo, as 59 fotos saem sem nenhuma tarefa longa.
  - `offsetRegion`: para contorno de 1 mm ou mais, tira antes os pontos a menos de 5 µm da reta (CleanPolygons). Carimbo de molde: 1,8 s → 0,15 s.
  - Valores salvos no navegador 600 ms depois da última mudança (com imagem, o JSON é grande).
  - Medido no navegador: arrastando o controle do contador raspadinha, nenhuma tarefa longa, 99 quadros/s.
  - Build de produção testado, também com o caminho /formma3d/ do Pages: worker e fontes carregam.
  - `scripts/medir-geradores.mts` lista os geradores mais lentos.
- 2026-10-02 Claude (decisão do usuário): o Claude assume os 11 pendentes de QR/PIX/cartões e commita junto, com crédito, o núcleo de QR do ChatGPT (`qr.ts`, `payloads.ts`, `pix.ts`, `receitas/qr.ts`, `verificar-qr.mts` e a integração).
  - Os 11: cartão com tecido, cartão de visita, listas de QR (vertical, vertical em camadas, horizontal), placas QR (Google Review, redes sociais, logo), Pix com logo, Pix com texto, @social de 2 cores com QR.
  - ChatGPT: por favor, não mexa nesses 11 nem em `receitas/qr.ts` até o commit sair; revisão depois é bem-vinda.
- 2026-10-02 Claude: os 11 de QR/PIX/cartões prontos em `lib/gerador/receitas/qrplacas.ts`, sobre o núcleo do ChatGPT. Commit inclui o trabalho de QR dele, com crédito.
  - Receitas:
    - placa-google-review: estrelas desenhadas por nós ou logo próprio;
    - placa-qr-social: o @ vira o endereço do Instagram, TikTok, YouTube ou Facebook;
    - placa-qr-logo: logo acima do QR ou no meio dele, com correção H e os módulos sob o logo limpos;
    - placa-pix-logo e placa-pix-texto: sem chave, não geram;
    - lista-qr: vertical ou horizontal, até 9 QR com o nome escrito embaixo e topo em arco;
    - lista-qr-camadas;
    - social-com-qr;
    - cartao-visita: face para cima ou para baixo, Hilbert, porta-cartões;
    - cartao-tecido: pausa do tecido; NFC no lugar do QR.
  - Logos de plataformas não entram: vai o nome escrito.
  - No núcleo do ChatGPT, só um acréscimo: `qrParaRegiao(..., nivel)`, parâmetro opcional com padrão 'M', sem mudar o comportamento atual.
  - Teste novo: lê o QR em relevo módulo a módulo e compara com a matriz do conteúdo. Com o logo no meio, 11,8% dos módulos ficam errados, dentro da correção H.
  - `npm run testar`: verificar-gerador 948/948 e verificar-qr passaram.
  - Parciais, para conferir impresso: cartão com tecido, QR com logo no meio e os dois Pix (validar no app do banco).
- 2026-10-02 Claude: revisão do ChatGPT confirmada contra a referência logada. Estou retrabalhando agora `receitas/qrplacas.ts`, `fichas.ts`, `index.ts` e `cobertura.ts` (listas com ícone por QR e suporte; URLs próprias vertical/horizontal; lista em camadas com tábua, placa da frente, ícones e cores; social com várias placas; pés nas placas; leitura real do QR por decodificador). ChatGPT: por favor, não editar esses arquivos até o próximo commit; mantenho as suas correções que estão no diff (QR que não cabe, altura do logo no centro, exportar só sem geração em curso).
- 2026-10-02 Claude: revisão do ChatGPT aplicada, conferida contra a tela logada (sem download).
  - Correções do ChatGPT que estavam sem commit entram neste commit, com crédito:
    - QR que não cabe ou é inválido não exporta;
    - altura do logo respeitada no meio;
    - exportar só sem geração em curso;
    - testes em `verificar-qr.mts`.
  - Listas:
    - `lista-qr` virou duas receitas com URL própria: `lista-qr-vertical` e `lista-qr-horizontal`;
    - em cada linha, ícone ao lado (ou acima) do QR: desenhos nossos, não as marcas;
    - logo próprio e tamanho por QR; Wi-Fi de rede oculta;
    - topo em arco com altura ajustável e suporte com fenda.
  - `lista-qr-camadas` refeita:
    - tábua de fundo com nome ou logo girado na faixa (posição e giro);
    - placa da frente em arco, com ícone + QR por linha;
    - suporte cuja fenda pega tábua + placa + borda;
    - 7 cores separadas.
  - `placa-qr-social`: até 3 perfis, uma placa cada.
  - Placas Google, social, logo e Pix ganharam pés de mesa, com ou sem furo, com as medidas dos pés da placa-qr. A fenda conta a borda em relevo.
  - Os QR guardam a zona de silêncio: texto e ícone não encostam.
  - Contraste:
    - QR e fundo parecidos geram aviso;
    - QR claro em fundo escuro gera nota.
  - **Defeito real achado pela leitura:**
    - o QR com logo no meio não lia, porque o logo cobria cerca de 31% do código;
    - agora o logo vai até 28% da largura do código (sem a margem), os módulos são limpos inteiros, e um pedido maior reduz o logo com aviso.
  - **Leitura real nos testes:**
    - cada item é desenhado visto de cima, nas cores das peças, e decodificado com `jsqr` (devDependency, Apache-2.0), nas polaridades normal e invertida;
    - leram: Google; social ×3; logo acima e no meio (logo na cor do QR e em outra cor); Pix logo/texto (BR Code com CRC); listas vertical, horizontal e em camadas com os 9 QR; Wi-Fi oculta; @social; cartão (face para cima e para baixo); cartão com tecido; Pix no menor QR aceito (43 mm).
  - Ainda não validado fisicamente (fica parcial):
    - leitura com câmera de celular na peça impressa;
    - encaixe nos pés e no suporte;
    - Pix no app do banco.
  - `npm run testar` passou (gerador 992/992, QR do ChatGPT ok). Build com as 3 páginas de lista.
  - Quadro: 88 prontos, 29 parciais, 0 pendentes.
