import { useInterface } from '@/store/interface';
import { useProjeto } from '@/store/projeto';

export function iniciarTextoModelo(templateId: 'texto-livre' | 'letreiro-nome', texto: string): boolean {
  const atual = useProjeto.getState();
  const interfaceAtual = useInterface.getState();
  const temEstadoDeArranjoOuSelecao = Boolean(
    interfaceAtual.placas.length || interfaceAtual.sobraram.length || interfaceAtual.infoArranjo
    || interfaceAtual.reais.length || interfaceAtual.excluidas.size || interfaceAtual.selecao.length
    || interfaceAtual.selecionada
  );
  const temAlteracoes = Boolean(atual.texto || atual.arquivos.length || atual.objetos3d.length || atual.edicoes.size
    || atual.grupos.length || atual.copias.length || atual.avulsas.length || atual.removidas.size
    || atual.nomeTrabalho || atual.altura !== 150 || atual.tracking !== 0 || atual.profundidade !== 40
    || atual.parede !== 2.4 || atual.presetAtivo !== 'moldura_acm' || atual.macica
    || atual.frente !== 'chapa' || atual.frenteEsp !== 3 || atual.traseira !== 'impressa' || atual.traseiraEsp !== 2
    || atual.chapaModo !== 'cortar' || atual.apoio !== 'dentro' || atual.folga !== 0.3 || atual.borda !== 3
    || atual.batente !== 2.5 || atual.batenteModo !== 'parede' || atual.batenteAltura !== 3 || atual.labio !== 1
    || !atual.bordaCompensa || atual.comLed || atual.furoFio !== 6 || atual.espacadores !== 0
    || atual.biselAtivo || atual.biselTam !== 1.5 || atual.virar || atual.bico !== 0.4
    || temEstadoDeArranjoOuSelecao);
  if (temAlteracoes && !window.confirm('Iniciar outro letreiro vai substituir o trabalho atual. Quer continuar?')) return false;
  atual.limparProjeto();
  interfaceAtual.limparArranjo();
  interfaceAtual.definirSelecao([]);
  interfaceAtual.setEspaco('desenhar');
  interfaceAtual.setCategoria('desenhar', 'origem');
  useProjeto.setState({
    altura: 150, tracking: 0, profundidade: 40, parede: 2.4, frente: 'chapa', frenteEsp: 3,
    traseira: 'impressa', traseiraEsp: 2, chapaModo: 'cortar', folga: 0.3, apoio: 'dentro', borda: 3,
    batente: 2.5, batenteModo: 'parede', batenteAltura: 3, labio: 1, bordaCompensa: true,
    comLed: false, furoFio: 6, espacadores: 0, biselAtivo: false, biselTam: 1.5, virar: false, bico: 0.4,
  });
  const projeto = useProjeto.getState();
  projeto.definirTexto(texto);
  projeto.definir('nomeTrabalho', templateId === 'letreiro-nome' ? 'Letreiro de nome' : 'Texto editável');
  projeto.aplicarPreset('moldura_acm');
  return true;
}
