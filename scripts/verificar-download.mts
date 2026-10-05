import assert from 'node:assert/strict';
import { baixar } from '../lib/export/baixar';

const criarUrlOriginal = URL.createObjectURL;
const revogarUrlOriginal = URL.revokeObjectURL;
const temporizadorOriginal = globalThis.setTimeout;
const descritorDocumento = Object.getOwnPropertyDescriptor(globalThis, 'document');
let blobCriado: Blob | undefined;
let ancora: { href: string; download: string; click: () => void } | undefined;
const revogadas: string[] = [];
const agendados: { executar: () => void; atraso: number }[] = [];

URL.createObjectURL = ((blob: Blob) => { blobCriado = blob; return 'blob:teste'; }) as typeof URL.createObjectURL;
URL.revokeObjectURL = ((url: string) => { revogadas.push(url); }) as typeof URL.revokeObjectURL;
globalThis.setTimeout = ((executar: TimerHandler, atraso?: number) => {
  agendados.push({ executar: executar as () => void, atraso: atraso ?? 0 });
  return 1 as ReturnType<typeof setTimeout>;
}) as typeof setTimeout;

try {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { createElement: () => (ancora = { href: '', download: '', click: () => {} }) },
  });
  baixar('pedido.bin', 'conteudo', 'application/octet-stream');
  assert.equal(blobCriado?.type, 'application/octet-stream');
  assert.equal(await blobCriado?.text(), 'conteudo');
  assert.deepEqual(ancora, { href: 'blob:teste', download: 'pedido.bin', click: ancora?.click });
  assert.equal(agendados[0]?.atraso, 2000);
  agendados[0]!.executar();
  assert.deepEqual(revogadas, ['blob:teste'], 'URL e revogada depois do clique');

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { createElement: () => ({ href: '', download: '', click: () => { throw new Error('falha no clique'); } }) },
  });
  assert.throws(() => baixar('falha.bin', new Blob(['x'])), /falha no clique/);
  assert.deepEqual(revogadas, ['blob:teste', 'blob:teste'], 'URL e revogada imediatamente se o clique falha');
  console.log('Download: nome, tipo, Blob, objectURL e limpeza passaram.');
} finally {
  URL.createObjectURL = criarUrlOriginal;
  URL.revokeObjectURL = revogarUrlOriginal;
  globalThis.setTimeout = temporizadorOriginal;
  if (descritorDocumento) Object.defineProperty(globalThis, 'document', descritorDocumento);
  else Reflect.deleteProperty(globalThis, 'document');
}
