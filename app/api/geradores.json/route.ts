import { respostaDaLista } from '@/lib/marketplace/api/contrato';
import { geradores } from '@/lib/marketplace/consultas';

// GET /api/geradores.json: "Nossos geradores", estatico no build (ver lib/marketplace/api/contrato.ts).
export const dynamic = 'force-static';

export function GET() {
  return Response.json(respostaDaLista(geradores()));
}
