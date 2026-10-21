/**
 * Acrescenta ao banco mockado (data/produtos.json) uma peca para cada gerador que ainda nao
 * tem. Nunca muda registro existente; rodar de novo sem gerador novo nao altera o arquivo.
 *   npm run banco:sincronizar
 */
import fs from 'fs';
import { FICHAS } from '../lib/gerador/receitas/fichas';
import { lerBanco, type RegistroProduto } from '../lib/marketplace/banco';
import { sincronizarBanco } from '../lib/marketplace/banco-sincronizar';

const ARQUIVO = 'data/produtos.json';
const atuais = JSON.parse(fs.readFileSync(ARQUIVO, 'utf8')) as RegistroProduto[];
const novos = sincronizarBanco(atuais, FICHAS);
lerBanco(novos);
if (novos.length === atuais.length) {
  console.log(`banco em dia: ${atuais.length} registros, todo gerador com peca`);
} else {
  fs.writeFileSync(ARQUIVO, `${JSON.stringify(novos, null, 2)}\n`);
  console.log(`banco: +${novos.length - atuais.length} pecas de gerador (revisar: true), ${novos.length} registros`);
  for (const r of novos.slice(atuais.length)) console.log(`  ${r.slug} -> ${r.secao}${r.visibilidade === 'oculto' ? ' (oculto)' : ''}`);
}
