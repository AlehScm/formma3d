# Publicacao automatica (opcional)

Hoje o site e publicado com `npm run publicar`, que gera e envia para a branch
`gh-pages`. Funciona sem permissao extra.

Para o GitHub publicar sozinho a cada `git push`:

1. Dar ao token a permissao de workflow (abre o navegador uma vez):

   ```
   gh auth refresh -s workflow
   ```

2. Mover este arquivo para o lugar que o GitHub le:

   ```
   mkdir -p .github/workflows
   mv docs/github-pages-workflow.yml .github/workflows/deploy.yml
   git add -A && git commit -m "Publicacao automatica" && git push
   ```

3. Em **Settings > Pages**, trocar *Source* de "Deploy from a branch" para
   **GitHub Actions**.

A partir dai todo push na `main` roda os 97 testes e, passando, publica o site.
Se algum teste falhar, a versao no ar continua a anterior.
