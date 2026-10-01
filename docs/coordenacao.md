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
| QR / PIX | ChatGPT | (a criar) `lib/gerador/receitas/qr*.ts` + núcleo de QR |
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
