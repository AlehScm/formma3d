import type { Bounds } from './layout';
import { objectBounds, unionBounds } from './layout';
import type { BoardObject, Scene, SceneObject } from './model';

export type Alignment = 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom';
export type Axis = 'x' | 'y';
type Selection = { scene: Scene; objects: SceneObject[]; board?: BoardObject };

function prepare(scene: Scene, ids: string[]): Selection {
  const next: Scene = structuredClone(scene); const selected = new Set(ids);
  const selectedBoard = next.objects.find((object): object is BoardObject => object.type === 'board' && selected.has(object.id));
  const board = selectedBoard ?? next.objects.find((object): object is BoardObject => object.type === 'board' && object.visible);
  const movable = new Set<string>();
  function add(id: string, visiting: Set<string>) {
    if (visiting.has(id)) return;
    const object = next.objects.find(candidate => candidate.id === id);
    if (!object || object.locked || !object.visible || object.type === 'board') return;
    if (object.type === 'group') { const branch = new Set(visiting); branch.add(id); object.childIds.forEach(childId => add(childId, branch)); } else movable.add(id);
  }
  ids.forEach(id => add(id, new Set()));
  return { scene: next, objects: next.objects.filter(object => movable.has(object.id)), board };
}

function interior(scene: Scene, board: BoardObject, margin: number): Bounds {
  if (!Number.isFinite(margin) || margin < 0) throw new Error('A margem deve ser um número não negativo.');
  const bounds = objectBounds(scene, board);
  if (bounds.width <= margin * 2 || bounds.height <= margin * 2) throw new Error('A margem excede a área da placa.');
  return { x: bounds.x + margin, y: bounds.y + margin, width: bounds.width - margin * 2, height: bounds.height - margin * 2 };
}
function center(bounds: Bounds, axis: Axis) { return axis === 'x' ? bounds.x + bounds.width / 2 : bounds.y + bounds.height / 2; }
function translate(object: SceneObject, axis: Axis, delta: number) { object.transform[axis] += delta; }

export function alignObjects(scene: Scene, ids: string[], alignment: Alignment, margin = 0): Scene {
  const selection = prepare(scene, ids); if (!selection.objects.length) return scene;
  const source = unionBounds(selection.objects.map(object => objectBounds(selection.scene, object)));
  const target = selection.board ? interior(selection.scene, selection.board, margin) : source;
  const axis: Axis = ['left', 'centerX', 'right'].includes(alignment) ? 'x' : 'y';
  for (const object of selection.objects) {
    const bounds = objectBounds(selection.scene, object); let delta = 0;
    switch (alignment) {
      case 'left': delta = target.x - bounds.x; break;
      case 'centerX': delta = center(target, 'x') - center(bounds, 'x'); break;
      case 'right': delta = target.x + target.width - bounds.x - bounds.width; break;
      case 'top': delta = target.y - bounds.y; break;
      case 'centerY': delta = center(target, 'y') - center(bounds, 'y'); break;
      case 'bottom': delta = target.y + target.height - bounds.y - bounds.height; break;
    }
    translate(object, axis, delta);
  }
  return selection.scene;
}

export function distributeObjects(scene: Scene, ids: string[], axis: Axis): Scene {
  const selection = prepare(scene, ids); if (selection.objects.length < 3) return scene;
  const start = (bounds: Bounds) => axis === 'x' ? bounds.x : bounds.y; const size = (bounds: Bounds) => axis === 'x' ? bounds.width : bounds.height;
  const entries = selection.objects.map(object => ({ object, bounds: objectBounds(selection.scene, object) })).sort((a, b) => start(a.bounds) - start(b.bounds));
  const first = entries[0]; const last = entries[entries.length - 1];
  if (!first || !last) return scene;
  const span = start(last.bounds) + size(last.bounds) - start(first.bounds);
  const gap = (span - entries.reduce((sum, entry) => sum + size(entry.bounds), 0)) / (entries.length - 1);
  let cursor = start(first.bounds) + size(first.bounds) + gap;
  for (const entry of entries.slice(1, -1)) { translate(entry.object, axis, cursor - start(entry.bounds)); cursor += size(entry.bounds) + gap; }
  return selection.scene;
}

export function fitObjectsToBoard(scene: Scene, ids: string[], margin: number): Scene {
  const selection = prepare(scene, ids); if (!selection.objects.length) return scene;
  if (!selection.board) throw new Error('Crie ou selecione uma placa para ajustar os objetos.');
  const target = interior(selection.scene, selection.board, margin); const source = unionBounds(selection.objects.map(object => objectBounds(selection.scene, object)));
  if (source.width <= 0 || source.height <= 0) return scene;
  const factor = Math.min(1, target.width / source.width, target.height / source.height);
  for (const object of selection.objects) { object.transform.x = source.x + (object.transform.x - source.x) * factor; object.transform.y = source.y + (object.transform.y - source.y) * factor; object.transform.scaleX *= factor; object.transform.scaleY *= factor; }
  const fitted = unionBounds(selection.objects.map(object => objectBounds(selection.scene, object))); const dx = center(target, 'x') - center(fitted, 'x'); const dy = center(target, 'y') - center(fitted, 'y');
  for (const object of selection.objects) { translate(object, 'x', dx); translate(object, 'y', dy); }
  return selection.scene;
}
