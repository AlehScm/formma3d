export const familias = {
  texto: 'Texto e letras', placas: 'Placas e letreiros', chaveiros: 'Chaveiros', qr: 'QR e redes',
  cortadores: 'Cortadores', carimbos: 'Carimbos e ejetores', multicor: 'Camadas e cores', parametricos: 'Paramétricos',
} as const;

export const moldes = [
  { id: 'texto-livre', title: 'Texto editável', family: 'texto', summary: 'Monte palavras e ajuste cada letra, escala e espaçamento.', icon: 'Aa', ativo: true },
  { id: 'letreiro-nome', title: 'Letreiro de nome', family: 'texto', summary: 'Comece por um nome e refine a composição letra por letra.', icon: 'N', ativo: true },
  { id: 'placa-personalizada', title: 'Placa personalizada', family: 'placas', summary: 'Defina medidas e texto; depois reorganize tudo no editor.', icon: '▱', ativo: true },
  { id: 'placa-profissional', title: 'Placa profissional', family: 'placas', summary: 'Base dimensional com nome editável para comunicação visual.', icon: '▰', ativo: true },
  { id: 'chaveiro-logo', title: 'Chaveiro com logo', family: 'chaveiros', summary: 'Logo, base, relevo e opção de fixação.', icon: '◇', ativo: false },
  { id: 'placa-qr', title: 'Placa com QR Code', family: 'qr', summary: 'QR, texto e identidade organizados em uma placa.', icon: '⌗', ativo: false },
  { id: 'cortador-svg', title: 'Cortador por desenho', family: 'cortadores', summary: 'Contorno enviado por SVG, borda e altura ajustáveis.', icon: '✂', ativo: false },
  { id: 'carimbo-personalizado', title: 'Carimbo personalizado', family: 'carimbos', summary: 'Texto ou desenho em relevo para gerar a matriz.', icon: '▣', ativo: false },
  { id: 'letra-grande', title: 'Letra grande', family: 'texto', summary: 'Letra de destaque com profundidade e variações de acabamento.', icon: 'A', ativo: false },
  { id: 'placa-multicamadas', title: 'Placa em camadas', family: 'multicor', summary: 'Base, letras e detalhes em peças e cores separadas.', icon: '▤', ativo: false },
  { id: 'porta-canetas', title: 'Porta-canetas paramétrico', family: 'parametricos', summary: 'Células, altura e espessuras configuráveis.', icon: '▦', ativo: false },
] as const;

export type MoldeId = (typeof moldes)[number]['id'];
