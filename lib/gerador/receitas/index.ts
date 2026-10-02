/** Todas as receitas do catalogo. Modelo novo: escrever a receita e registrar aqui. */
import type { Receita } from '../tipos';
import { chaveiroNome, chaveiroRetangular } from './chaveiro';
import { letrasSeparadas, palavraCamadas, socialCamadas, topoBolo } from './texto';
import { chaveiroDesenho, chaveiroLogoNome, logoCamadas } from './desenho';
import { pingenteFamilia, plaquinhaPet } from './pet';
import { letreiroSobreposto, topoBoloCircular } from './letreiros';
import { contadorRaspadinha, marcadorPagina, textoComGuia } from './papelaria';
import { flocoNeve, portaCanetasGrade, suporteFoto, suportePalitos } from './objetos';
import { cortadorBiscoito, cortadoresGrade, ejetorBrigadeiro } from './cortadores';
import { carimboCircular, carimboImagem, carimboLetras, carimboMolde } from './carimbos';
import { chaveiroResina, colorir, imagemMultipartes, quebraCabeca } from './imagens';
import { abridorLatas, chaveiroCarretel, chaveiroNfc } from './nfc';
import { chaveiroEspelho, rosaComTexto } from './arco';
import { placaComBase, trofeu } from './expositores';

export const RECEITAS: Receita[] = [palavraCamadas, socialCamadas, letrasSeparadas, chaveiroNome, chaveiroRetangular, logoCamadas, chaveiroDesenho, chaveiroLogoNome, plaquinhaPet, pingenteFamilia,
  letreiroSobreposto, topoBolo, topoBoloCircular, marcadorPagina, contadorRaspadinha, textoComGuia,
  suporteFoto, suportePalitos, portaCanetasGrade, flocoNeve,
  cortadorBiscoito, ejetorBrigadeiro, cortadoresGrade, carimboMolde, carimboCircular, carimboLetras, carimboImagem,
  colorir, chaveiroResina, imagemMultipartes, quebraCabeca, chaveiroNfc, chaveiroCarretel, abridorLatas, chaveiroEspelho, rosaComTexto,
  placaComBase, trofeu,
];

export const receitaPorId = (id: string) => RECEITAS.find((r) => r.id === id);
