import fs from 'node:fs';
import assert from 'node:assert/strict';

const css = fs.readFileSync('styles/marca.css', 'utf8').toLowerCase();
const layout = fs.readFileSync('app/layout.tsx', 'utf8');
const marca = fs.readFileSync('components/marca/index.tsx', 'utf8');
let total = 0;
function conferir(nome: string, teste: () => void) {
  teste();
  total++;
  console.log(`  ok    ${nome}`);
}

conferir('paleta institucional aprovada presente nos tokens', () => {
  for (const cor of ['2760a2', '18212e', '5e6061', 'c2c3c4', 'f7f8fa']) assert.ok(css.includes(`#${cor}`), cor);
});
const secoes = {
  casa: ['f3eee6', 'c8b79e', '8e7b66', '3f3933'],
  colecionaveis: ['eef2f0', '315c56', '547f78', '24312f'],
  empresa: ['eef2f5', '375a6d', '66859a', '253640'],
  presentes: ['f7efee', 'c68f89', 'a86e68', '493737'],
  sensoriais: ['eff3ec', '91a58a', '6f866a', '354234'],
};
for (const [secao, cores] of Object.entries(secoes)) {
  conferir(`paleta aprovada de ${secao}`, () => {
    const blocos = [...css.matchAll(new RegExp(`\\[data-(?:secao|universo)='${secao}'\\]\\s*\\{([^}]+)\\}`, 'g'))].map((m) => m[1]).join('\n');
    for (const cor of cores) assert.ok(blocos.includes(`#${cor}`), `${secao}: ${cor}`);
  });
}
conferir('Manrope e Inter, sem carregar as fontes de marca substituidas', () => {
  assert.match(layout, /Manrope/);
  assert.match(layout, /Inter/);
  assert.doesNotMatch(layout, /Bricolage_Grotesque|\bJost\b/);
});
for (const nome of ['completo', 'logotipo', 'simbolo', 'risco']) {
  conferir(`SVG ${nome} independente e enquadrado`, () => {
    const svg = fs.readFileSync(`public/marca/scarprint-${nome}.svg`, 'utf8');
    assert.match(svg, /<path\b/);
    assert.doesNotMatch(svg, /<image\b|<script\b|xlink:href|<!DOCTYPE|\bon\w+=/i);
    const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1];
    assert.ok(viewBox);
    assert.notEqual(viewBox, '0 0 21000 29700');
    const valores = viewBox.split(/\s+/).map(Number);
    assert.equal(valores.length, 4);
    assert.ok(valores.every(Number.isFinite) && valores[2]! > 0 && valores[3]! > 0);
  });
}
conferir('logo tem prefixo compativel com GitHub Pages', () => {
  assert.match(marca, /NEXT_PUBLIC_BASE/);
  assert.match(marca, /marca\/scarprint-logotipo\.svg/);
});
conferir('favicon usa o simbolo aprovado', () => {
  const favicon = fs.readFileSync('app/icon.svg', 'utf8');
  const simbolo = fs.readFileSync('public/marca/scarprint-simbolo.svg', 'utf8');
  const caminhos = (s: string) => [...s.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(caminhos(favicon), caminhos(simbolo));
});
conferir('secoes compartilham a mesma composicao, sem excecao para Casa', () => {
  const secao = fs.readFileSync('app/secao/[slug]/page.tsx', 'utf8');
  assert.doesNotMatch(secao, /PortalCasa|MonteCasa|slug\s*===\s*['"]casa['"]/);
  assert.equal((secao.match(/<Listagem\b/g) ?? []).length, 1);
  assert.match(secao, /key=\{slug\}/);
});
// Padrao das grandes lojas (aprovado em 2026-10-05): vitrines do mesmo bloco na home, sem
// carrossel automatico; o catalogo completo com filtros fica em /pecas.
conferir('home com vitrines do mesmo bloco, sem carrossel automatico; catalogo em /pecas', () => {
  const home = fs.readFileSync('features/marketplace/MarketplaceHome.tsx', 'utf8');
  assert.doesNotMatch(home, /BannerRotativo/);
  assert.doesNotMatch(home, /<Listagem\b/);
  assert.match(home, /<Prateleira\b/);
  const pecas = fs.readFileSync('app/pecas/page.tsx', 'utf8');
  assert.equal((pecas.match(/<Listagem\b/g) ?? []).length, 1);
});
conferir('fundo institucional da loja permanece igual entre secoes', () => {
  const estrutura = fs.readFileSync('components/loja/Estrutura.tsx', 'utf8');
  assert.doesNotMatch(estrutura, /data-universo=|bg-secao-pagina!/);
  assert.match(estrutura, /data-secao=\{secaoAtual\}/);
});
conferir('loja fluida sem teto central e grade com colunas automaticas', () => {
  const container = css.match(/@utility conteiner-loja\s*\{([^}]+)\}/)?.[1] ?? '';
  assert.match(container, /width:\s*100%/);
  assert.doesNotMatch(container, /max-width|margin-inline:\s*auto/);
  const lista = fs.readFileSync('components/loja/Listagem.tsx', 'utf8');
  assert.match(lista, /auto-fill,minmax\(220px,1fr\)/);
  for (const arquivo of ['features/marketplace/MarketplaceHome.tsx', 'app/secao/[slug]/page.tsx']) {
    assert.doesNotMatch(fs.readFileSync(arquivo, 'utf8'), /<Listagem[^>]*grade=/);
  }
});
conferir('areas de trabalho sem tetos centrais de 1800 ou 2400px', () => {
  for (const arquivo of ['components/casca/AppShell.tsx', 'features/placas/EditorPlacas.tsx', 'features/placas/GeradorPlaca3D.tsx']) {
    assert.doesNotMatch(fs.readFileSync(arquivo, 'utf8'), /max-w-\[(?:1800|2400)px\]/);
  }
});
console.log(`\n${total}/${total} verificacoes de identidade passaram.`);
