/**
 * Design system do formma3d.
 *
 * Primitivos sem regra de negocio. Toda tela importa daqui; nada de componente
 * visual ad hoc dentro de feature. Guia vivo: rota `/sistema`.
 */
export { cx } from './cx';
export * from './icones';
export * from './formato';
export { Botao, classeBotao, type BotaoProps, type VarianteBotao } from './Botao';
export { BotaoIcone } from './BotaoIcone';
export { Dica, ProvedorDicas } from './Dica';
export { Tecla } from './Tecla';
export { Balao } from './Balao';
export { Menu, MenuItem, MenuSeparador, MenuRotulo } from './Menu';
export { Campo } from './Campo';
export { CampoNumero, EntradaNumero } from './CampoNumero';
export { Segmentado, Selecao, Interruptor, type OpcaoEscolha } from './Escolhas';
export { Secao, MaisOpcoes, CabecalhoPainel } from './Secao';
export { Abas, type Aba } from './Abas';
export { Alerta, Selo, Metrica, ListaValores, Vazio, BarraFerramentas, Separador, corDoTom, type Tom } from './Exibicao';
