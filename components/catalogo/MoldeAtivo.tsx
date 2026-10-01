'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AppShell } from '@/components/casca/AppShell';
import { EditorPlacas } from '@/features/placas/EditorPlacas';
import { GeradorPlaca3D } from '@/features/placas/GeradorPlaca3D';
import { moldes, type MoldeId } from '@/features/catalogo/catalogo';
import { iniciarTextoModelo } from '@/features/catalogo/iniciarTextoModelo';

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
      <main className="grid min-h-screen place-items-center bg-[#f5f8fb] px-6 py-12 text-slate-900">
        <section className="max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <Link href="/" className="text-sm font-semibold text-cyan-700">← Catálogo</Link>
          <p className="mt-8 text-sm font-bold uppercase tracking-[.18em] text-cyan-600">Scarprint</p>
          <h1 className="mt-3 text-3xl font-bold text-[#123a63]">{molde.title}</h1>
          <p className="mt-3 text-slate-600">{molde.summary}</p>
          <p className="mt-6 rounded-xl bg-cyan-50 px-4 py-3 font-semibold text-cyan-900">Este molde está em desenvolvimento.</p>
        </section>
      </main>
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
    <main className="grid min-h-screen place-items-center bg-[#f5f8fb] px-6 py-12 text-slate-900">
      <section className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
        <Link href="/" className="text-sm font-semibold text-cyan-700">← Catálogo</Link>
        <p className="mt-8 text-sm font-bold uppercase tracking-[.18em] text-cyan-600">Scarprint / Personalizar</p>
        <h1 className="mt-3 text-3xl font-bold text-[#123a63]">{molde.title}</h1>
        <p className="mt-3 text-slate-600">{molde.summary}</p>
        <form className="mt-8 space-y-4" onSubmit={personalizar}>
          <label className="block text-sm font-semibold text-slate-700" htmlFor="texto-molde">Texto</label>
          <input id="texto-molde" name="texto" autoComplete="off" maxLength={160} required value={texto} onChange={(event) => { textoEditado.current = true; setTexto(event.target.value); }} placeholder="Digite o texto do seu modelo" className="h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100" />
          <button type="submit" className="h-12 w-full rounded-xl bg-cyan-600 px-5 font-semibold text-white hover:bg-cyan-700">Abrir editor</button>
        </form>
      </section>
    </main>
  );
}
