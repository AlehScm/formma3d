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
