import type { Receita, Valores } from './tipos';

export interface SnapshotModelo {
  versao: 1;
  receita: string;
  valores: Valores;
}

export const LIMITE_HANDOFF = 16 * 1024;
const ORIGEM_INTERNA = 'https://handoff.invalid';

function validarSnapshot(entrada: unknown, schema?: Receita): SnapshotModelo {
  if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) throw new Error('Configuração inválida.');
  const bruto = entrada as Record<string, unknown>;
  if (bruto.versao !== 1) throw new Error('Esta configuração usa uma versão incompatível.');
  if (typeof bruto.receita !== 'string' || !bruto.receita) throw new Error('Configuração sem gerador.');
  if (schema && bruto.receita !== schema.id) throw new Error('O gerador não corresponde a esta configuração.');
  if (!bruto.valores || typeof bruto.valores !== 'object' || Array.isArray(bruto.valores)) throw new Error('Valores de configuração inválidos.');

  const campos = new Map(schema?.parametros.map((p) => [p.id, p]));
  const valores: Valores = {};
  for (const [id, valor] of Object.entries(bruto.valores as Record<string, unknown>)) {
    if (id === '__proto__' || id === 'constructor' || id === 'prototype') throw new Error('A configuração contém um campo inválido.');
    if (!(typeof valor === 'string' || typeof valor === 'boolean' || (typeof valor === 'number' && Number.isFinite(valor)))) {
      throw new Error(`Valor inválido para ${id}.`);
    }
    const campo = campos.get(id);
    if (campo?.tipo === 'numero' && typeof valor !== 'number') throw new Error(`Valor inválido para ${campo.rotulo}.`);
    if (campo?.tipo === 'liga' && typeof valor !== 'boolean') throw new Error(`Valor inválido para ${campo.rotulo}.`);
    if (campo && campo.tipo !== 'numero' && campo.tipo !== 'liga' && typeof valor !== 'string') throw new Error(`Valor inválido para ${campo.rotulo}.`);
    if (campo?.tipo === 'svg' && valor !== '') throw new Error('Imagens SVG não podem ser enviadas por este link.');
    valores[id] = valor;
  }
  return { versao: 1, receita: bruto.receita, valores };
}

export function codificarSnapshotModelo(snapshot: SnapshotModelo, schema?: Receita): string {
  const json = JSON.stringify(validarSnapshot(snapshot, schema));
  let codificado: string;
  try {
    codificado = encodeURIComponent(json);
  } catch {
    throw new Error('Não foi possível preparar esta configuração para o link.');
  }
  if (codificado.length > LIMITE_HANDOFF) throw new Error('A configuração é grande demais para abrir pelo link.');
  return codificado;
}

/** Ausência de config significa usar o fluxo antigo; conteúdo presente deve ser válido. */
export function decodificarSnapshotModelo(codificado: string | null, receitaEsperada?: string, schema?: Receita): SnapshotModelo | null {
  if (codificado === null) return null;
  if (codificado.length > LIMITE_HANDOFF) throw new Error('A configuração é grande demais para abrir pelo link.');
  let json: string;
  try {
    json = decodeURIComponent(codificado);
  } catch {
    throw new Error('O link contém uma configuração inválida.');
  }
  let entrada: unknown;
  try {
    entrada = JSON.parse(json);
  } catch {
    throw new Error('O link contém uma configuração inválida.');
  }
  const snapshot = validarSnapshot(entrada, schema);
  if (receitaEsperada && snapshot.receita !== receitaEsperada) throw new Error('O gerador não corresponde a esta configuração.');
  return snapshot;
}

function semBase(pathname: string, basePath: string): string {
  const base = basePath.replace(/\/+$/, '');
  if (!base) return pathname || '/';
  if (pathname === base) return '/';
  return pathname.startsWith(`${base}/`) ? pathname.slice(base.length) : pathname;
}

function idDaRota(pathname: string): string | null {
  const match = pathname.match(/^\/(?:moldes|design)\/([^/]+)\/?$/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]!);
  } catch {
    throw new Error('O link do gerador é inválido.');
  }
}

/** Cria um href interno; NextLink acrescenta basePath na navegação/exportação Pages. */
export function hrefComSnapshotModelo(href: string, snapshot: SnapshotModelo, basePath = '', schema?: Receita): string {
  if (!href.startsWith('/') || href.startsWith('//') || href.includes('\\')) throw new Error('Este destino não é um link interno compatível com o gerador.');
  let url: URL;
  try {
    url = new URL(href, ORIGEM_INTERNA);
  } catch {
    throw new Error('O link do gerador é inválido.');
  }
  if (url.origin !== ORIGEM_INTERNA) throw new Error('Este destino não é um link interno compatível com o gerador.');
  const pathname = semBase(url.pathname, basePath);
  const idRota = idDaRota(pathname);
  if (pathname !== '/design' && pathname !== '/design/' && !idRota) throw new Error('Este editor não aceita configurações da loja.');
  const config = validarSnapshot(snapshot, schema);
  const parametros = url.searchParams;
  const modelos = parametros.getAll('modelo');
  if (modelos.length > 1 || (modelos[0] && modelos[0] !== config.receita) || (idRota && idRota !== config.receita)) {
    throw new Error('O gerador do link não corresponde à configuração.');
  }
  parametros.delete('config');
  parametros.set('modelo', config.receita);
  const anterior = url.hash.slice(1);
  const fragmento = `config=${codificarSnapshotModelo(config, schema)}${anterior ? `&__from=${encodeURIComponent(anterior)}` : ''}`;
  return `/design${url.search}#${fragmento}`;
}

/** Reconhece as rotas antigas ao abrir o editor, inclusive quando o site usa basePath. */
export function modeloDaRotaEditor(pathname: string, basePath = ''): string | null {
  const path = semBase(pathname, basePath);
  if (path === '/design' || path === '/design/') return null;
  return idDaRota(path);
}

export function configDoFragmento(hash: string): { presente: boolean; codificado: string | null } {
  const parametros = new URLSearchParams(hash.replace(/^#/, ''));
  const configs = parametros.getAll('config');
  if (configs.length > 1) throw new Error('O link contém configurações duplicadas.');
  return { presente: configs.length === 1, codificado: configs.length ? encodeURIComponent(configs[0]!) : null };
}

/** Remove só o snapshot de handoff e recupera o fragmento que o link já tinha. */
export function fragmentoAposHandoff(hash: string): string {
  const parametros = new URLSearchParams(hash.replace(/^#/, ''));
  const anterior = parametros.get('__from');
  parametros.delete('config');
  parametros.delete('__from');
  if (anterior !== null) return anterior ? `#${anterior}` : '';
  const restante = parametros.toString();
  return restante ? `#${restante}` : '';
}
