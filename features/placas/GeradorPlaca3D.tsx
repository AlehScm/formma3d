'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { Font } from 'opentype.js';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { carregarFonteArquivo, carregarFonteWeb, FONTES_WEB } from '@/lib/text/fontes';
import { criarPlaca3D } from '@/lib/geom/placa';
import { prepararTextoPlaca } from '@/lib/geom/placa-texto';
import { gerarZipPlaca3D } from '@/lib/export/placa-zip';
import './GeradorPlaca3D.css';

interface GeradorPlaca3DProps {
  moldeId: 'placa-personalizada' | 'placa-profissional';
  initialText: string;
  onSwitchTo2D: () => void;
}

interface Medidas {
  largura: number;
  altura: number;
  espessura: number;
  raio: number;
  margem: number;
  alturaLetra: number;
  espessuraLetra: number;
  tracking: number;
}

function baixar(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function nomeSeguro(valor: string): string {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'glifo';
}

function CampoNumero({ label, value, min, step = 1, onChange }: { label: string; value: number; min: number; step?: number; onChange: (n: number) => void }) {
  return <label className="scar-3d-field"><span>{label}</span><input type="number" min={min} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

export function GeradorPlaca3D({ moldeId, initialText, onSwitchTo2D }: GeradorPlaca3DProps) {
  const profissional = moldeId === 'placa-profissional';
  const [texto, setTexto] = useState(initialText);
  const [medidas, setMedidas] = useState<Medidas>({
    largura: profissional ? 420 : 300,
    altura: profissional ? 120 : 100,
    espessura: 4,
    raio: 10,
    margem: 8,
    alturaLetra: profissional ? 48 : 42,
    espessuraLetra: 3,
    tracking: 1,
  });
  const [fonteId, setFonteId] = useState('archivo-black');
  const [revisaoFonte, setRevisaoFonte] = useState(0);
  const [fonte, setFonte] = useState<Font | null>(null);
  const [fonteLocal, setFonteLocal] = useState('');
  const [carregandoFonte, setCarregandoFonte] = useState(true);
  const [erroFonte, setErroFonte] = useState('');
  const [exportando, setExportando] = useState(false);
  const [avisoExportacao, setAvisoExportacao] = useState('');
  const arquivoFonte = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let ativo = true;
    setCarregandoFonte(true);
    setErroFonte('');
    setFonte(null);
    carregarFonteWeb(fonteId).then((f) => {
      if (!ativo) return;
      setFonte(f);
      setCarregandoFonte(false);
    }).catch((error: unknown) => {
      if (!ativo) return;
      setErroFonte(error instanceof Error ? error.message : 'Não foi possível carregar a fonte web.');
      setCarregandoFonte(false);
    });
    return () => { ativo = false; };
  }, [fonteId, revisaoFonte]);

  const modelo = useMemo(() => {
    let placa: ReturnType<typeof criarPlaca3D> | null = null;
    try {
      placa = criarPlaca3D({ largura: medidas.largura, altura: medidas.altura, espessura: medidas.espessura, raio: medidas.raio, margem: medidas.margem });
      if (!fonte) return { placa, letras: null, erro: '' };
      const letras = prepararTextoPlaca(placa, fonte, texto, medidas.alturaLetra, medidas.tracking, medidas.espessuraLetra);
      return { placa, letras, erro: '' };
    } catch (error) {
      placa?.geometry.dispose();
      return { placa: null, letras: null, erro: error instanceof Error ? error.message : 'Não foi possível gerar a placa.' };
    }
  }, [fonte, medidas, texto]);

  useEffect(() => () => {
    modelo.placa?.geometry.dispose();
    modelo.letras?.letras.forEach((letra) => letra.geometry.dispose());
  }, [modelo]);

  const atualizar = (chave: keyof Medidas, valor: number) => setMedidas((atual) => ({ ...atual, [chave]: valor }));

  const carregarFonteLocal = async (event: ChangeEvent<HTMLInputElement>) => {
    const arquivo = event.target.files?.[0];
    event.target.value = '';
    if (!arquivo) return;
    setCarregandoFonte(true);
    setErroFonte('');
    try {
      const f = await carregarFonteArquivo(arquivo);
      setFonte(f);
      setFonteLocal(arquivo.name);
      setCarregandoFonte(false);
    } catch (error) {
      setErroFonte(error instanceof Error ? error.message : 'Não foi possível ler o arquivo de fonte.');
      setCarregandoFonte(false);
    }
  };

  const exportarZip = async () => {
    if (!modelo.placa || !modelo.letras) return;
    setExportando(true);
    setAvisoExportacao('');
    try {
      const blob = await gerarZipPlaca3D(modelo.placa, modelo.letras);
      baixar(blob, `${nomeSeguro(moldeId)}-pecas-stl.zip`);
      setAvisoExportacao('ZIP pronto: base e letras em STLs separados, com mapa de montagem. O arquivo não define arranjo na mesa nem é um 3MF.');
    } catch (error) {
      setAvisoExportacao(error instanceof Error ? error.message : 'Não foi possível exportar os STLs.');
    } finally {
      setExportando(false);
    }
  };

  const dist = Math.max(medidas.largura, medidas.altura) * 1.5;
  const nomeMolde = profissional ? 'Placa profissional' : 'Placa personalizada';

  return <main className="scar-3d">
    <header className="scar-3d-top">
      <Link className="scar-3d-brand" href="/" aria-label="Voltar ao catálogo Scarprint"><span className="scar-3d-mark">S</span><span>SCARPRINT<small>GERADOR 3D</small></span></Link>
      <div className="scar-3d-actions">
        <button className="scar-3d-btn" type="button" onClick={onSwitchTo2D}>Composição 2D / SVG</button>
        <Link className="scar-3d-btn" href="/">Catálogo</Link>
      </div>
    </header>
    <div className="scar-3d-main">
      <div className="scar-3d-title"><div><p>SCARPRINT / GERADOR 3D</p><h1>{nomeMolde}</h1></div><span>Configure a base e as letras. A prévia mostra a posição de montagem na placa.</span></div>
      <div className="scar-3d-grid">
        <aside className="scar-3d-panel">
          <p className="scar-3d-kicker">TEXTO</p>
          <label className="scar-3d-field wide"><span>LETRAS DA PLACA</span><input className="scar-3d-text" value={texto} maxLength={160} onChange={(event) => setTexto(event.target.value)} /></label>
          <div className="scar-3d-fields" style={{ marginTop: 10 }}>
            <CampoNumero label="ALTURA DA LETRA (mm)" value={medidas.alturaLetra} min={0.1} step={0.5} onChange={(n) => atualizar('alturaLetra', n)} />
            <CampoNumero label="ESPESSURA DA LETRA (mm)" value={medidas.espessuraLetra} min={0.1} step={0.2} onChange={(n) => atualizar('espessuraLetra', n)} />
            <CampoNumero label="TRACKING (mm)" value={medidas.tracking} min={-100} step={0.5} onChange={(n) => atualizar('tracking', n)} />
            <label className="scar-3d-field"><span>FONTE</span><select value={fonteLocal ? 'local' : fonteId} onChange={(event) => { if (event.target.value === 'local') return; setFonteLocal(''); setFonteId(event.target.value); setRevisaoFonte((atual) => atual + 1); }}>{fonteLocal && <option value="local">Arquivo: {fonteLocal}</option>}{FONTES_WEB.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
            <div className="scar-3d-field wide"><span>OU CARREGUE FONTE .TTF / .OTF</span><div className="scar-3d-row"><button className="scar-3d-btn" type="button" onClick={() => arquivoFonte.current?.click()}>Escolher arquivo</button><span className="scar-3d-help">{fonteLocal || 'fonte local opcional'}</span></div><input ref={arquivoFonte} type="file" accept=".ttf,.otf,font/ttf,font/otf" onChange={carregarFonteLocal} hidden /></div>
          </div>

          <p className="scar-3d-kicker">BASE DA PLACA</p>
          <div className="scar-3d-fields">
            <CampoNumero label="LARGURA (mm)" value={medidas.largura} min={1} onChange={(n) => atualizar('largura', n)} />
            <CampoNumero label="ALTURA (mm)" value={medidas.altura} min={1} onChange={(n) => atualizar('altura', n)} />
            <CampoNumero label="ESPESSURA (mm)" value={medidas.espessura} min={0.1} step={0.2} onChange={(n) => atualizar('espessura', n)} />
            <CampoNumero label="RAIO DE CANTO (mm)" value={medidas.raio} min={0} step={0.5} onChange={(n) => atualizar('raio', n)} />
            <CampoNumero label="MARGEM (mm)" value={medidas.margem} min={0} step={0.5} onChange={(n) => atualizar('margem', n)} />
          </div>
          <p className="scar-3d-help">Tracking e medidas ficam neste gerador. A montagem das letras não define o arranjo de impressão.</p>
          {carregandoFonte && <div className="scar-3d-status">Carregando fonte…</div>}
          {erroFonte && <div className="scar-3d-error">{erroFonte} Escolha outra fonte web ou carregue um arquivo .ttf/.otf local.</div>}
          {modelo.erro && <div className="scar-3d-error">{modelo.erro}</div>}
          {avisoExportacao && <div className="scar-3d-status">{avisoExportacao}</div>}
          <div className="scar-3d-export"><button className="scar-3d-btn primary" type="button" disabled={!modelo.placa || !modelo.letras || exportando} onClick={exportarZip}>{exportando ? 'Preparando STL…' : 'Baixar base + letras (ZIP de STLs)'}</button><p className="scar-3d-help">Arquivos separados: a base e cada letra, mais um mapa de montagem. O ZIP não contém 3MF nem posicionamento de mesa.</p></div>
        </aside>
        <section className="scar-3d-stage" aria-label="Prévia 3D da placa">
          <div className="scar-3d-stage-head"><span>PRÉVIA DE MONTAGEM</span><span>{medidas.largura} × {medidas.altura} mm</span></div>
          <div className="scar-3d-canvas">
            {modelo.placa && <Canvas camera={{ position: [0, -dist, dist * 0.9], up: [0, 0, 1], fov: 35 }}>
              <color attach="background" args={['#f3f7fb']} />
              <ambientLight intensity={1.15} />
              <directionalLight position={[dist * 0.3, -dist * 0.4, dist]} intensity={2.2} />
              <mesh geometry={modelo.placa.geometry} castShadow receiveShadow><meshStandardMaterial color="#d4e3f2" roughness={0.62} metalness={0.08} /></mesh>
              {modelo.letras?.letras.map((letra, index) => <mesh key={`${index}-${letra.nome}`} geometry={letra.geometry} position={[0, 0, medidas.espessura]} castShadow receiveShadow><meshStandardMaterial color="#123a63" roughness={0.45} metalness={0.12} /></mesh>)}
              <OrbitControls makeDefault enableDamping dampingFactor={0.12} />
            </Canvas>}
          </div>
          <div className="scar-3d-stage-foot"><span>{modelo.letras ? `${modelo.letras.letras.length} letras · ${medidas.espessuraLetra} mm de espessura` : 'Aguardando fonte e geometria'}</span><span>ARRASTE PARA GIRAR · RODA PARA ZOOM</span></div>
        </section>
      </div>
      <p className="scar-3d-footnote">A prévia representa a montagem da placa. Use um fatiador ou arranjo próprio para preparar a impressão das peças.</p>
    </div>
  </main>;
}
