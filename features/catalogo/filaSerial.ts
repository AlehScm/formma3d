export function criarFilaSerial() {
  const fila: Array<() => void> = [];
  let ocupada = false;
  const proxima = () => {
    if (ocupada) return;
    const iniciar = fila.shift();
    if (!iniciar) return;
    ocupada = true;
    iniciar();
  };
  return function enfileirar<T>(trabalho: () => Promise<T>): { promessa: Promise<T>; cancelar: () => void } {
    let cancelar!: () => void;
    const promessa = new Promise<T>((resolve, reject) => {
      let ativo = true;
      const iniciar = () => {
        if (!ativo) { ocupada = false; proxima(); return; }
        Promise.resolve().then(() => {
          if (!ativo) throw new Error('Trabalho cancelado');
          return trabalho();
        }).then(resolve, reject).finally(() => { ativo = false; ocupada = false; proxima(); });
      };
      fila.push(iniciar);
      cancelar = () => {
        if (!ativo) return;
        ativo = false;
        const pos = fila.indexOf(iniciar);
        if (pos >= 0) fila.splice(pos, 1);
        reject(new Error('Trabalho cancelado'));
      };
    });
    queueMicrotask(proxima);
    return { promessa, cancelar };
  };
}
