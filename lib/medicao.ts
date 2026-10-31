/**
 * Medicao do Google Ads (e do Analytics, se tiver). Os IDs sao publicos, nao segredo: vazio =
 * nenhum script de fora carrega e `medir` nao faz nada. So liga no site publicado (no dev o
 * SITE_URL e localhost), para teste local nao contar como conversao.
 */
import { SITE_URL } from './seo';

export type Acao = 'whatsapp' | 'orcamento';

export const GOOGLE = {
  /** Conta do Google Ads ("AW-123456789"). */
  ads: 'AW-18545269296',
  /** Rotulo de cada conversao criada no Ads (o que vem depois da barra em "AW-123456789/rotulo"). Vazio = a acao nao conta. */
  conversoes: { whatsapp: 'o5ALCPrsxa8dELC0iYtF', orcamento: 'TEiFCP3sxa8dELC0iYtF' } satisfies Record<Acao, string>,
  /** Google Analytics 4 ("G-XXXXXXXXXX"). Opcional. */
  analytics: '',
};

/** Evento do Analytics para cada acao (nomes recomendados do GA4). */
const EVENTO_GA: Record<Acao, string> = { whatsapp: 'generate_lead', orcamento: 'add_to_cart' };

export const tagsDoGoogle = () => [GOOGLE.ads, GOOGLE.analytics].filter(Boolean);

export const medicaoLigada = (site = SITE_URL) => tagsDoGoogle().length > 0 && site.startsWith('https://');

type Gtag = (...args: unknown[]) => void;

/** Conversao no Ads e evento no Analytics. Sem a tag carregada (dev, IDs vazios, Node), nada. */
export function medir(acao: Acao): void {
  const gtag = typeof window === 'undefined' ? undefined : (window as Window & { gtag?: Gtag }).gtag;
  if (!gtag) return;
  const rotulo = GOOGLE.conversoes[acao];
  if (GOOGLE.ads && rotulo) gtag('event', 'conversion', { send_to: `${GOOGLE.ads}/${rotulo}` });
  if (GOOGLE.analytics) gtag('event', EVENTO_GA[acao], { send_to: GOOGLE.analytics });
}
