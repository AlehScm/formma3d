import assert from 'node:assert/strict';
import type { StateStorage } from 'zustand/middleware';
import { criarStoreOrcamento, VERSAO_ORCAMENTO } from '../features/loja/estado';
import { rotuloPreco, textoDoPreco } from '../lib/marketplace/formato';
import { PRODUTOS } from '../lib/marketplace/produtos';

const dados = new Map<string, string>();
const storage: StateStorage = {
  getItem: (key) => dados.get(key) ?? null,
  setItem: (key, value) => { dados.set(key, value); },
  removeItem: (key) => { dados.delete(key); },
};

const store = criarStoreOrcamento(storage);
store.getState().adicionar('placa', { quantidade: 2, cor: ' Azul ', observacao: 'Nome  Ana ' });
store.getState().adicionar('placa', { quantidade: 3, cor: 'Azul', observacao: 'Nome  Ana' });
store.getState().adicionar('placa', { cor: 'Vermelho', observacao: 'Nome  Ana' });
store.getState().adicionar('placa', { cor: 'Azul', observacao: 'Nome Bia' });

let itens = store.getState().itens;
assert.equal(itens.length, 3, 'mesmo produto com cor ou observacao diferente fica em outra linha');
assert.equal(itens.reduce((soma, item) => soma + item.quantidade, 0), 7, 'a soma das quantidades combina apenas configuracoes iguais');
assert.equal(itens[0]!.quantidade, 5);
assert.equal(itens[0]!.cor, 'Azul', 'remove apenas whitespace externo');
assert.equal(itens[0]!.observacao, 'Nome  Ana', 'preserva whitespace interno da observacao');
assert.equal(new Set(itens.map((item) => item.id)).size, 3, 'cada linha tem id estavel proprio');

const [azulAna, vermelhaAna, azulBia] = itens;
store.getState().alterar(azulAna!.id, { quantidade: 1000, observacao: 'Texto atualizado  aqui' });
itens = store.getState().itens;
assert.equal(itens.find((item) => item.id === azulAna!.id)?.quantidade, 999, 'quantidade editada respeita limite superior');
assert.equal(itens.find((item) => item.id === azulAna!.id)?.observacao, 'Texto atualizado  aqui');
assert.equal(itens.find((item) => item.id === vermelhaAna!.id)?.cor, 'Vermelho', 'edicao nao altera outra linha do produto');
store.getState().alterar(azulAna!.id, { quantidade: 0 });
assert.equal(store.getState().itens.find((item) => item.id === azulAna!.id)?.quantidade, 1, 'quantidade editada respeita limite inferior');
store.getState().remover(vermelhaAna!.id);
assert.deepEqual(store.getState().itens.map((item) => item.id), [azulAna!.id, azulBia!.id], 'remocao remove somente a linha indicada');

const chave = 'scarprint:orcamento:v1';
dados.set(chave, JSON.stringify({
  state: { itens: [
    { slug: 'placa', quantidade: 2, cor: 'Azul', observacao: 'Ana' },
    { slug: 'placa', quantidade: 4, cor: 'Vermelho', observacao: 'Bia' },
    { slug: 'placa', quantidade: -3, cor: 12, observacao: { texto: 'inválido' } },
  ] },
  version: 0,
}));
const hidratado = criarStoreOrcamento(storage);
await hidratado.persist.rehydrate();
const legados = hidratado.getState().itens;
assert.equal(legados.length, 3, 'hidratacao preserva linhas legadas com configuracoes distintas');
assert.equal(legados[0]!.cor, 'Azul');
assert.equal(legados[1]!.cor, 'Vermelho');
assert.ok(legados.every((item) => !!item.id), 'migracao atribui id as linhas antigas');
assert.equal(legados[2]!.quantidade, 1, 'migracao limita quantidade antiga');
assert.equal(legados[2]!.cor, '', 'migracao ignora cor antiga com tipo invalido');
assert.equal(legados[2]!.observacao, '', 'migracao ignora observacao antiga com tipo invalido');
assert.equal(hidratado.persist.getOptions().version, VERSAO_ORCAMENTO);

const roundtrip = criarStoreOrcamento(storage);
await roundtrip.persist.rehydrate();
assert.deepEqual(roundtrip.getState().itens, legados, 'persistencia e hidratacao preservam as linhas e seus ids');

const produtoTeste = { ...PRODUTOS[0]!, preco: { status: 'definido' as const, valor: 12.5 } };
assert.equal(textoDoPreco(PRODUTOS[0]!), 'Preço em validação', 'rotulo geral de validacao permanece igual');
assert.equal(rotuloPreco(PRODUTOS[0]!), 'Preço sob consulta', 'loja usa seu rotulo de validacao');
assert.equal(textoDoPreco(produtoTeste), 'R$ 12,50', 'preco definido continua formatado em BRL');
assert.equal(rotuloPreco(produtoTeste), 'R$ 12,50', 'rotulo da loja reutiliza a formatacao BRL');

console.log('Orcamento: configuracoes, ids, edicao, limites, migracao e roundtrip passaram.');
