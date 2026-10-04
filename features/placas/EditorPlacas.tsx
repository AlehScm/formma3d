'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { BotaoMarca, CampoMarca, ESCOPO_MARCA, Wordmark } from '@/components/marca';
import { exportSvg } from './exportSvg';
import { alignObjects, distributeObjects, fitObjectsToBoard } from './layoutCommands';
import { objectBounds, sceneBounds, layoutWord, placeWordInOpenSpace, wordBounds } from './layout';
import { createHistory, commitHistory, redoHistory, undoHistory } from './history';
import { initialScene, isWordObject, makeGroup, makeWord, uid } from './model';
import type { BoardObject, Scene, SceneObject, WordObject } from './model';
import { serializeScene, validateScene } from './projectIO';
import { TransferirFormma3D } from './TransferirFormma3D';

const ui = {
  shell: 'flex min-h-screen flex-col bg-marca-palido font-marca text-marca-texto',
  topbar: 'flex min-h-16 flex-wrap items-center justify-between gap-5 border-b border-marca-linha bg-marca-branco px-margem py-2.5 max-[760px]:items-start max-[760px]:flex-col',
  brand: 'inline-flex items-center gap-2.5 text-marca-pequeno font-extrabold tracking-[0.08em] text-marca-navy no-underline',
  brandMark: 'grid size-8 place-items-center rounded-marca-sm bg-marca text-white',
  actions: 'flex flex-wrap items-center gap-2 max-[760px]:w-full max-[760px]:flex-nowrap max-[760px]:overflow-x-auto max-[760px]:pb-1 max-[760px]:[scrollbar-width:none] max-[760px]:[&::-webkit-scrollbar]:hidden max-[760px]:[&>*]:shrink-0',
  quiet: 'inline-flex min-h-9 cursor-pointer items-center justify-center rounded-marca-md border border-marca-linha bg-marca-branco px-3 text-xs font-bold text-marca-texto-2 no-underline hover:border-marca-linha-forte hover:bg-marca-gelo disabled:cursor-not-allowed disabled:opacity-45',
  primary: 'inline-flex min-h-9 cursor-pointer items-center justify-center rounded-marca-md border border-marca-azul bg-marca px-3 text-xs font-bold text-white',
  secondary: 'mt-3.5 inline-flex min-h-9 w-full cursor-pointer items-center justify-center rounded-marca-md border border-marca-linha-forte bg-marca-branco px-3 text-xs font-bold text-marca-azul-forte hover:bg-marca-gelo',
  notice: 'flex items-center justify-between gap-4 border-b border-marca-linha-forte bg-marca-gelo px-margem py-3 text-xs text-marca-azul-forte max-[760px]:flex-col max-[760px]:items-start',
  workspace: 'mx-auto flex min-h-0 w-full max-w-[2400px] flex-1 max-[760px]:flex-col',
  panel: 'w-[318px] shrink-0 overflow-y-auto border-r border-marca-linha bg-marca-branco px-5 py-5.5 max-[760px]:w-auto max-[760px]:border-r-0 max-[760px]:border-b',
  kicker: 'mt-5 mb-2 text-marca-mini font-extrabold tracking-[0.13em] text-marca-texto-3',
  muted: 'mt-0 mb-5 text-xs leading-relaxed text-marca-texto-3',
  field: 'flex min-w-0 flex-col gap-1.5 text-marca-mini font-extrabold tracking-[0.07em] text-marca-texto-3 [&_input]:min-w-0 [&_input]:rounded-marca-sm [&_input]:border [&_input]:border-marca-linha [&_input]:bg-marca-palido [&_input]:px-2.5 [&_input]:py-2 [&_input]:text-[13px] [&_input]:font-medium [&_input]:tracking-normal [&_input]:text-marca-texto [&_textarea]:resize-y [&_textarea]:rounded-marca-sm [&_textarea]:border [&_textarea]:border-marca-linha [&_textarea]:bg-marca-palido [&_textarea]:px-2.5 [&_textarea]:py-2 [&_textarea]:text-[13px] [&_textarea]:font-medium [&_textarea]:tracking-normal [&_textarea]:text-marca-texto',
  grid: 'mt-3.5 grid grid-cols-2 gap-x-2.5 gap-y-3',
  helper: 'mt-2.5 min-h-[30px] text-marca-mini leading-relaxed text-marca-texto-3',
  canvasArea: 'flex min-w-0 flex-1 flex-col px-6 pt-5 pb-3 max-[760px]:min-h-[420px] max-[760px]:px-3 max-[760px]:pt-4',
  canvasHeader: 'flex justify-between text-marca-mini font-extrabold tracking-[0.1em] text-marca-texto-3',
  canvasFooter: 'flex justify-between text-marca-mini font-extrabold tracking-[0.1em] text-marca-texto-3',
  canvas: 'my-3.5 grid min-h-[340px] flex-1 place-items-center overflow-auto rounded-marca-md border border-marca-linha bg-marca-branco bg-[radial-gradient(var(--marca-linha)_0.75px,transparent_0.75px)] bg-[length:16px_16px] max-[760px]:min-h-[300px]',
  preview: 'block max-h-[75vh] w-[min(88%,920px)] drop-shadow-lg max-[760px]:w-[94%]',
  selectionBox: 'pointer-events-none fill-marca-gelo stroke-marca-azul [stroke-dasharray:3_2] [stroke-width:1]',
  footer: 'flex min-h-[34px] items-center justify-between border-t border-marca-linha bg-marca-branco px-[18px] text-marca-mini text-marca-texto-3 [&_span]:tracking-[0.12em]',
  hidden: 'hidden',
  addRow: 'my-4 flex gap-2 [&_input]:min-w-0 [&_input]:flex-1 [&_input]:rounded-marca-sm [&_input]:border [&_input]:border-marca-linha [&_input]:px-2 [&_input]:text-marca-texto [&_button]:cursor-pointer [&_button]:rounded-marca-sm [&_button]:border [&_button]:border-marca-linha [&_button]:bg-marca-palido [&_button]:px-2.5 [&_button]:text-marca-mini [&_button]:text-marca-texto-2',
  objectList: 'my-3 flex max-h-[150px] flex-col gap-1 overflow-auto',
  objectRow: 'flex cursor-pointer items-center gap-2 rounded-marca-sm border border-transparent bg-transparent p-2 text-left text-marca-texto-2 [&_span]:font-mono [&_span]:text-marca-mini [&_strong]:min-w-0 [&_strong]:flex-1 [&_strong]:truncate [&_strong]:text-xs [&_small]:text-[9px]',
  activeRow: 'border-marca-linha-forte bg-marca-gelo',
  arrange: 'mt-3',
  layoutGrid: 'grid grid-cols-2 gap-1.5 [&_button]:cursor-pointer [&_button]:rounded-marca-sm [&_button]:border [&_button]:border-marca-linha [&_button]:bg-marca-palido [&_button]:px-2 [&_button]:py-2 [&_button]:text-marca-mini [&_button]:text-marca-texto-2',
  transfer: 'mt-3.5 flex flex-col gap-1.5 [&_button]:min-h-[38px] [&_button]:rounded-marca-sm [&_button]:bg-marca [&_button]:p-2 [&_button]:text-xs [&_button]:font-bold [&_button]:text-white [&_small]:text-marca-mini [&_small]:leading-relaxed [&_small]:text-marca-texto-3',
} as const;

const STORAGE_KEY = 'scarprint:placas:scene:v2';
const clone = (scene: Scene) => structuredClone(scene);
const wordsIn = (scene: Scene) => scene.objects.filter(isWordObject);
type TemplatePlaca = 'placa-personalizada' | 'placa-profissional';

function sceneForTemplate(templateId: TemplatePlaca, text: string): Scene {
  const template = clone(initialScene);
  const plate = template.objects.find((object): object is BoardObject => object.type === 'board');
  const word = template.objects.find(isWordObject);
  const professional = templateId === 'placa-profissional';
  const value = text.trim() || (professional ? 'SUA EMPRESA' : 'SUA MARCA');
  if (plate && word) {
    plate.width = professional ? 420 : 300;
    plate.height = professional ? 120 : 100;
    plate.transform.x = 0;
    plate.transform.y = 0;
    word.text = value;
    word.name = value;
    word.fontSize = professional ? 38 : 42;
    word.glyphs = Array.from(value, char => ({ id: uid(), char, offset: { x: 0, y: 0 }, scale: 1 }));
    word.transform.x = plate.width * 0.16;
    word.transform.y = plate.height * 0.58;
  }
  return template;
}

export function EditorPlacas({ templateId, initialText = '', onSwitchTo3D }: { templateId?: TemplatePlaca; initialText?: string; onSwitchTo3D?: () => void }) {
  const [history, setHistory] = useState(() => createHistory(clone(initialScene)));
  const scene = history.present;
  const [selectedId, setSelectedId] = useState(scene.objects.find(isWordObject)?.id ?? '');
  const [selectedGlyph, setSelectedGlyph] = useState('');
  const [multi, setMulti] = useState<string[]>([]);
  const [draft, setDraft] = useState('NOVA PALAVRA');
  const [notice, setNotice] = useState('');
  const [ready, setReady] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);
  const storageKey = templateId ? `${STORAGE_KEY}:${templateId}` : STORAGE_KEY;
  const selectedObject = scene.objects.find(object => object.id === selectedId);
  const selected = selectedObject && isWordObject(selectedObject) ? selectedObject : undefined;
  const glyph = selected?.glyphs.find(item => item.id === selectedGlyph);
  const words = useMemo(() => wordsIn(scene), [scene]);
  const board = scene.objects.find((object): object is BoardObject => object.type === 'board' && object.visible);
  const bounds = sceneBounds(scene, scene.plate.enabled ? scene.plate.padding : 0);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    let saved: Scene | undefined;
    try { const raw = localStorage.getItem(storageKey); if (raw) saved = validateScene(JSON.parse(raw)); }
    catch { setNotice('O projeto salvo não pôde ser lido; uma nova composição foi aberta.'); }
    const preset = templateId ?? new URLSearchParams(window.location.search).get('preset');
    if (preset === 'placa-personalizada' || preset === 'placa-profissional') {
      if (templateId && saved) {
        const resumed = clone(saved);
        const word = resumed.objects.find(isWordObject);
        const replaceText = Boolean(word && initialText.trim() && initialText.trim() !== word.text);
        const applyInitialText = !replaceText || window.confirm('Já existe uma composição salva deste molde. Deseja substituir o texto e manter o layout?');
        if (word && initialText.trim() && applyInitialText) {
          word.text = initialText.trim();
          word.name = word.text;
          const previous = word.glyphs;
          word.glyphs = Array.from(word.text, (char, index) => ({ id: previous[index]?.id ?? uid(), char, offset: previous[index]?.offset ?? { x: 0, y: 0 }, scale: previous[index]?.scale ?? 1 }));
        }
        setHistory(createHistory(resumed));
        setSelectedId(word?.id ?? '');
        setNotice(applyInitialText ? 'Sua composição foi aberta neste molde. Edite e exporte como SVG.' : 'A composição salva foi preservada.');
      } else if (templateId || !saved || window.confirm('Já existe uma composição 2D neste navegador. Deseja substituí-la pelo modelo escolhido?')) {
        const template = sceneForTemplate(preset, initialText);
        const word = template.objects.find(isWordObject);
        setHistory(createHistory(template));
        setSelectedId(word?.id ?? '');
        setNotice('Modelo carregado. Edite a composição 2D e exporte como SVG.');
      } else if (saved) {
        setHistory(createHistory(saved));
        setSelectedId(saved.objects.find(isWordObject)?.id ?? saved.objects[0]?.id ?? '');
        setNotice('A composição salva foi preservada.');
      }
    } else if (saved) {
      setHistory(createHistory(saved));
      setSelectedId(saved.objects.find(isWordObject)?.id ?? saved.objects[0]?.id ?? '');
    }
    setReady(true);
  }, [initialText, storageKey, templateId]);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(storageKey, JSON.stringify(scene)); }
    catch { setNotice('Não foi possível salvar neste navegador.'); }
  }, [scene, ready, storageKey]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() === 'z') { event.preventDefault(); setHistory(current => event.shiftKey ? redoHistory(current) : undoHistory(current)); }
      else if (event.key.toLowerCase() === 'y') { event.preventDefault(); setHistory(redoHistory); }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, []);

  const setScene = (change: (current: Scene) => Scene) => setHistory(current => commitHistory(current, change(current.present)));
  const updateObject = (id: string, mutate: (object: SceneObject) => void) => setScene(current => {
    const next = clone(current); const object = next.objects.find(candidate => candidate.id === id); if (object) mutate(object); return next;
  });
  const updateWord = (id: string, mutate: (word: WordObject) => void) => updateObject(id, object => { if (isWordObject(object)) mutate(object); });
  const updateBoard = (mutate: (item: BoardObject) => void) => { if (board) updateObject(board.id, object => { if (object.type === 'board') mutate(object); }); };
  const select = (id: string, additive: boolean) => {
    setSelectedId(id); setSelectedGlyph('');
    setMulti(current => additive ? [...new Set([...current, id])] : [id]);
  };
  const editText = (text: string) => updateWord(selectedId, word => {
    const old = word.glyphs;
    word.text = text.replace(/[\r\n]+/g, ' ').slice(0, 160); word.name = word.text || 'Texto';
    word.glyphs = Array.from(word.text, (char, index) => ({ id: old[index]?.id ?? uid(), char, offset: old[index]?.offset ?? { x: 0, y: 0 }, scale: old[index]?.scale ?? 1 }));
  });
  const addWord = () => {
    const text = draft.replace(/[\r\n]+/g, ' ').trim().slice(0, 160); if (!text) return;
    const placement = placeWordInOpenSpace(scene, makeWord(text));
    const word = placement.word;
    setScene(current => ({ ...current, objects: [...current.objects, word] }));
    setSelectedId(word.id); setSelectedGlyph(''); setMulti([word.id]);
    setNotice(placement.insideBoard ? '' : 'Não há espaço livre dentro da placa sem sobreposição; a nova palavra foi colocada ao lado.');
  };
  const loadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    try {
      const data = validateScene(JSON.parse(await file.text()));
      setHistory(createHistory(data)); setSelectedId(data.objects.find(isWordObject)?.id ?? data.objects[0]?.id ?? ''); setSelectedGlyph(''); setMulti([]); setNotice('Projeto carregado e validado.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Não foi possível carregar o projeto.'); }
  };
  const download = (filename: string, content: string, type: string) => {
    const url = URL.createObjectURL(new Blob([content], { type })); const anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const groupSelected = () => {
    const ids = [...new Set(multi)].filter(id => scene.objects.some(object => object.id === id && object.type === 'text'));
    if (ids.length < 2) { setNotice('Selecione pelo menos duas palavras com Ctrl ou ⌘.'); return; }
    const group = makeGroup(ids); setScene(current => ({ ...current, objects: [...current.objects.map(object => ids.includes(object.id) ? { ...object, parentId: group.id } : object), group] }));
    setSelectedId(group.id); setSelectedGlyph(''); setMulti([group.id]); setNotice('Grupo criado; os textos continuam editáveis individualmente.');
  };
  const ungroup = () => {
    const groupId = selectedObject?.type === 'group' ? selectedObject.id : selectedObject?.parentId; if (!groupId) return;
    setScene(current => ({ ...current, objects: current.objects.filter(object => object.id !== groupId).map(object => object.parentId === groupId ? { ...object, parentId: null } : object) }));
    setSelectedId(''); setMulti([]); setNotice('Grupo desfeito.');
  };
  const applyLayout = (operation: 'fit' | 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom' | 'distributeX' | 'distributeY') => {
    const ids = multi.length ? multi : selectedId ? [selectedId] : [];
    if (!ids.length) { setNotice('Selecione os objetos que deseja arranjar.'); return; }
    try {
      const next = operation === 'fit' ? fitObjectsToBoard(scene, ids, scene.plate.padding)
        : operation === 'distributeX' || operation === 'distributeY' ? distributeObjects(scene, ids, operation === 'distributeX' ? 'x' : 'y')
          : alignObjects(scene, ids, operation, scene.plate.padding);
      if (next === scene) { setNotice(operation.startsWith('distribute') ? 'Selecione ao menos três objetos para distribuir.' : 'Nenhum objeto editável selecionado.'); return; }
      setScene(() => next); setNotice('Arranjo aplicado.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Não foi possível arranjar os objetos.'); }
  };
  const changeGlyph = (key: 'x' | 'y' | 'scale', value: number) => updateWord(selectedId, word => {
    const selectedItem = word.glyphs.find(item => item.id === selectedGlyph); if (!selectedItem) return;
    if (key === 'scale') selectedItem.scale = value; else selectedItem.offset[key] = value;
    word.text = word.glyphs.map(item => item.char).join(''); word.name = word.text || 'Texto';
  });
  const changeGlyphChar = (value: string) => {
    const char = Array.from(value.replace(/[\r\n]/g, ' ')).slice(0, 1).join('');
    updateWord(selectedId, word => { const item = word.glyphs.find(candidate => candidate.id === selectedGlyph); if (item) item.char = char; word.text = word.glyphs.map(candidate => candidate.char).join(''); word.name = word.text || 'Texto'; });
  };
  const numberField = (label: string, value: number, onChange: (value: number) => void, min = -1000, max = 2000, step = 1) => <label className={ui.field} key={label}><span>{label}</span><CampoMarca type="number" min={min} max={max} step={step} value={value} onChange={event => { const next = Number(event.target.value); if (Number.isFinite(next) && next >= min && next <= max) onChange(next); }}/></label>;
  const drawObject = (object: SceneObject) => {
    if (!object.visible || object.type === 'group') return null;
    if (object.type === 'text') {
      const selection = wordBounds(object);
      return <g key={object.id} onClick={event => { event.stopPropagation(); select(object.id, event.ctrlKey || event.metaKey); }} opacity={object.material.opacity}>
        {selectedId === object.id && <rect x={selection.x - 4} y={selection.y - 4} width={selection.width + 8} height={selection.height + 8} className={ui.selectionBox}/>}
        {layoutWord(object).map(item => <text key={item.id} x={item.x} y={item.y} fontSize={item.fontSize} fontFamily={object.fontFamily} fill={object.material.color} transform={`translate(${item.x} ${item.y}) rotate(${item.rotation}) scale(${item.scaleX} ${item.scaleY}) translate(${-item.x} ${-item.y})`} onClick={event => { event.stopPropagation(); setSelectedId(object.id); setSelectedGlyph(item.id); setMulti(current => event.ctrlKey || event.metaKey ? [...new Set([...current, object.id])] : [object.id]); }}>{item.char || ' '}</text>)}
      </g>;
    }
    const b = objectBounds(scene, object);
    return <rect key={object.id} x={b.x} y={b.y} width={b.width} height={b.height} rx={object.type === 'board' ? object.cornerRadius : 0} fill={object.material.color} stroke={selectedId === object.id ? 'var(--marca-azul)' : 'none'} strokeWidth="2" onClick={event => { event.stopPropagation(); select(object.id, event.ctrlKey || event.metaKey); }}/>
  };
  const renderObjects = [...scene.objects].sort((a, b) => Number(b.type === 'board') - Number(a.type === 'board'));
  const transferWords = (multi.length ? multi : selectedId ? [selectedId] : []).flatMap(id => {
    const object = scene.objects.find(item => item.id === id);
    if (object?.type === 'text') return [object.text];
    if (object?.type === 'group') return object.childIds.flatMap(childId => { const child = scene.objects.find(item => item.id === childId); return child?.type === 'text' ? [child.text] : []; });
    return [];
  });
  const transferText = [...new Set(transferWords)].join(' ').trim();

  return <main className={`${ESCOPO_MARCA} ${ui.shell}`}>
    <header className={ui.topbar}>
      <div className="flex items-center gap-4"><Wordmark tamanho={22} subtitulo={null} /><span className="text-marca-mini font-extrabold tracking-[0.14em] text-marca-texto-3">COMPOSIÇÃO 2D</span></div>
      <div className={ui.actions}>
        <BotaoMarca variante="fantasma" pequeno href="/criar">← Catálogo</BotaoMarca>
        {onSwitchTo3D && <BotaoMarca variante="contorno" pequeno onClick={onSwitchTo3D}>Gerador 3D</BotaoMarca>}
        <BotaoMarca variante="contorno" pequeno onClick={() => setHistory(undoHistory)} disabled={!history.past.length}>Desfazer</BotaoMarca>
        <BotaoMarca variante="contorno" pequeno onClick={() => setHistory(redoHistory)} disabled={!history.future.length}>Refazer</BotaoMarca>
        <BotaoMarca variante="contorno" pequeno onClick={() => fileRef.current?.click()}>Abrir JSON</BotaoMarca>
        <BotaoMarca variante="contorno" pequeno onClick={() => download('composicao-2d.json', serializeScene(scene), 'application/json')}>Salvar JSON</BotaoMarca>
        <BotaoMarca pequeno className="max-[760px]:order-first" onClick={() => download('composicao-2d.svg', exportSvg(scene), 'image/svg+xml')}>Exportar SVG ↗</BotaoMarca>
        <input ref={fileRef} className={ui.hidden} type="file" accept="application/json,.json" onChange={loadFile}/>
      </div>
    </header>
    <div className={ui.notice}><strong>Composição 2D / SVG; não gera malha 3D imprimível.</strong><span>O SVG mantém o texto como fonte visual, não como contorno de corte.</span></div>
    <div className={ui.workspace}>
      <aside className={ui.panel}>
        <p className={ui.kicker}>PROJETO 2D</p><h1 className="mb-2 font-display text-xl font-black tracking-tight text-marca-navy">Placa personalizada</h1><p className={ui.muted}>Adicione palavras, edite glifos e organize a composição em milímetros.</p>
        <div className={ui.addRow}><input aria-label="Nova palavra" value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => event.key === 'Enter' && addWord()}/><button type="button" onClick={addWord}>Adicionar palavra</button></div>
        <div className={ui.objectList}>{scene.objects.filter(object => object.type === 'board' || object.type === 'text' || object.type === 'group').map((object, index) => <button type="button" key={object.id} className={`${ui.objectRow} ${selectedId === object.id ? ui.activeRow : ''}`} onClick={event => select(object.id, event.ctrlKey || event.metaKey)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{object.name}</strong><small>{object.type === 'text' ? 'Aa' : object.type === 'group' ? 'GRUPO' : 'PLACA'}</small></button>)}</div>
        <p className={ui.kicker}>DIMENSÕES DA PLACA</p><div className={ui.grid}>
          {board && numberField('LARGURA (mm)', board.width, value => updateBoard(item => { item.width = Math.max(value, 2 * scene.plate.padding + 1); }), 20, 2000)}
          {board && numberField('ALTURA (mm)', board.height, value => updateBoard(item => { item.height = Math.max(value, 2 * scene.plate.padding + 1); }), 20, 1000)}
          {numberField('MARGEM (mm)', scene.plate.padding, value => setScene(current => ({ ...current, plate: { ...current.plate, padding: Math.max(0, Math.min(value, (Math.min(board?.width ?? 300, board?.height ?? 100) - 1) / 2)) } })), 0, 500)}
          {numberField('FONTE (mm)', selected?.fontSize ?? 42, value => selected && updateWord(selected.id, word => { word.fontSize = value; }), 1, 500)}
        </div>
        <button className={ui.secondary} type="button" onClick={() => applyLayout('fit')}>Ajustar seleção à placa</button>
        {selected && <>
          <p className={ui.kicker}>TEXTO SELECIONADO</p>
          <label className={ui.field}><span>CONTEÚDO</span><textarea rows={2} value={selected.text} onChange={event => editText(event.target.value)}/></label>
          <div className={ui.grid}>
            {numberField('X (mm)', glyph ? glyph.offset.x : selected.transform.x, value => glyph ? changeGlyph('x', value) : updateWord(selected.id, word => { word.transform.x = value; }))}
            {numberField('Y (mm)', glyph ? glyph.offset.y : selected.transform.y, value => glyph ? changeGlyph('y', value) : updateWord(selected.id, word => { word.transform.y = value; }))}
            {numberField(glyph ? 'ESCALA DO GLIFO' : 'ESCALA', glyph ? glyph.scale : selected.transform.scaleX, value => glyph ? changeGlyph('scale', value) : updateWord(selected.id, word => { word.transform.scaleX = word.transform.scaleY = word.transform.scaleZ = value; }), 0.1, 10, 0.1)}
            {numberField('ESPAÇAMENTO (mm)', selected.spacing, value => updateWord(selected.id, word => { word.spacing = value; }), -100, 300, 0.5)}
          </div>
          {glyph && <><label className={ui.field}><span>CARACTERE SELECIONADO</span><input maxLength={2} value={glyph.char} onChange={event => changeGlyphChar(event.target.value)}/></label><button type="button" className={ui.secondary} onClick={() => setSelectedGlyph('')}>Selecionar palavra inteira</button></>}
        </>}
        {selectedObject && <div className={ui.arrange}><p className={ui.kicker}>ALINHAR / DISTRIBUIR</p><div className={ui.layoutGrid}>{(['left', 'centerX', 'right', 'top', 'centerY', 'bottom', 'distributeX', 'distributeY'] as const).map((action, index) => <button type="button" key={action} onClick={() => applyLayout(action)}>{['Esquerda', 'Centro X', 'Direita', 'Topo', 'Centro Y', 'Base', 'Distribuir X', 'Distribuir Y'][index]}</button>)}</div></div>}
        <button type="button" className={ui.secondary} onClick={groupSelected}>Agrupar palavras selecionadas</button>
        {Boolean(selectedObject?.type === 'group' || selectedObject?.parentId) && <button type="button" className={ui.secondary} onClick={ungroup}>Desagrupar</button>}
        {transferText && <div className={ui.transfer}><TransferirFormma3D text={transferText}/><small>Só o texto selecionado é levado. A placa, as posições, os grupos e a composição SVG não viram geometria 3D.</small></div>}
        <p className={ui.helper}>{selectedGlyph ? 'Edite o caractere selecionado ou escolha a palavra inteira.' : 'Use Ctrl/⌘+clique para selecionar várias palavras.'}</p>
      </aside>
      <section className={ui.canvasArea} aria-label="Prévia da composição 2D">
        <div className={ui.canvasHeader}><span>ÁREA DE COMPOSIÇÃO</span><span>{board?.width ?? Math.round(bounds.width)} × {board?.height ?? Math.round(bounds.height)} mm</span></div>
        <div className={ui.canvas}><svg className={ui.preview} viewBox={`0 0 ${board?.width ?? bounds.width} ${board?.height ?? bounds.height}`} role="img" aria-label={`Prévia 2D da placa ${board?.width ?? Math.round(bounds.width)} por ${board?.height ?? Math.round(bounds.height)} milímetros`} onClick={() => { setSelectedId(''); setSelectedGlyph(''); setMulti([]); }}>
          <rect x="0.5" y="0.5" width={(board?.width ?? bounds.width) - 1} height={(board?.height ?? bounds.height) - 1} rx={board?.cornerRadius ?? 8} fill="var(--marca-branco)" stroke="var(--marca-linha-forte)" strokeWidth="1"/>
          <rect x={scene.plate.padding} y={scene.plate.padding} width={Math.max(0, (board?.width ?? bounds.width) - 2 * scene.plate.padding)} height={Math.max(0, (board?.height ?? bounds.height) - 2 * scene.plate.padding)} fill="none" stroke="var(--marca-ciano)" strokeDasharray="3 3" strokeWidth="0.6"/>
          {renderObjects.map(drawObject)}
        </svg></div>
        <div className={ui.canvasFooter}><span>VISUALIZAÇÃO SVG</span><span>{words.length} PALAVRAS · {scene.objects.reduce((sum, item) => sum + (item.type === 'text' ? item.glyphs.length : 0), 0)} GLIFOS</span></div>
      </section>
    </div>
    <footer className={ui.footer}>{notice || 'Rascunho salvo automaticamente neste navegador.'}<span>COMPOSIÇÃO 2D · SVG</span></footer>
  </main>;
}
