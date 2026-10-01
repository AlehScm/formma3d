'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import styles from './EditorPlacas.module.css';
import { exportSvg } from './exportSvg';
import { alignObjects, distributeObjects, fitObjectsToBoard } from './layoutCommands';
import { objectBounds, sceneBounds, layoutWord, placeWordInOpenSpace, wordBounds } from './layout';
import { createHistory, commitHistory, redoHistory, undoHistory } from './history';
import { initialScene, isWordObject, makeGroup, makeWord, uid } from './model';
import type { BoardObject, Scene, SceneObject, WordObject } from './model';
import { serializeScene, validateScene } from './projectIO';
import { TransferirFormma3D } from './TransferirFormma3D';

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
  const numberField = (label: string, value: number, onChange: (value: number) => void, min = -1000, max = 2000, step = 1) => <label className={styles.field} key={label}><span>{label}</span><input type="number" min={min} max={max} step={step} value={value} onChange={event => { const next = Number(event.target.value); if (Number.isFinite(next) && next >= min && next <= max) onChange(next); }}/></label>;
  const drawObject = (object: SceneObject) => {
    if (!object.visible || object.type === 'group') return null;
    if (object.type === 'text') {
      const selection = wordBounds(object);
      return <g key={object.id} onClick={event => { event.stopPropagation(); select(object.id, event.ctrlKey || event.metaKey); }} opacity={object.material.opacity}>
        {selectedId === object.id && <rect x={selection.x - 4} y={selection.y - 4} width={selection.width + 8} height={selection.height + 8} className={styles.selectionBox}/>}
        {layoutWord(object).map(item => <text key={item.id} x={item.x} y={item.y} fontSize={item.fontSize} fontFamily={object.fontFamily} fill={object.material.color} transform={`translate(${item.x} ${item.y}) rotate(${item.rotation}) scale(${item.scaleX} ${item.scaleY}) translate(${-item.x} ${-item.y})`} onClick={event => { event.stopPropagation(); setSelectedId(object.id); setSelectedGlyph(item.id); setMulti(current => event.ctrlKey || event.metaKey ? [...new Set([...current, object.id])] : [object.id]); }}>{item.char || ' '}</text>)}
      </g>;
    }
    const b = objectBounds(scene, object);
    return <rect key={object.id} x={b.x} y={b.y} width={b.width} height={b.height} rx={object.type === 'board' ? object.cornerRadius : 0} fill={object.material.color} stroke={selectedId === object.id ? '#0877b9' : 'none'} strokeWidth="2" onClick={event => { event.stopPropagation(); select(object.id, event.ctrlKey || event.metaKey); }}/>
  };
  const renderObjects = [...scene.objects].sort((a, b) => Number(b.type === 'board') - Number(a.type === 'board'));
  const transferWords = (multi.length ? multi : selectedId ? [selectedId] : []).flatMap(id => {
    const object = scene.objects.find(item => item.id === id);
    if (object?.type === 'text') return [object.text];
    if (object?.type === 'group') return object.childIds.flatMap(childId => { const child = scene.objects.find(item => item.id === childId); return child?.type === 'text' ? [child.text] : []; });
    return [];
  });
  const transferText = [...new Set(transferWords)].join(' ').trim();

  return <main className={styles.shell}>
    <header className={styles.topbar}>
      <Link className={styles.brand} href="/" aria-label="Voltar ao catálogo Scarprint"><span className={styles.brandMark}>S</span><span>SCARPRINT <small>COMPOSIÇÃO 2D</small></span></Link>
      <div className={styles.actions}>
        <Link className={styles.quiet} href="/">← Catálogo</Link>
        {onSwitchTo3D && <button className={styles.quiet} type="button" onClick={onSwitchTo3D}>Gerador 3D</button>}
        <button className={styles.quiet} type="button" onClick={() => setHistory(undoHistory)} disabled={!history.past.length}>Desfazer</button>
        <button className={styles.quiet} type="button" onClick={() => setHistory(redoHistory)} disabled={!history.future.length}>Refazer</button>
        <button className={styles.quiet} type="button" onClick={() => fileRef.current?.click()}>Abrir JSON</button>
        <button className={styles.quiet} type="button" onClick={() => download('composicao-2d.json', serializeScene(scene), 'application/json')}>Salvar JSON</button>
        <button className={styles.primary} type="button" onClick={() => download('composicao-2d.svg', exportSvg(scene), 'image/svg+xml')}>Exportar SVG ↗</button>
        <input ref={fileRef} className={styles.hidden} type="file" accept="application/json,.json" onChange={loadFile}/>
      </div>
    </header>
    <div className={styles.notice}><strong>Composição 2D / SVG; não gera malha 3D imprimível.</strong><span>O SVG mantém o texto como fonte visual, não como contorno de corte.</span></div>
    <div className={styles.workspace}>
      <aside className={styles.panel}>
        <p className={styles.kicker}>PROJETO 2D</p><h1>Placa personalizada</h1><p className={styles.muted}>Adicione palavras, edite glifos e organize a composição em milímetros.</p>
        <div className={styles.addRow}><input aria-label="Nova palavra" value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => event.key === 'Enter' && addWord()}/><button type="button" onClick={addWord}>Adicionar palavra</button></div>
        <div className={styles.objectList}>{scene.objects.filter(object => object.type === 'board' || object.type === 'text' || object.type === 'group').map((object, index) => <button type="button" key={object.id} className={`${styles.objectRow} ${selectedId === object.id ? styles.activeRow : ''}`} onClick={event => select(object.id, event.ctrlKey || event.metaKey)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{object.name}</strong><small>{object.type === 'text' ? 'Aa' : object.type === 'group' ? 'GRUPO' : 'PLACA'}</small></button>)}</div>
        <p className={styles.kicker}>DIMENSÕES DA PLACA</p><div className={styles.grid}>
          {board && numberField('LARGURA (mm)', board.width, value => updateBoard(item => { item.width = Math.max(value, 2 * scene.plate.padding + 1); }), 20, 2000)}
          {board && numberField('ALTURA (mm)', board.height, value => updateBoard(item => { item.height = Math.max(value, 2 * scene.plate.padding + 1); }), 20, 1000)}
          {numberField('MARGEM (mm)', scene.plate.padding, value => setScene(current => ({ ...current, plate: { ...current.plate, padding: Math.max(0, Math.min(value, (Math.min(board?.width ?? 300, board?.height ?? 100) - 1) / 2)) } })), 0, 500)}
          {numberField('FONTE (mm)', selected?.fontSize ?? 42, value => selected && updateWord(selected.id, word => { word.fontSize = value; }), 1, 500)}
        </div>
        <button className={styles.secondary} type="button" onClick={() => applyLayout('fit')}>Ajustar seleção à placa</button>
        {selected && <>
          <p className={styles.kicker}>TEXTO SELECIONADO</p>
          <label className={styles.field}><span>CONTEÚDO</span><textarea rows={2} value={selected.text} onChange={event => editText(event.target.value)}/></label>
          <div className={styles.grid}>
            {numberField('X (mm)', glyph ? glyph.offset.x : selected.transform.x, value => glyph ? changeGlyph('x', value) : updateWord(selected.id, word => { word.transform.x = value; }))}
            {numberField('Y (mm)', glyph ? glyph.offset.y : selected.transform.y, value => glyph ? changeGlyph('y', value) : updateWord(selected.id, word => { word.transform.y = value; }))}
            {numberField(glyph ? 'ESCALA DO GLIFO' : 'ESCALA', glyph ? glyph.scale : selected.transform.scaleX, value => glyph ? changeGlyph('scale', value) : updateWord(selected.id, word => { word.transform.scaleX = word.transform.scaleY = word.transform.scaleZ = value; }), 0.1, 10, 0.1)}
            {numberField('ESPAÇAMENTO (mm)', selected.spacing, value => updateWord(selected.id, word => { word.spacing = value; }), -100, 300, 0.5)}
          </div>
          {glyph && <><label className={styles.field}><span>CARACTERE SELECIONADO</span><input maxLength={2} value={glyph.char} onChange={event => changeGlyphChar(event.target.value)}/></label><button type="button" className={styles.secondary} onClick={() => setSelectedGlyph('')}>Selecionar palavra inteira</button></>}
        </>}
        {selectedObject && <div className={styles.arrange}><p className={styles.kicker}>ALINHAR / DISTRIBUIR</p><div className={styles.layoutGrid}>{(['left', 'centerX', 'right', 'top', 'centerY', 'bottom', 'distributeX', 'distributeY'] as const).map((action, index) => <button type="button" key={action} onClick={() => applyLayout(action)}>{['Esquerda', 'Centro X', 'Direita', 'Topo', 'Centro Y', 'Base', 'Distribuir X', 'Distribuir Y'][index]}</button>)}</div></div>}
        <button type="button" className={styles.secondary} onClick={groupSelected}>Agrupar palavras selecionadas</button>
        {Boolean(selectedObject?.type === 'group' || selectedObject?.parentId) && <button type="button" className={styles.secondary} onClick={ungroup}>Desagrupar</button>}
        {transferText && <div className={styles.transfer}><TransferirFormma3D text={transferText}/><small>Só o texto selecionado é levado. A placa, as posições, os grupos e a composição SVG não viram geometria 3D.</small></div>}
        <p className={styles.helper}>{selectedGlyph ? 'Edite o caractere selecionado ou escolha a palavra inteira.' : 'Use Ctrl/⌘+clique para selecionar várias palavras.'}</p>
      </aside>
      <section className={styles.canvasArea} aria-label="Prévia da composição 2D">
        <div className={styles.canvasHeader}><span>ÁREA DE COMPOSIÇÃO</span><span>{board?.width ?? Math.round(bounds.width)} × {board?.height ?? Math.round(bounds.height)} mm</span></div>
        <div className={styles.canvas}><svg className={styles.preview} viewBox={`0 0 ${board?.width ?? bounds.width} ${board?.height ?? bounds.height}`} role="img" aria-label={`Prévia 2D da placa ${board?.width ?? Math.round(bounds.width)} por ${board?.height ?? Math.round(bounds.height)} milímetros`} onClick={() => { setSelectedId(''); setSelectedGlyph(''); setMulti([]); }}>
          <rect x="0.5" y="0.5" width={(board?.width ?? bounds.width) - 1} height={(board?.height ?? bounds.height) - 1} rx={board?.cornerRadius ?? 8} fill="white" stroke="#9bb2d0" strokeWidth="1"/>
          <rect x={scene.plate.padding} y={scene.plate.padding} width={Math.max(0, (board?.width ?? bounds.width) - 2 * scene.plate.padding)} height={Math.max(0, (board?.height ?? bounds.height) - 2 * scene.plate.padding)} fill="none" stroke="#22c7d9" strokeDasharray="3 3" strokeWidth="0.6"/>
          {renderObjects.map(drawObject)}
        </svg></div>
        <div className={styles.canvasFooter}><span>VISUALIZAÇÃO SVG</span><span>{words.length} PALAVRAS · {scene.objects.reduce((sum, item) => sum + (item.type === 'text' ? item.glyphs.length : 0), 0)} GLIFOS</span></div>
      </section>
    </div>
    <footer className={styles.footer}>{notice || 'Rascunho salvo automaticamente neste navegador.'}<span>COMPOSIÇÃO 2D · SVG</span></footer>
  </main>;
}
