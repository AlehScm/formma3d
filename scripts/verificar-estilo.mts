/**
 * Trava do design system: o site e todo em Tailwind sobre os tokens (styles/tokens.css,
 * tema escuro do app; styles/marca.css, tema claro da marca e cores filhas das secoes).
 *   - CSS so em app/globals.css e styles/ (tokens); fora disso, so as PENDENCIAS listadas;
 *   - nenhuma cor hex em codigo de interface, fora das excecoes com motivo;
 *   - nenhuma cor arbitraria em classe Tailwind (bg-[#...], text-[#...]...);
 *   - `style={{}}` so com valor de execucao (variavel, conta, dado), nunca literal fixo.
 * Uma pendencia migrada deve sair da lista (o teste avisa quando sobra entrada a toa).
 *   npx tsx scripts/verificar-estilo.mts
 */
import fs from 'fs';
import path from 'path';

let falhas = 0, total = 0;
const ok = (nome: string, cond: boolean, detalhe = '') => {
  total++;
  if (!cond) falhas++;
  console.log(`${cond ? '  ok   ' : ' FALHA '} ${nome}${detalhe ? `  -> ${detalhe}` : ''}`);
};

const PASTAS = ['app', 'components', 'features'];
const arquivos = (ext: RegExp) => {
  const out: string[] = [];
  const andar = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.posix.join(d, e.name);
      if (e.isDirectory()) andar(p);
      else if (ext.test(e.name)) out.push(p);
    }
  };
  PASTAS.forEach(andar);
  return out.sort();
};

/** CSS permitido: base e tokens. */
const CSS_PERMITIDO = new Set(['app/globals.css']);
const CSS_EXCECAO: Record<string, string> = {
  'components/catalogo/catalogo.css': 'ilustracoes e composicoes especificas das miniaturas do catalogo',
};
/** Ainda a migrar para Tailwind (dono e motivo). Sai daqui ao migrar. */
const CSS_PENDENTE: Record<string, string> = {
};

/** Hex permitido em codigo: nao e estilo de interface (motivo). */
const HEX_EXCECAO: Record<string, string> = {
  'components/Viewer3D.tsx': 'cores da cena 3D (WebGL), não CSS',
  'features/gerador/PreviaGerador.tsx': 'fundo da cena 3D (WebGL)',
  'features/placas/model.ts': 'cor padrão dos dados da placa',
  'features/placas/exportSvg.ts': 'cores no SVG exportado (arquivo do usuário)',
  'features/placas/GeradorPlaca3D.tsx': 'cores dos materiais e fundo da cena 3D (WebGL), nao CSS',
  'app/sistema/page.tsx': 'valor de reserva ao ler o token na vitrine',
};
const HEX_PENDENTE: Record<string, string> = {
};
/** Cor arbitraria no Tailwind ainda a migrar. */
const ARBITRARIA_PENDENTE: Record<string, string> = {};
/** `style={{}}` literal ainda a migrar. */
const ESTILO_PENDENTE: Record<string, string> = {};

// 1. Arquivos CSS
const css = arquivos(/\.css$/);
const cssFora = css.filter((f) => !CSS_PERMITIDO.has(f) && !(f in CSS_EXCECAO) && !(f in CSS_PENDENTE));
ok('CSS só em globals.css e styles/ (fora as pendências listadas)', !cssFora.length, cssFora.join(', '));
ok('tokens nos arquivos de tema', fs.existsSync('styles/tokens.css') && fs.existsSync('styles/marca.css'));
const cssSobra = Object.keys(CSS_PENDENTE).filter((f) => !css.includes(f));
// Com trabalho em paralelo, a lista pode adiantar um arquivo que ainda nao chegou ao main: so avisa.
if (cssSobra.length) console.log(`  aviso  CSS pendente listado que não existe (já migrado? tire da lista): ${cssSobra.join(', ')}`);

// 2. Hex em codigo
const codigo = arquivos(/\.(tsx|ts)$/);
const comHex = codigo.filter((f) => /#[0-9a-fA-F]{6}\b|['"`]#[0-9a-fA-F]{3}['"`]/.test(fs.readFileSync(f, 'utf8')));
const hexFora = comHex.filter((f) => !(f in HEX_EXCECAO) && !(f in HEX_PENDENTE));
ok('nenhuma cor hex em código de interface (fora exceções com motivo)', !hexFora.length, hexFora.join(', '));
const hexSobra = Object.keys(HEX_PENDENTE).filter((f) => !comHex.includes(f));
if (hexSobra.length) console.log(`  aviso  hex pendente listado sem hex (já migrado? tire da lista): ${hexSobra.join(', ')}`);

// 3. Cor arbitraria no Tailwind
const arbitraria = codigo.filter((f) => !(f in ARBITRARIA_PENDENTE) && /\b(bg|text|border|fill|stroke|ring|from|via|to|outline|decoration|accent|caret|shadow)-\[#/.test(fs.readFileSync(f, 'utf8')));
ok('nenhuma cor arbitrária em classe Tailwind (bg-[#...])', !arbitraria.length, arbitraria.join(', '));

// 4. style={{}} so com valor de execucao
const literal = /^\s*(['"][^'"]*['"]|-?\d+(\.\d+)?|true|false)\s*$/;
const estiloFixo: string[] = [];
for (const f of codigo) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/style=\{\{([^}]*)\}\}/g)) {
    const valores = m[1]!.split(/,(?![^(]*\))/).map((par) => par.split(':').slice(1).join(':')).filter((v) => v.trim());
    if (valores.length && valores.every((v) => literal.test(v))) estiloFixo.push(`${f}: style={{${m[1]!.trim()}}}`);
  }
}
const estiloFora = estiloFixo.filter((e) => !(e.split(':')[0]! in ESTILO_PENDENTE));
ok('style={{}} só com valor de execução (nada fixo inline)', !estiloFora.length, estiloFora.join(' | '));

const pendentes = [...Object.entries(CSS_PENDENTE), ...Object.entries(HEX_PENDENTE), ...Object.entries(ARBITRARIA_PENDENTE)];
console.log(`\nPendências de migração (${pendentes.length}):`);
for (const [f, motivo] of pendentes) console.log(`  - ${f}: ${motivo}`);
console.log(`\n${total - falhas}/${total} passaram\n`);
if (falhas) process.exit(1);
