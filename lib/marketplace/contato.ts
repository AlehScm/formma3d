/**
 * Contato da loja pelo WhatsApp: link com a mensagem pronta. Sem numero configurado o
 * link e `null` e o botao mostra "em breve". So o texto do pedido vai na URL.
 */
import type { Produto } from './tipos';

export const CONTATO = {
  /** So digitos, com DDI e DDD. Vazio = botao "em breve". */
  whatsapp: '5519997848348',
  /** Como aparece para o cliente. */
  whatsappTexto: '(19) 99784-8348',
  /** Quanto a loja demora para responder (ex.: "em até 1 dia útil"). Vazio = nao aparece. */
  prazoResposta: '',
};

/**
 * Quem vende, no rodape e nas politicas (o Google Ads confere se a loja se identifica).
 * Vazio = nao aparece.
 */
export const EMPRESA = {
  /** Razao social ou nome empresarial do MEI. */
  razaoSocial: '',
  /** So digitos. */
  cnpj: '',
  /** De onde saem os pedidos ("Campinas - SP"). */
  cidade: 'Campinas - SP',
  email: '',
};

/** "12345678000190" -> "12.345.678/0001-90"; fora do formato, como veio. */
export const formatarCnpj = (cnpj: string) => cnpj.replace(/\D/g, '').replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');

/** "Razao · CNPJ 00.000.000/0000-00 · Cidade", so o que estiver preenchido. */
export const identificacaoEmpresa = (e = EMPRESA) =>
  [e.razaoSocial.trim(), e.cnpj.trim() && `CNPJ ${formatarCnpj(e.cnpj)}`, e.cidade.trim()].filter(Boolean).join(' · ');

/** "Respondemos pelo WhatsApp[ em ate X]." */
export const textoResposta = (prazo = CONTATO.prazoResposta) => `Respondemos pelo WhatsApp${prazo.trim() ? ` ${prazo.trim()}` : ''}.`;

export function linkWhatsapp(mensagem: string, numero = CONTATO.whatsapp): string | null {
  const n = numero.replace(/\D/g, '');
  if (n.length < 10) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(mensagem)}`;
}

export const MENSAGENS = {
  produto: (p: Produto) => `Olá, Scarprint! Quero um orçamento de: ${p.nome}.`,
  arquivo: () =>'Olá, Scarprint! Tenho um arquivo 3D (ou uma ideia) e quero um orçamento de impressão.',
  apoiador: () => 'Olá, Scarprint! Quero saber como ser apoiador e usar os geradores de vocês.',
  geral: () => 'Olá, Scarprint! Vim pelo site.',
  letraCaixa: () => 'Olá, Scarprint! Quero um orçamento de letra caixa em 3D.',
  troca: () => 'Olá, Scarprint! Quero falar sobre a troca ou devolução de um pedido.',
  dados: () => 'Olá, Scarprint! Quero falar sobre os meus dados pessoais.',
  /** Letreiro montado no editor: a descricao vem pronta, sem valor. */
  letreiro: (descricao: string) => `Olá, Scarprint! Quero um orçamento deste letreiro:\n${descricao}`,
  /** Lista do carrinho de orcamento, uma linha por peca. */
  orcamento: (linhas: { nome: string; quantidade: number; cor?: string; observacao?: string; personalizacao?: string }[]) =>
    ['Olá, Scarprint! Quero um orçamento destas peças:', ...linhas.map((l, i) => {
      const extras = [l.personalizacao?.trim() && `personalização: ${l.personalizacao.trim()}`, l.cor?.trim() && `cor: ${l.cor.trim()}`, l.observacao?.trim() && `obs.: ${l.observacao.trim()}`].filter(Boolean).join('; ');
      return `${i + 1}. ${l.nome} (${l.quantidade} un.)${extras ? ` - ${extras}` : ''}`;
    })].join('\n'),
};
