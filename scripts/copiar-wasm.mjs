// Copia o WASM da manifold-3d (motor de malha, lib/malha) para public/: o site e estatico e o
// navegador baixa de la. Roda no predev e no prebuild, entao acompanha a versao instalada.
import fs from 'fs';

fs.copyFileSync('node_modules/manifold-3d/manifold.wasm', 'public/manifold.wasm');
