'use client';

import { useRouter } from 'next/navigation';
import { useInterface } from '@/store/interface';
import { useProjeto } from '@/store/projeto';

export function TransferirFormma3D({ text }: { text: string }) {
  const router = useRouter();
  const continueIn3D = () => {
    const project = useProjeto.getState();
    const ui = useInterface.getState();
    const has3DWork = Boolean(project.texto || project.arquivos.length || project.objetos3d.length || project.edicoes.size
      || project.grupos.length || project.copias.length || project.avulsas.length || project.removidas.size || project.nomeTrabalho);
    if (has3DWork && !window.confirm('Continuar vai substituir o projeto atual do Formma3D. Quer continuar?')) return;
    if (!window.confirm('Só o texto será transferido. A posição, escala, placa, grupos e layout 2D não viram geometria 3D. Deseja continuar no editor 3D?')) return;
    project.limparProjeto();
    ui.limparArranjo();
    ui.definirSelecao([]);
    project.definirTexto(text);
    project.definir('nomeTrabalho', 'Texto vindo da composição 2D');
    project.aplicarPreset('moldura_acm');
    ui.setEspaco('desenhar');
    ui.setCategoria('desenhar', 'origem');
    router.push('/editor');
  };
  return <button type="button" onClick={continueIn3D}>Continuar no editor 3D</button>;
}
