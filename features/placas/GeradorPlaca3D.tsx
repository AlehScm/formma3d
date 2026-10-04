'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { Font } from 'opentype.js';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { BotaoMarca, CampoMarca, ESCOPO_MARCA, Wordmark } from '@/components/marca';
import { carregarFonteArquivo, carregarFonteWeb, FONTES_WEB } from '@/lib/text/fontes';
import { criarPlaca3D } from '@/lib/geom/placa';
import { prepararTextoPlaca } from '@/lib/geom/placa-texto';
import { gerarZipPlaca3D } from '@/lib/export/placa-zip';

const CAMPO = 'grid gap-1.5 text-marca-mini font-bold text-marca-texto-2';
const TITULO_GRUPO = 'mt-4 mb-2 text-marca-mini font-extrabold tracking-[0.13em] text-marca-texto-3 first:mt-0';
const AJUDA = 'mt-2 text-marca-mini leading-relaxed text-marca-texto-3';
const AVISO = 'mt-3 rounded-marca-md border border-marca-linha bg-marca-gelo px-3 py-2.5 text-marca-mini leading-relaxed text-marca-texto-2';

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
  return <label className={CAMPO}><span>{label}</span><CampoMarca type="number" min={min} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
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

  return <main className={`${ESCOPO_MARCA} min-h-screen bg-marca-palido font-marca text-marca-texto`}>
    <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-4 border-b border-marca-linha bg-marca-branco px-margem py-2.5 max-sm:items-start max-sm:py-3">
      <div className="flex items-center gap-4 text-marca-mini font-extrabold tracking-[0.14em] text-marca-texto-3"><Wordmark tamanho={22} subtitulo={null} /><span>GERADOR 3D</span></div>
      <div className="flex flex-wrap items-center gap-2 max-sm:w-full">
        <BotaoMarca variante="contorno" pequeno onClick={onSwitchTo2D}>Composição 2D / SVG</BotaoMarca>
        <BotaoMarca variante="fantasma" pequeno href="/criar">Catálogo</BotaoMarca>
      </div>
    </header>
    <div className="mx-auto max-w-[1800px] px-margem py-6 max-sm:px-3.5 max-sm:py-3.5">
      <div className="mb-4 flex items-end justify-between gap-5 max-[850px]:flex-col max-[850px]:items-start"><div><p className="mb-1.5 text-marca-mini font-extrabold tracking-[0.17em] text-marca-azul-forte">SCARPRINT / GERADOR 3D</p><h1 className="m-0 font-display text-marca-titulo-2 leading-tight font-black tracking-[-0.04em] text-marca-navy">{nomeMolde}</h1></div><span className="max-w-[460px] text-marca-pequeno leading-relaxed text-marca-texto-2 max-[850px]:max-w-none">Configure a base e as letras. A prévia mostra a posição de montagem na placa.</span></div>
      <div className="grid grid-cols-[minmax(275px,350px)_minmax(0,1fr)] items-stretch gap-4 max-[850px]:grid-cols-1">
        <aside className="rounded-marca-lg border border-marca-linha bg-marca-branco p-[18px] shadow-marca-1 max-sm:p-3.5">
          <p className={TITULO_GRUPO}>TEXTO</p>
          <label className={CAMPO}><span>LETRAS DA PLACA</span><CampoMarca value={texto} maxLength={160} onChange={(event) => setTexto(event.target.value)} /></label>
          <div className="mt-2.5 grid grid-cols-2 gap-2.5">
            <CampoNumero label="ALTURA DA LETRA (mm)" value={medidas.alturaLetra} min={0.1} step={0.5} onChange={(n) => atualizar('alturaLetra', n)} />
            <CampoNumero label="ESPESSURA DA LETRA (mm)" value={medidas.espessuraLetra} min={0.1} step={0.2} onChange={(n) => atualizar('espessuraLetra', n)} />
            <CampoNumero label="TRACKING (mm)" value={medidas.tracking} min={-100} step={0.5} onChange={(n) => atualizar('tracking', n)} />
            <label className={CAMPO}><span>FONTE</span><select className="min-h-12 w-full rounded-marca-md border border-marca-linha bg-marca-branco px-3 text-marca-corpo text-marca-texto focus:border-marca-azul" value={fonteLocal ? 'local' : fonteId} onChange={(event) => { if (event.target.value === 'local') return; setFonteLocal(''); setFonteId(event.target.value); setRevisaoFonte((atual) => atual + 1); }}>{fonteLocal && <option value="local">Arquivo: {fonteLocal}</option>}{FONTES_WEB.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
            <div className={`${CAMPO} col-span-full`}><span>OU CARREGUE FONTE .TTF / .OTF</span><div className="flex items-center gap-2 [&>*]:flex-1"><BotaoMarca variante="contorno" pequeno onClick={() => arquivoFonte.current?.click()}>Escolher arquivo</BotaoMarca><span className={AJUDA}>{fonteLocal || 'fonte local opcional'}</span></div><input ref={arquivoFonte} type="file" accept=".ttf,.otf,font/ttf,font/otf" onChange={carregarFonteLocal} hidden /></div>
          </div>

          <p className={TITULO_GRUPO}>BASE DA PLACA</p>
          <div className="grid grid-cols-2 gap-2.5">
            <CampoNumero label="LARGURA (mm)" value={medidas.largura} min={1} onChange={(n) => atualizar('largura', n)} />
            <CampoNumero label="ALTURA (mm)" value={medidas.altura} min={1} onChange={(n) => atualizar('altura', n)} />
            <CampoNumero label="ESPESSURA (mm)" value={medidas.espessura} min={0.1} step={0.2} onChange={(n) => atualizar('espessura', n)} />
            <CampoNumero label="RAIO DE CANTO (mm)" value={medidas.raio} min={0} step={0.5} onChange={(n) => atualizar('raio', n)} />
            <CampoNumero label="MARGEM (mm)" value={medidas.margem} min={0} step={0.5} onChange={(n) => atualizar('margem', n)} />
          </div>
          <p className={AJUDA}>Tracking e medidas ficam neste gerador. A montagem das letras não define o arranjo de impressão.</p>
          {carregandoFonte && <div className={AVISO}>Carregando fonte…</div>}
          {erroFonte && <div className="mt-3 rounded-marca-md border border-marca-atencao bg-marca-atencao-fundo px-3 py-2.5 text-marca-pequeno leading-relaxed text-marca-atencao">{erroFonte} Escolha outra fonte web ou carregue um arquivo .ttf/.otf local.</div>}
          {modelo.erro && <div className="mt-3 rounded-marca-md border border-marca-atencao bg-marca-atencao-fundo px-3 py-2.5 text-marca-pequeno leading-relaxed text-marca-atencao">{modelo.erro}</div>}
          {avisoExportacao && <div className={AVISO}>{avisoExportacao}</div>}
          <div className="mt-4 grid gap-2"><BotaoMarca disabled={!modelo.placa || !modelo.letras || exportando} onClick={exportarZip}>{exportando ? 'Preparando STL…' : 'Baixar base + letras (ZIP de STLs)'}</BotaoMarca><p className={AJUDA}>Arquivos separados: a base e cada letra, mais um mapa de montagem. O ZIP não contém 3MF nem posicionamento de mesa.</p></div>
        </aside>
        <section className="flex min-h-[600px] min-w-0 flex-col overflow-hidden rounded-marca-lg border border-marca-linha bg-marca-branco shadow-marca-1 max-[850px]:min-h-[460px] max-sm:min-h-0" aria-label="Prévia 3D da placa">
          <div className="flex justify-between gap-2.5 border-b border-marca-linha px-4 py-3 text-marca-mini font-extrabold tracking-[0.08em] text-marca-texto-3 max-sm:p-2.5 max-sm:text-[9px]"><span>PRÉVIA DE MONTAGEM</span><span>{medidas.largura} × {medidas.altura} mm</span></div>
          <div className="min-h-[500px] flex-1 bg-marca-suave [&_canvas]:block [&_canvas]:size-full max-[850px]:min-h-[370px] max-sm:h-[300px] max-sm:min-h-0 max-sm:flex-none">
            {modelo.placa && <Canvas camera={{ position: [0, -dist, dist * 0.9], up: [0, 0, 1], fov: 35 }}>
              <color attach="background" args={['#f3f7fb']} />
              <ambientLight intensity={1.15} />
              <directionalLight position={[dist * 0.3, -dist * 0.4, dist]} intensity={2.2} />
              <mesh geometry={modelo.placa.geometry} castShadow receiveShadow><meshStandardMaterial color="#d4e3f2" roughness={0.62} metalness={0.08} /></mesh>
              {modelo.letras?.letras.map((letra, index) => <mesh key={`${index}-${letra.nome}`} geometry={letra.geometry} position={[0, 0, medidas.espessura]} castShadow receiveShadow><meshStandardMaterial color="#123a63" roughness={0.45} metalness={0.12} /></mesh>)}
              <OrbitControls makeDefault enableDamping dampingFactor={0.12} />
            </Canvas>}
          </div>
          <div className="flex justify-between gap-2.5 border-t border-marca-linha px-4 py-3 text-marca-mini text-marca-texto-3 max-sm:p-2.5 max-sm:text-[9px]"><span>{modelo.letras ? `${modelo.letras.letras.length} letras · ${medidas.espessuraLetra} mm de espessura` : 'Aguardando fonte e geometria'}</span><span>ARRASTE PARA GIRAR · RODA PARA ZOOM</span></div>
        </section>
      </div>
      <p className="mx-0.5 my-3 text-marca-mini leading-relaxed text-marca-texto-3">A prévia representa a montagem da placa. Use um fatiador ou arranjo próprio para preparar a impressão das peças.</p>
    </div>
  </main>;
}
