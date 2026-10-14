type Transformacao = { x: number; y: number; giro: number; escalaX: number; escalaY: number; espelhar?: boolean };

export function localDoElemento(elemento: Transformacao, ponto: { x: number; y: number }): { x: number; y: number } {
  const a = elemento.giro * Math.PI / 180;
  const x = (ponto.x - elemento.x) * Math.cos(a) + (ponto.y - elemento.y) * Math.sin(a);
  const y = -(ponto.x - elemento.x) * Math.sin(a) + (ponto.y - elemento.y) * Math.cos(a);
  const sx = elemento.escalaX * (elemento.espelhar ? -1 : 1);
  return { x: sx ? x / sx : 0, y: elemento.escalaY ? y / elemento.escalaY : 0 };
}

export function mundoDoElemento(elemento: Transformacao, ponto: { x: number; y: number }): { x: number; y: number } {
  const a = elemento.giro * Math.PI / 180;
  const x = ponto.x * elemento.escalaX * (elemento.espelhar ? -1 : 1);
  const y = ponto.y * elemento.escalaY;
  return { x: elemento.x + x * Math.cos(a) - y * Math.sin(a), y: elemento.y + x * Math.sin(a) + y * Math.cos(a) };
}
