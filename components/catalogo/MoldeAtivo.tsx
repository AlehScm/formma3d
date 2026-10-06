'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AppShell } from '@/components/casca/AppShell';
import { EditorPlacas } from '@/features/placas/EditorPlacas';
import { GeradorPlaca3D } from '@/features/placas/GeradorPlaca3D';
import { moldes, type MoldeId } from '@/features/catalogo/catalogo';
import { iniciarTextoModelo } from '@/features/catalogo/iniciarTextoModelo';
import { PaginaLoja } from '@/components/marketplace/Loja';
import { BotaoMarca, CampoMarca, RotuloMarca } from '@/components/marca';

const ENTRADA = 'grid min-h-[min(70vh,700px)] place-items-center bg-marca-suave px-margem py-10 md:py-16 max-sm:place-items-start';
const CARTAO = 'w-full max-w-[680px] rounded-marca-lg border border-marca-linha bg-marca-branco p-6 shadow-marca-2 md:p-10';
const VOLTAR = 'text-apoio font-semibold text-marca-azul-forte no-underline hover:underline underline-offset-4';
const SOBRETITULO = 'mt-8 mb-3 text-apoio font-semibold text-marca-azul-forte';
const TITULO = 'm-0 font-display text-titulo text-marca-navy';
const RESUMO = 'mt-3.5 mb-0 text-corpo text-marca-texto-2';

type IdPlaca = 'placa-personalizada' | 'placa-profissional';
const CHAVE_TEXTO = 'scarprint:moldes:texto:';

export function MoldeAtivo({ id }: { id: MoldeId }) {
  const molde = moldes.find((item) => item.id === id)!;
  const [texto, setTexto] = useState('');
  const [editorAberto, setEditorAberto] = useState(false);
  const [modoPlaca, setModoPlaca] = useState<'3d' | '2d'>('3d');
  const [editor2DVisitado, setEditor2DVisitado] = useState(false);
  const textoEditado = useRef(false);
  const ePlaca = id === 'placa-personalizada' || id === 'placa-profissional';

  useEffect(() => {
    if (textoEditado.current) return;
    try { setTexto(localStorage.getItem(`${CHAVE_TEXTO}${id}`) ?? ''); }
    catch { setTexto(''); }
  }, [id]);

  if (!molde.ativo) {
    return (
      <PaginaLoja>
        <div className={ENTRADA}>
          <section className={CARTAO}>
            <Link href="/criar" className={VOLTAR}>← Biblioteca de moldes</Link>
            <p className={SOBRETITULO}>Em breve</p>
            <h1 className={TITULO}>{molde.title}</h1>
            <p className={RESUMO}>{molde.summary}</p>
            <p className="mt-6 mb-0 rounded-marca-md bg-marca-atencao-fundo px-4 py-3.5 font-bold text-marca-atencao">Este molde está em desenvolvimento.</p>
          </section>
        </div>
      </PaginaLoja>
    );
  }

  if (editorAberto) {
    if (!ePlaca) return <AppShell />;
    return <>
      <div style={{ display: modoPlaca === '3d' ? 'block' : 'none' }}>
        <GeradorPlaca3D moldeId={id as IdPlaca} initialText={texto.trim()} onSwitchTo2D={() => { setModoPlaca('2d'); setEditor2DVisitado(true); }} />
      </div>
      {editor2DVisitado && <div style={{ display: modoPlaca === '2d' ? 'block' : 'none' }}>
        <EditorPlacas key={id} templateId={id as IdPlaca} initialText={texto.trim()} onSwitchTo3D={() => setModoPlaca('3d')} />
      </div>}
    </>;
  }

  function personalizar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const valor = texto.replace(/[\r\n]+/g, ' ').trim().slice(0, 160);
    if (!valor) return;
    if (!ePlaca && !iniciarTextoModelo(id as 'texto-livre' | 'letreiro-nome', valor)) return;
    try { localStorage.setItem(`${CHAVE_TEXTO}${id}`, valor); } catch {}
    setTexto(valor);
    setModoPlaca('3d');
    setEditorAberto(true);
  }

  return (
    <PaginaLoja>
      <div className={ENTRADA}>
        <section className={CARTAO}>
          <Link href="/criar" className={VOLTAR}>← Biblioteca de moldes</Link>
          <p className={SOBRETITULO}>Personalizar</p>
          <h1 className={TITULO}>{molde.title}</h1>
          <p className={RESUMO}>{molde.summary}</p>
          <form className="mt-8 grid gap-3" onSubmit={personalizar}>
            <RotuloMarca htmlFor="texto-molde">Seu texto</RotuloMarca>
            <CampoMarca id="texto-molde" name="texto" autoComplete="off" maxLength={160} required value={texto} onChange={(event) => { textoEditado.current = true; setTexto(event.target.value); }} placeholder="Digite o texto do seu modelo" />
            <BotaoMarca type="submit" className="mt-2 justify-self-start max-sm:justify-self-stretch">Abrir editor</BotaoMarca>
          </form>
        </section>
      </div>
    </PaginaLoja>
  );
}
