'use client';

import { useEffect, useState } from 'react';
import { ehInterno } from '@/lib/ambiente';

/** Falso ate montar: no HTML estatico e no primeiro render nenhum custo aparece. */
export function useInterno(): boolean {
  const [interno, setInterno] = useState(false);
  useEffect(() => setInterno(ehInterno(location.hostname, location.search)), []);
  return interno;
}
