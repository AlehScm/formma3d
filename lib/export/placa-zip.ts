import JSZip from 'jszip';
import type { Placa3D } from '../geom/placa';
import type { TextoPlaca3D } from '../geom/placa-texto';
import { geometryToSTL } from './stl';

function nomeSeguro(valor: string): string {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'glifo';
}

export async function gerarZipPlaca3D(placa: Placa3D, texto: TextoPlaca3D): Promise<Blob> {
  const zip = new JSZip();
  zip.file('placa-base.stl', geometryToSTL(placa.geometry, 'placa-base'));
  const letras = texto.letras.map((letra, index) => {
    const arquivo = `letras/letra-${String(index + 1).padStart(2, '0')}-${nomeSeguro(letra.nome)}.stl`;
    const isolada = letra.geometry.clone();
    try {
      isolada.translate(-letra.boundsMontagem.minX, -letra.boundsMontagem.minY, 0);
      zip.file(arquivo, geometryToSTL(isolada, `letra-${index + 1}`));
    } finally {
      isolada.dispose();
    }
    return {
      arquivo,
      caractere: letra.nome,
      posicaoMontagem: {
        x: letra.boundsMontagem.minX,
        y: letra.boundsMontagem.minY,
        z: placa.layer.z1,
      },
    };
  });
  zip.file('mapa-montagem.json', JSON.stringify({
    versao: 1,
    unidade: 'mm',
    base: { arquivo: 'placa-base.stl', largura: placa.bounds.w, altura: placa.bounds.h, espessura: placa.layer.z1 },
    letras,
  }, null, 2));
  return zip.generateAsync({ type: 'blob' });
}
