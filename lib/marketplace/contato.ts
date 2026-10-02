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
};
