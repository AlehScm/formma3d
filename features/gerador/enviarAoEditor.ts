/** Manda as pecas de um resultado para o editor de letra caixa (espaco Imprimir). */
import { centrada, nomeComCor, pecasSoltas } from '@/lib/gerador/malha';
import type { Resultado } from '@/lib/gerador/tipos';
import { useProjeto } from '@/store/projeto';
import { useInterface } from '@/store/interface';

export function enviarAoEditor(resultado: Resultado, ir: (rota: string) => void) {
  const projeto = useProjeto.getState();
  for (const p of pecasSoltas(resultado)) {
    const posicoes = centrada(p.posicoes);
    let alturaZ = 0;
    for (let i = 2; i < posicoes.length; i += 3) alturaZ = Math.max(alturaZ, posicoes[i]!);
    projeto.adicionarObjeto3d({ nome: nomeComCor(p.nome, resultado.cores[p.cor]), posicoes, alturaZ });
  }
  useInterface.getState().setEspaco('imprimir');
  ir('/editor');
}
