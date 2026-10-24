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
import { rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { achatarPrefetch } from './achatar-prefetch.mjs';
import { avisarIndexNow, esperarNoAr, sitemapNoAr } from './indexnow.mjs';
import { comLastmod, conferirSaida, datarSitemap } from './seo-saida.mjs';

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
for (const s of ['verificar-ops', 'verificar-pdf', 'verificar-apoio', 'verificar-pecas', 'verificar-ai', 'verificar-mesa', 'verificar-arranjo', 'verificar-edicao', 'verificar-referencial', 'verificar-placa', 'verificar-selecao', 'verificar-relevo', 'verificar-placa-3d', 'verificar-gerador', 'verificar-seo']) {
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
// Sem o CNAME na gh-pages o Pages perde o dominio proprio a cada push -f.
if (!existsSync(`${SAIDA}/CNAME`)) throw new Error(`o build nao levou public/CNAME para ${SAIDA}`);
// Next 16 grava o pre-carregamento em pastas e o navegador pede o nome achatado (ver o script).
console.log(`     prefetch: ${achatarPrefetch(SAIDA)} copias com o nome que o navegador pede`);
// Trava de SEO: com erro (pagina do sitemap sem titulo, canonical errado, noindex, link
// quebrado...) nada vai para o ar. Detalhes em scripts/seo-saida.mjs.
const seo = conferirSaida(SAIDA);
for (const a of seo.avisos) console.log(`     aviso de SEO: ${a}`);
if (seo.erros.length) throw new Error(`SEO com erro, nada foi publicado:\n  ${seo.erros.join('\n  ')}`);
console.log(`     SEO: ${seo.urls.length} paginas conferidas, sem erro`);

console.log('\n4/4  enviando para o GitHub Pages');
// Compara com o que esta no ar: data de cada pagina no sitemap e o que avisar ao IndexNow.
const xmlNoAr = await sitemapNoAr();
const xmlGerado = readFileSync(`${SAIDA}/sitemap.xml`, 'utf8');
const { datas, novas, mudaram, removidas } = await datarSitemap({ pasta: SAIDA, xmlNovo: xmlGerado, xmlNoAr });
// Muita pagina saindo de uma vez costuma ser engano (pecas ocultadas sem querer).
if (removidas.length > 5 && process.env.PUBLICAR_REMOVER_PAGINAS !== '1') {
  throw new Error(`${removidas.length} paginas sairiam do site e do Google; nada foi publicado:\n  ${removidas.join('\n  ')}\nSe e isso mesmo, publique com a variavel PUBLICAR_REMOVER_PAGINAS=1`);
}
const xmlFinal = comLastmod(xmlGerado, datas);
writeFileSync(`${SAIDA}/sitemap.xml`, xmlFinal);
if (xmlNoAr) console.log(`     paginas: ${novas.length} nova(s), ${mudaram.length} alterada(s), ${removidas.length} removida(s)`);
else console.log('     nao deu para ler o site no ar: sitemap sai sem datas e nada e avisado ao IndexNow');
const git = (...args) => run('git', args, { cwd: SAIDA, stdio: ['inherit', 'pipe', 'pipe'] });
rmSync(`${SAIDA}/.git`, { recursive: true, force: true });
git('init', '-q', '-b', BRANCH);
git('add', '-A');
git('-c', 'user.name=Alejandro', '-c', 'user.email=alehscm@gmail.com', 'commit', '-q', '-m', 'Site gerado a partir de main');
git('remote', 'add', 'origin', REPO);
git('push', '-qf', 'origin', BRANCH);
rmSync(`${SAIDA}/.git`, { recursive: true, force: true });

console.log('\npronto: https://scarprint.com.br/');
console.log('(o GitHub leva cerca de um minuto para trocar a versao no ar)\n');

// Bing e cia. ficam sabendo na hora; o aviso so sai depois que a versao nova esta no ar.
const avisar = [...novas, ...mudaram, ...removidas];
if (xmlNoAr && !avisar.length) console.log('IndexNow: nenhuma pagina nova, alterada ou removida\n');
else if (avisar.length) {
  console.log(`IndexNow: esperando a versao nova no ar para avisar ${avisar.length} pagina(s)`);
  const comando = `node scripts/indexnow.mjs ${avisar.join(' ')}`;
  try {
    if (await esperarNoAr(xmlFinal)) console.log(`     resposta ${await avisarIndexNow(avisar)} (200/202 = recebido)\n`);
    else console.log(`     a versao nova nao apareceu em 10 min; avise depois com:\n     ${comando}\n`);
  } catch (e) {
    console.log(`     falhou (${e.message}); avise depois com:\n     ${comando}\n`);
  }
}
