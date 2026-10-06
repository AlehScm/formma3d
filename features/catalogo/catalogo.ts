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


/**
 * Editores livres (montar do zero, peca por peca), com o que cada um entrega. "Texto
 * editavel" e "Letreiro de nome" abrem o mesmo editor: no catalogo viram um card so.
 */
export const editoresLivres = [
  {
    id: 'design-livre', title: 'Crie do zero', family: 'multicor', href: '/design', visual: 'design-livre',
    summary: 'Arraste texto, formas, QR e imagem numa tela em mm; borda e fundo se ajustam sozinhos e o 3D aparece na hora.',
    destaques: ['Camadas coloridas', 'Prévia 3D ao vivo', '3MF multicor e STL'],
  },
  {
    id: 'editor', title: 'Editor de letra caixa', family: 'texto', href: '/editor', visual: 'texto-livre',
    summary: 'Monte do zero, letra por letra: letra caixa com chapa de ACM, peças para imprimir e orçamento.',
    destaques: ['Letra caixa com chapa', 'Importa AI, PDF, STL e 3MF', 'Orçamento pronto'],
  },
  {
    id: 'placa-personalizada', title: 'Placa personalizada', family: 'placas', href: '/moldes/placa-personalizada', visual: 'placa-personalizada',
    summary: 'Uma base com as medidas que você quiser e o texto em letras soltas para colar.',
    destaques: ['Medidas livres', 'Letras soltas em STL', 'Composição em 2D'],
  },
  {
    id: 'placa-profissional', title: 'Placa profissional', family: 'placas', href: '/moldes/placa-profissional', visual: 'placa-profissional',
    summary: 'Placa de nome para empresa ou consultório, já no formato largo de fachada.',
    destaques: ['Formato de fachada', 'Letras soltas em STL', 'Composição em 2D'],
  },
] as const;

/** Moldes do "Em breve" que ja viraram gerador pronto (o card do gerador ocupa o lugar). */
const VIRARAM_GERADOR: readonly string[] = ['chaveiro-logo', 'placa-qr', 'cortador-svg', 'carimbo-personalizado', 'placa-multicamadas', 'porta-canetas'];

/** Moldes ainda sem gerador. */
export const emBreve = moldes.filter((m) => !m.ativo && !VIRARAM_GERADOR.includes(m.id));
