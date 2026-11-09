'use client';

import { useCallback, useEffect, useState } from 'react';
import { iniciarMalha, malhaPronta } from './nucleo';

export type EstadoDoMotor = 'carregando' | 'pronto' | 'falhou';

/**
 * O motor de malha (WASM) carrega uma vez; ate la nao ha peca para montar. Se a carga falhar,
 * `tentar` carrega de novo (o nucleo nao guarda a falha).
 */
export function useMalhaPronta(): { estado: EstadoDoMotor; tentar: () => void } {
  const [estado, setEstado] = useState<EstadoDoMotor>(() => (malhaPronta() ? 'pronto' : 'carregando'));
  useEffect(() => {
    if (estado !== 'carregando') return;
    let vivo = true;
    iniciarMalha().then(
      () => vivo && setEstado('pronto'),
      (e) => {
        console.error('Motor de malha nao carregou', e);
        if (vivo) setEstado('falhou');
      }
    );
    return () => {
      vivo = false;
    };
  }, [estado]);
  const tentar = useCallback(() => setEstado((e) => (e === 'falhou' ? 'carregando' : e)), []);
  return { estado, tentar };
}
