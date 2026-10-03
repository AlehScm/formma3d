import type { Metadata } from 'next';
import { PaginaLoja } from '@/components/loja/Estrutura';
import { Orcamento } from '@/components/loja/Orcamento';
import { produtosPublicos } from '@/lib/marketplace/consultas';

export const metadata: Metadata = { title: 'Meu orçamento | Scarprint', description: 'As peças que você escolheu para pedir orçamento.' };

export default function OrcamentoPage() {
  return (
    <PaginaLoja>
      <div className="rounded-2xl bg-marca-branco px-6 py-5 shadow-marca-1">
        <h1 className="m-0 font-display text-[clamp(24px,2.6vw,34px)] leading-tight font-extrabold text-marca-navy">Meu orçamento</h1>
        <p className="m-0 mt-1 text-marca-texto-2">Ajuste quantidade, cor e observação. Depois envie a lista: respondemos com preço e prazo.</p>
      </div>
      <Orcamento produtos={produtosPublicos()} />
    </PaginaLoja>
  );
}
