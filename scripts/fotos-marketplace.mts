/**
 * Junta as fotos da loja: cada pasta `public/marketplace/<slug>/` vira a lista de fotos do
 * produto (ordem alfabetica: a primeira e a capa). Da capa sai a versao de card, menor
 * (`card/`, LARGURA_CARD px em WebP), gerada aqui quando falta ou ficou mais velha que a foto.
 * Recusa pasta de produto oculto ou que nao existe, para nao publicar foto de produto que nao
 * esta na loja.
 *   npx tsx scripts/fotos-marketplace.mts
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { PRODUTOS } from '../lib/marketplace/produtos';
import { podeAparecer } from '../lib/marketplace/consultas';

const raiz = 'public/marketplace';
/** O maior card da loja fica perto de 300 px de largura; 480 cobre tela de alta densidade. */
const LARGURA_CARD = 480;
const PASTA_CARD = 'card';
const fotos: Record<string, string[]> = {};
const capas: Record<string, string> = {};
const erros: string[] = [], avisos: string[] = [];
let geradas = 0;
for (const slug of fs.existsSync(raiz) ? fs.readdirSync(raiz).sort() : []) {
  const dir = path.join(raiz, slug);
  const entrada = fs.lstatSync(dir);
  if (slug === '.gitkeep' && entrada.isFile()) continue;
  if (!entrada.isDirectory()) { erros.push(`${slug}: somente pastas de produtos são permitidas`); continue; }
  const p = PRODUTOS.find((x) => x.slug === slug);
  if (!p) { erros.push(`${slug}: não há produto com esse slug`); continue; }
  if (!podeAparecer(p)) { erros.push(`${slug}: produto oculto — foto não publicada`); continue; }
  const imagens: string[] = [];
  for (const f of fs.readdirSync(dir).sort()) {
    const arquivo = fs.lstatSync(path.join(dir, f));
    if (f === PASTA_CARD && arquivo.isDirectory()) continue;
    if (!arquivo.isFile() || !/\.(jpe?g|png|webp|avif)$/i.test(f)) {
      erros.push(`${slug}/${f}: somente imagens JPG, PNG, WebP ou AVIF são permitidas`);
      continue;
    }
    const kb = arquivo.size / 1024;
    if (kb > 800) avisos.push(`${slug}/${f}: ${Math.round(kb)} KB (melhor abaixo de 800 KB para o site carregar rápido)`);
    imagens.push(f);
  }
  if (!imagens.length) continue;
  fotos[slug] = imagens.map((f) => `marketplace/${slug}/${f}`);
  // Versao de card da capa: so ela fica em card/ (a de foto que deixou de ser capa sai).
  const capa = imagens[0]!;
  const pastaCard = path.join(dir, PASTA_CARD);
  const nomeCard = `${path.parse(capa).name}.webp`;
  const origem = path.join(dir, capa), alvo = path.join(pastaCard, nomeCard);
  fs.mkdirSync(pastaCard, { recursive: true });
  for (const velho of fs.readdirSync(pastaCard)) if (velho !== nomeCard) fs.rmSync(path.join(pastaCard, velho), { recursive: true });
  if (!fs.existsSync(alvo) || fs.statSync(alvo).mtimeMs < fs.statSync(origem).mtimeMs) {
    await sharp(origem).resize({ width: LARGURA_CARD, withoutEnlargement: true }).webp({ quality: 78 }).toFile(alvo);
    geradas++;
  }
  capas[slug] = `marketplace/${slug}/${PASTA_CARD}/${nomeCard}`;
}
for (const a of avisos) console.log('aviso:', a);
for (const e of erros) console.log('ERRO:', e);
if (erros.length) process.exit(1);
const linhas = (r: Record<string, unknown>) => Object.entries(r).map(([s, l]) => `  ${JSON.stringify(s)}: ${JSON.stringify(l)},`).join('\n');
const bloco = (r: Record<string, unknown>) => (Object.keys(r).length ? `\n${linhas(r)}\n` : '');
const destino = 'lib/marketplace/fotos.ts';
const conteudo = `/**\n * Fotos da loja por produto. GERADO por \`npx tsx scripts/fotos-marketplace.mts\` a partir\n * de \`public/marketplace/<slug>/\` (nao editar a mao).\n */\nexport const FOTOS: Record<string, string[]> = {${bloco(fotos)}};\n\n/** Versao de card da capa (\`public/marketplace/<slug>/card/\`). */\nexport const CAPAS: Record<string, string> = {${bloco(capas)}};\n`;
if (!fs.existsSync(destino) || fs.readFileSync(destino, 'utf8') !== conteudo) fs.writeFileSync(destino, conteudo);
console.log(`${Object.keys(fotos).length} produto(s) com foto, ${Object.values(fotos).flat().length} foto(s), ${geradas} capa(s) de card gerada(s).`);
