import { readFile } from 'node:fs/promises';
import { prepararExemplo, prepararModelo } from '../lib/gerador/exemplo';
import { coletarFontes, resolverValores } from '../lib/gerador/configuracao';
import { RECEITAS, receitaPorId } from '../lib/gerador/receitas';
import { ficha } from '../lib/gerador/receitas/fichas';
import { valoresPadrao, type Receita, type Valores } from '../lib/gerador/tipos';

let total = 0;
const conferir = (condicao: boolean, mensagem: string) => {
  total++;
  if (!condicao) throw new Error(`Falhou: ${mensagem}`);
};

const chaveiro = receitaPorId('chaveiro-nome')!;
const padrao = prepararModelo(chaveiro.id, { base: 'padrao' });
const exemplo = prepararModelo(chaveiro.id, { base: 'exemplo' });
conferir(padrao.valores.nomes !== exemplo.valores.nomes, 'base padrao e base exemplo continuam distintas');
conferir(JSON.stringify(prepararExemplo(chaveiro.id).valores) === JSON.stringify(exemplo.valores), 'wrapper e base exemplo são compatíveis');
for (const receita of RECEITAS) {
  const legado = { ...valoresPadrao(receita), ...(ficha(receita.id).exemplo ?? {}) };
  const atual = prepararExemplo(receita.id).valores;
  conferir(JSON.stringify(atual) === JSON.stringify(legado), `valores do exemplo legado preservados: ${receita.id}`);
}

const editado = prepararModelo(chaveiro.id, {
  base: 'exemplo',
  extras: { nomes: 'Lia😀', fonte: 'pacifico', altura: 999, corBase: 'vermelho', argola: 'invalida', posicoesArgola: JSON.stringify({ Lia: { x: 2, y: -1 } }) },
});
conferir(editado.valores.nomes === 'Lia😀', 'extras prevalecem sobre o exemplo');
conferir(editado.valores.altura === chaveiro.parametros.find((p) => p.id === 'altura')?.max, 'número é limitado ao intervalo');
conferir(editado.valores.corBase === chaveiro.parametros.find((p) => p.id === 'corBase')?.padrao, 'cor inválida volta ao padrão');
conferir(editado.valores.argola === chaveiro.parametros.find((p) => p.id === 'argola')?.padrao, 'escolha inválida volta ao padrão');
conferir(editado.valores.posicoesArgola === JSON.stringify({ Lia: { x: 2, y: -1 } }), 'extensões fora dos parâmetros preservam o formato JSON');
conferir(editado.idsFonte.includes('noto-emoji'), 'fonte extra de emoji acompanha os valores finais');
conferir(new Set(editado.idsFonte).size === editado.idsFonte.length, 'fontes são deduplicadas');

const receitaFontes: Receita = {
  id: 'teste-fontes', nome: 'Teste', familia: 'teste', resumo: '',
  parametros: [
    { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte', padrao: 'fonte-a' },
    { tipo: 'fonte', id: 'fonteOculta', rotulo: 'Fonte oculta', padrao: 'fonte-b', visivel: (v) => v.mostrar === true },
  ],
  gerar: () => ({ itens: [], cores: [], avisos: [] }),
  fontes: (v) => [String(v.fonte), 'fonte-extra'],
};
conferir(JSON.stringify(coletarFontes(receitaFontes, { fonte: 'fonte-a', fonteOculta: 'fonte-b', mostrar: false })) === JSON.stringify(['fonte-a', 'fonte-extra']), 'coletor usa fontes finais visíveis e deduplica extras da receita');
conferir(JSON.stringify(resolverValores(receitaFontes, { fonte: 'fonte-c' }, { fonte: 'fonte-d' }).fonte) === JSON.stringify('fonte-d'), 'extras têm precedência sobre o exemplo');

const fonteConfig = await readFile(new URL('../lib/gerador/configuracao.ts', import.meta.url), 'utf8');
conferir(!/from ['"].*(?:receitas|fichas)/.test(fonteConfig), 'configuração não importa registro nem fichas');

console.log(`${total}/${total} verificações de configuração de modelo passaram`);
