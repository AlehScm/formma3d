import { respostaDaLista } from '@/lib/marketplace/api/contrato';
import { ehSecao, porSecao } from '@/lib/marketplace/consultas';
import { ORDEM_SECOES } from '@/lib/marketplace/tipos';

// GET /api/secoes/<secao>/produtos.json: um arquivo estatico por secao no build.
export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return ORDEM_SECOES.map((secao) => ({ secao }));
}

export async function GET(_pedido: Request, { params }: { params: Promise<{ secao: string }> }) {
  const { secao } = await params;
  if (!ehSecao(secao)) return new Response(null, { status: 404 });
  return Response.json(respostaDaLista(porSecao(secao)));
}
