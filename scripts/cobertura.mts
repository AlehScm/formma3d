/** Escreve docs/cobertura-117.md a partir de lib/gerador/cobertura.ts.  npx tsx scripts/cobertura.mts */
import fs from 'fs';
import { markdownCobertura } from '../lib/gerador/cobertura';

fs.writeFileSync('docs/cobertura-117.md', markdownCobertura());
console.log('docs/cobertura-117.md atualizado');
