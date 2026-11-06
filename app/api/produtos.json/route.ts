import { respostaDaLista } from '@/lib/marketplace/api/contrato';
import { produtosPublicos } from '@/lib/marketplace/consultas';

// GET /api/produtos.json: sai estatico no build (ver lib/marketplace/api/contrato.ts).
export const dynamic = 'force-static';

export function GET() {
  return Response.json(respostaDaLista(produtosPublicos()));
}
