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
import { placaQr, placaQrTexto, placaQrWhatsapp, placaQrWifi, placaPixSimples } from './qr';

import { estojoBatom, roloTextura } from './cilindros';
import { cumbuca, ejetorCupula, suporteBolo } from './cupulas';
import { chaveiroCenoura, chaveiroCoelho, rosaNome, stringArt } from './tematicos';
import { letraGrande, luminariaLetra, luminariaSocial } from './letras';
import { carimbosMassinha, portaPente } from './potes';
import { caixaFigurinhas, portaCanetasDesign } from './caixas';
import { displayUnhas, miniMicrofone, portaRetrato, quadroTecido } from './quadros';
import { cartaoTecido, cartaoVisita, listaQr, listaQrCamadas, placaGoogleReview, placaPixLogo, placaPixTexto, placaQrLogo, placaQrSocial, socialComQr } from './qrplacas';
export const RECEITAS: Receita[] = [palavraCamadas, socialCamadas, letrasSeparadas, chaveiroNome, chaveiroRetangular, logoCamadas, chaveiroDesenho, chaveiroLogoNome, plaquinhaPet, pingenteFamilia,
  letreiroSobreposto, topoBolo, topoBoloCircular, marcadorPagina, contadorRaspadinha, textoComGuia,
  suporteFoto, suportePalitos, portaCanetasGrade, flocoNeve,
  cortadorBiscoito, ejetorBrigadeiro, cortadoresGrade, carimboMolde, carimboCircular, carimboLetras, carimboImagem,
  colorir, chaveiroResina, imagemMultipartes, quebraCabeca, chaveiroNfc, chaveiroCarretel, abridorLatas, chaveiroEspelho, rosaComTexto,
  placaComBase, trofeu, placaQr, placaQrWifi, placaQrWhatsapp, placaQrTexto, placaPixSimples,
  roloTextura, estojoBatom,
  ejetorCupula, cumbuca, suporteBolo,
  chaveiroCenoura, chaveiroCoelho, rosaNome, stringArt,
  letraGrande, luminariaLetra, luminariaSocial,
  portaPente, carimbosMassinha,
  caixaFigurinhas, portaCanetasDesign, quadroTecido, portaRetrato, displayUnhas, miniMicrofone,
  placaGoogleReview, placaQrSocial, placaQrLogo, placaPixLogo, placaPixTexto, listaQr, listaQrCamadas, socialComQr, cartaoVisita, cartaoTecido,
];

export const receitaPorId = (id: string) => RECEITAS.find((r) => r.id === id);
