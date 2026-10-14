/** Os ultimos valores de cada modelo ficam no navegador (abrir de novo continua de onde parou). */
import { receitaPorId } from '@/lib/gerador/receitas';
import { valoresPadrao, type Valores } from '@/lib/gerador/tipos';

const CHAVE = (id: string) => `formma3d:gerador:${id}`;

export function valoresDoModelo(id: string): Valores {
  const r = receitaPorId(id);
  if (!r) return {};
  const padrao = valoresPadrao(r);
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE(id)) ?? 'null') as Valores | null;
    if (salvo) for (const p of r.parametros) if (typeof salvo[p.id] === typeof padrao[p.id]) padrao[p.id] = salvo[p.id]!;
  } catch {
    // sem armazenamento: comeca do padrao
  }
  return padrao;
}

const gravacoes = new Map<string, { timer: ReturnType<typeof setTimeout>; valores: Valores }>();

function gravar(id: string, valores: Valores) {
  try {
    localStorage.setItem(CHAVE(id), JSON.stringify(valores));
  } catch {
    // sem armazenamento (ou cheio): so nao lembra
  }
}

export function descarregarValoresPendentes() {
  for (const [id, pendente] of gravacoes) {
    clearTimeout(pendente.timer);
    gravar(id, pendente.valores);
  }
  gravacoes.clear();
}

if (typeof window !== 'undefined') window.addEventListener('pagehide', descarregarValoresPendentes);

export function lembrarValores(id: string, v: Valores) {
  const anterior = gravacoes.get(id);
  if (anterior) clearTimeout(anterior.timer);
  // depois de uma pausa (com imagem, o JSON pode ser grande)
  const timer = setTimeout(() => {
    const pendente = gravacoes.get(id);
    if (!pendente || pendente.timer !== timer) return;
    gravacoes.delete(id);
    gravar(id, pendente.valores);
  }, 600);
  gravacoes.set(id, { timer, valores: v });
}
