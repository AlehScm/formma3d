#!/usr/bin/env node
/**
 * Publica o site no GitHub Pages.
 *   npm run publicar
 *
 * Gera o site estatico e envia a pasta `.publicar/` para a branch `gh-pages`, que e de
 * onde o Pages serve. Nao precisa do escopo `workflow` no token -- por isso este
 * caminho existe. Com `gh auth refresh -s workflow` da para usar o
 * .github/workflows/deploy.yml, que publica sozinho a cada push.
 */
import { execFileSync } from 'node:child_process';
import { rmSync, existsSync } from 'node:fs';
import { achatarPrefetch } from './achatar-prefetch.mjs';

const REPO = 'https://github.com/AlehScm/formma3d.git';
const BRANCH = 'gh-pages';
/** Pasta do site gerado (fora do .next do dev). */
const SAIDA = '.publicar';

// Chamamos o entrypoint .js de cada ferramenta com o proprio node, em vez de `npx`.
// No Windows o npx e um .cmd, e o Node se recusa a executar .cmd sem shell desde a
// correcao do CVE-2024-27980 -- isso evita depender de shell.
const BIN = {
  tsc: 'node_modules/typescript/bin/tsc',
  tsx: 'node_modules/tsx/dist/cli.mjs',
  next: 'node_modules/next/dist/bin/next',
};

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });
const node = (bin, args = [], opts = {}) => run(process.execPath, [bin, ...args], opts);

console.log('\n1/4  conferindo tipos');
node(BIN.tsx, ['scripts/fotos-marketplace.mts']);
node(BIN.tsc, ['--noEmit']);

console.log('\n2/4  rodando os testes');
for (const s of ['verificar-ops', 'verificar-pdf', 'verificar-apoio', 'verificar-pecas', 'verificar-ai', 'verificar-mesa', 'verificar-arranjo', 'verificar-edicao', 'verificar-referencial', 'verificar-placa', 'verificar-selecao', 'verificar-relevo', 'verificar-placas-2d', 'verificar-placa-3d', 'verificar-placa-texto', 'verificar-placa-zip', 'verificar-gerador']) {
  const saida = execFileSync(process.execPath, [BIN.tsx, `scripts/${s}.mts`], { encoding: 'utf8' });
  const placar = saida.trim().split('\n').filter((l) => l.includes('passaram')).pop() ?? 'ok';
  console.log(`     ${s.padEnd(16)} ${placar.trim()}`);
}

console.log('\n3/4  gerando o site');
// Build numa pasta propria (nao no .next): rodar junto com o `next dev` no .next travava o
// cache do dev (Turbopack nao conseguia mais abrir o processo do CSS ate apagar .next/dev).
rmSync(SAIDA, { recursive: true, force: true });
node(BIN.next, ['build'], { env: { ...process.env, GITHUB_PAGES: 'true', FORMMA_BUILD_DIR: SAIDA } });
if (!existsSync(`${SAIDA}/index.html`)) throw new Error(`o build nao gerou ${SAIDA}/index.html`);
// Next 16 grava o pre-carregamento em pastas e o navegador pede o nome achatado (ver o script).
console.log(`     prefetch: ${achatarPrefetch(SAIDA)} copias com o nome que o navegador pede`);

console.log('\n4/4  enviando para o GitHub Pages');
const git = (...args) => run('git', args, { cwd: SAIDA, stdio: ['inherit', 'pipe', 'pipe'] });
rmSync(`${SAIDA}/.git`, { recursive: true, force: true });
git('init', '-q', '-b', BRANCH);
git('add', '-A');
git('-c', 'user.name=Alejandro', '-c', 'user.email=alehscm@gmail.com', 'commit', '-q', '-m', 'Site gerado a partir de main');
git('remote', 'add', 'origin', REPO);
git('push', '-qf', 'origin', BRANCH);
rmSync(`${SAIDA}/.git`, { recursive: true, force: true });

console.log('\npronto: https://alehscm.github.io/formma3d/');
console.log('(o GitHub leva cerca de um minuto para trocar a versao no ar)\n');
