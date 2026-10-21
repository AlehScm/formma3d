'use client';

/**
 * "Adicionar ao orcamento" do gerador completo: cada modelo da tela entra no carrinho da loja
 * como uma linha da peca dele, com o resumo da configuracao. Todo gerador tem peca no banco
 * (data/produtos.json); sem modelo na tela (so desenho livre) o botao nao aparece.
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Botao, IconeOk, IconeOrcamento, classeBotao } from '@/components/ui';
import { useMontado, useOrcamento } from '@/features/loja/estado';
import type { Valores } from '@/lib/gerador/tipos';

export interface LinhaPedido { slug: string; personalizacao: string; valores: Valores }

export function AdicionarOrcamento({ linhas, pode }: { linhas: LinhaPedido[]; pode: boolean }) {
  const adicionar = useOrcamento((s) => s.adicionar);
  const total = useOrcamento((s) => s.itens.reduce((n, i) => n + i.quantidade, 0));
  const montado = useMontado();
  const [feito, setFeito] = useState(false);
  useEffect(() => {
    if (!feito) return;
    const t = setTimeout(() => setFeito(false), 2500);
    return () => clearTimeout(t);
  }, [feito]);
  if (!linhas.length) return null;
  return (
    <>
      <Botao variante="primario" icone={feito ? IconeOk : IconeOrcamento} disabled={!pode} title={pode ? undefined : 'Espere a peça ficar pronta no 3D'}
        onClick={() => { for (const l of linhas) adicionar(l.slug, { personalizacao: l.personalizacao, valores: l.valores }); setFeito(true); }}>
        <span role="status">{feito ? 'Adicionado ao orçamento' : 'Adicionar ao orçamento'}</span>
      </Botao>
      {montado && total > 0 && <Link href="/orcamento" className={classeBotao('fantasma')}>Ver orçamento ({total})</Link>}
    </>
  );
}
