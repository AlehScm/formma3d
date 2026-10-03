/**
 * Contato da loja pelo WhatsApp: link com a mensagem pronta. Sem numero configurado o
 * link e `null` e o botao mostra "em breve". So o texto do pedido vai na URL.
 */
import type { Produto } from './tipos';

export const CONTATO = {
  /** So digitos, com DDI e DDD (ex.: 5519999999999). Vazio ate o usuario passar o numero. */
  whatsapp: '',
};

export function linkWhatsapp(mensagem: string, numero = CONTATO.whatsapp): string | null {
  const n = numero.replace(/\D/g, '');
  if (n.length < 10) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(mensagem)}`;
}

export const MENSAGENS = {
  produto: (p: Produto) => `Olá, Scarprint! Quero um orçamento de: ${p.nome}.`,
  arquivo: () => 'Olá, Scarprint! Tenho um arquivo 3D (ou uma ideia) e quero um orçamento de impressão.',
  apoiador: () => 'Olá, Scarprint! Quero saber como ser apoiador e usar os geradores de vocês.',
  geral: () => 'Olá, Scarprint! Vim pelo site.',
  /** Lista do carrinho de orcamento, uma linha por peca. */
  orcamento: (linhas: { nome: string; quantidade: number; cor?: string; observacao?: string }[]) =>
    ['Olá, Scarprint! Quero um orçamento destas peças:', ...linhas.map((l, i) => {
      const extras = [l.cor?.trim() && `cor: ${l.cor.trim()}`, l.observacao?.trim() && `obs.: ${l.observacao.trim()}`].filter(Boolean).join('; ');
      return `${i + 1}. ${l.nome} (${l.quantidade} un.)${extras ? ` - ${extras}` : ''}`;
    })].join('\n'),
};
