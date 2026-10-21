/**
 * Todo gerador vira peca da loja: o que ainda nao tem registro no banco ganha um, com os textos
 * da ficha e `revisar: true` (descricao, preco e fotos para preencher). Registro existente nunca
 * muda: rodar de novo nao altera nada. Usado por scripts/banco-produtos.mts e pelos testes.
 */
import { tipoDaFamilia } from '../../features/catalogo/catalogo';
import type { Ficha } from '../gerador/receitas/fichas';
import type { RegistroProduto } from './banco';
import type { Secao } from './tipos';

type Familia = Ficha['familia'];

/** Secao da loja pela familia do gerador. */
const SECAO_DA_FAMILIA: Record<Familia, Secao> = {
  multicor: 'presentes', chaveiros: 'presentes', cortadores: 'presentes', carimbos: 'presentes',
  qr: 'empresa', placas: 'empresa', texto: 'casa', parametricos: 'casa',
};

/** Onde a familia nao acerta a secao. */
const SECAO_DO_GERADOR: Record<string, Secao> = {
  'luminaria-social': 'empresa', 'social-com-qr': 'empresa', 'porta-pente': 'empresa',
  'imagem-multipartes': 'casa',
  'marcador-pagina': 'presentes', 'contador-raspadinha': 'presentes', 'rolo-textura': 'presentes', 'suporte-bolo': 'presentes',
};

/** Nada e anunciado como brinquedo (restricao legal): entra no banco oculto e sem esse tipo. */
const ehBrinquedo = (f: Ficha) => /brinquedo/i.test(f.tipo ?? '');

export function registroDaFicha(f: Ficha, slug: string): RegistroProduto {
  return {
    slug, nome: f.nome, tags: ['gerador'], gerador: f.id,
    secao: SECAO_DO_GERADOR[f.id] ?? SECAO_DA_FAMILIA[f.familia], tipo: (!ehBrinquedo(f) && f.tipo) || tipoDaFamilia[f.familia],
    resumo: f.resumo, descricao: f.resumo, personalizavel: [...f.destaques],
    preco: { status: 'validacao' }, midias: [], personalizar: null,
    origem: 'nosso', licenca: 'propria', visibilidade: ehBrinquedo(f) ? 'oculto' : 'publico',
    destaque: false, jaImpresso: false, campanha: null, ref: null, revisar: true,
  };
}

/** Banco + um registro novo por gerador sem peca (no fim, na ordem das fichas). */
export function sincronizarBanco(registros: RegistroProduto[], fichas: readonly Ficha[]): RegistroProduto[] {
  const comPeca = new Set(registros.map((r) => r.gerador).filter(Boolean));
  const slugs = new Set(registros.map((r) => r.slug));
  const novos = fichas.filter((f) => !comPeca.has(f.id)).map((f) => {
    let slug = f.id;
    for (let n = 2; slugs.has(slug); n++) slug = `${f.id}-${n}`;
    slugs.add(slug);
    return registroDaFicha(f, slug);
  });
  return [...registros, ...novos];
}
