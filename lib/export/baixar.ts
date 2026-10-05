/** Dispara o download de um Blob ou de dados para um arquivo no navegador. */
export function baixar(nome: string, data: BlobPart, tipo?: string): void {
  const blob = data instanceof Blob ? data : new Blob([data], tipo ? { type: tipo } : undefined);
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    a.click();
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
