/**
 * Pre-carregamento das paginas no export estatico (Next 16): o build grava os dados de cada
 * pagina em pastas (`natal/__next.natal/__PAGE__.txt`), mas o navegador pede o mesmo arquivo
 * com o caminho achatado em pontos (`natal/__next.natal.__PAGE__.txt`). No GitHub Pages isso
 * dava 404 em todo link (o link funcionava, so que sem pre-carregar). Aqui cada arquivo ganha
 * uma copia no nome que o navegador pede.
 *   node scripts/achatar-prefetch.mjs [pasta]   (padrao: out)
 */
import { copyFileSync, existsSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export function achatarPrefetch(raiz = 'out') {
  let copias = 0;
  const andar = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (!e.isDirectory()) continue;
      if (e.name.startsWith('__next.')) {
        // todos os .txt dentro desta pasta __next.<segmento>/..., achatados no pai dela
        const dentro = (d) => readdirSync(d, { withFileTypes: true }).flatMap((f) => (f.isDirectory() ? dentro(join(d, f.name)) : f.name.endsWith('.txt') ? [join(d, f.name)] : []));
        for (const arquivo of dentro(p)) {
          const plano = join(dir, relative(dir, arquivo).split(sep).join('.'));
          if (!existsSync(plano)) { copyFileSync(arquivo, plano); copias++; }
        }
      } else andar(p);
    }
  };
  andar(raiz);
  return copias;
}

if (process.argv[1]?.endsWith('achatar-prefetch.mjs')) {
  console.log(`prefetch: ${achatarPrefetch(process.argv[2] ?? 'out')} copias com o nome achatado`);
}
