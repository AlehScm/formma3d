import type { Scene, SceneObject, WordObject } from './model';
import { isWordObject } from './model';

export type GlyphPlacement = { id: string; char: string; x: number; y: number; fontSize: number; scaleX: number; scaleY: number; rotation: number };
export type Bounds = { x: number; y: number; width: number; height: number };
const glyphWidth = (char: string, fontSize: number) => char === ' ' ? fontSize * 0.35 : /[Iil1|]/.test(char) ? fontSize * 0.3 : /[MW@%]/.test(char) ? fontSize * 0.9 : /[.,:;!'`]/.test(char) ? fontSize * 0.32 : fontSize * 0.68;

export function layoutWord(word: WordObject): GlyphPlacement[] {
  let cursor = 0;
  const radians = word.transform.rotationZ * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return word.glyphs.map(glyph => {
    const localX = cursor + glyph.offset.x;
    const localY = glyph.offset.y;
    const x = word.transform.x + (localX * cosine - localY * sine) * word.transform.scaleX;
    const y = word.transform.y + (localX * sine + localY * cosine) * word.transform.scaleY;
    cursor += glyphWidth(glyph.char, word.fontSize) + word.spacing;
    return { id: glyph.id, char: glyph.char, x, y, fontSize: word.fontSize, scaleX: word.transform.scaleX * glyph.scale, scaleY: word.transform.scaleY * glyph.scale, rotation: word.transform.rotationZ };
  });
}

export function wordBounds(word: WordObject): Bounds {
  const placements = layoutWord(word);
  if (!placements.length) return { x: word.transform.x, y: word.transform.y, width: 1, height: 1 };
  return unionBounds(placements.map(p => rotatedRectBounds(p.x, p.y - p.fontSize * p.scaleY, glyphWidth(p.char, p.fontSize) * p.scaleX, p.fontSize * 1.18 * p.scaleY, p.rotation)));
}

export function objectBounds(scene: Scene, object: SceneObject, seen = new Set<string>()): Bounds {
  if (seen.has(object.id)) return { x: object.transform.x, y: object.transform.y, width: 0, height: 0 };
  seen.add(object.id);
  if (object.type === 'text') return wordBounds(object);
  if (object.type === 'group') {
    const children = object.childIds.map(id => scene.objects.find(candidate => candidate.id === id)).filter((candidate): candidate is SceneObject => Boolean(candidate) && candidate!.visible).map(child => objectBounds(scene, child, seen));
    return children.length ? unionBounds(children) : { x: object.transform.x, y: object.transform.y, width: 0, height: 0 };
  }
  return rotatedRectBounds(object.transform.x, object.transform.y, object.width * object.transform.scaleX, object.height * object.transform.scaleY, object.transform.rotationZ);
}

export function sceneBounds(scene: Scene, padding = 0): Bounds {
  const bounds = scene.objects.filter(object => object.visible && object.type !== 'group').map(object => objectBounds(scene, object));
  if (!bounds.length) return { x: 40, y: 40, width: 300, height: 140 };
  const united = unionBounds(bounds);
  return { x: united.x - padding, y: united.y - padding, width: united.width + padding * 2, height: united.height + padding * 2 };
}

export function placeWordInOpenSpace(scene: Scene, word: WordObject): { word: WordObject; insideBoard: boolean } {
  const board = scene.objects.find((object): object is Extract<SceneObject, { type: 'board' }> => object.type === 'board' && object.visible);
  if (!board) return { word, insideBoard: false };
  const boardBox = objectBounds(scene, board);
  const margin = Math.max(4, scene.plate.enabled ? scene.plate.padding : 4);
  const gap = 4;
  const left = boardBox.x + margin;
  const top = boardBox.y + margin;
  const right = boardBox.x + boardBox.width - margin;
  const bottom = boardBox.y + boardBox.height - margin;
  const occupied = scene.objects.filter(isWordObject).filter(item => item.visible).map(wordBounds);
  const overlaps = (candidate: Bounds) => occupied.some(box => candidate.x < box.x + box.width && candidate.x + candidate.width > box.x && candidate.y < box.y + box.height && candidate.y + candidate.height > box.y);

  for (let fontSize = word.fontSize; fontSize >= 14; fontSize--) {
    const draft = { ...word, fontSize };
    const size = wordBounds({ ...draft, transform: { ...draft.transform, x: left, y: top + fontSize } });
    const xCandidates = [left, ...occupied.map(box => box.x + box.width + gap), ...occupied.map(box => box.x - size.width - gap), right - size.width];
    const yCandidates = [top + fontSize, ...occupied.map(box => box.y + box.height + gap + fontSize), ...occupied.map(box => box.y - gap - fontSize * 0.18)];
    for (const y of yCandidates) {
      for (const x of xCandidates) {
        const candidate = { ...draft, transform: { ...draft.transform, x, y } };
        const bounds = wordBounds(candidate);
        if (bounds.x < left || bounds.y < top || bounds.x + bounds.width > right || bounds.y + bounds.height > bottom || overlaps(bounds)) continue;
        return { word: candidate, insideBoard: true };
      }
    }
  }

  const x = Math.max(boardBox.x + boardBox.width, ...occupied.map(box => box.x + box.width)) + gap;
  return { word: { ...word, fontSize: 14, transform: { ...word.transform, x, y: boardBox.y + margin + 14 } }, insideBoard: false };
}

export function unionBounds(bounds: Bounds[]): Bounds {
  if (!bounds.length) return { x: 0, y: 0, width: 0, height: 0 };
  const x = Math.min(...bounds.map(bound => bound.x)); const y = Math.min(...bounds.map(bound => bound.y));
  const right = Math.max(...bounds.map(bound => bound.x + bound.width)); const bottom = Math.max(...bounds.map(bound => bound.y + bound.height));
  return { x, y, width: right - x, height: bottom - y };
}

function rotatedRectBounds(x: number, y: number, width: number, height: number, degrees: number): Bounds {
  if (degrees === 0) return { x, y, width, height };
  const radians = degrees * Math.PI / 180; const cosine = Math.cos(radians); const sine = Math.sin(radians);
  const corners: [number, number][] = [[0, 0], [width, 0], [0, height], [width, height]];
  const points = corners.map(([localX, localY]) => ({ x: x + localX * cosine - localY * sine, y: y + localX * sine + localY * cosine }));
  const minX = Math.min(...points.map(point => point.x)); const minY = Math.min(...points.map(point => point.y));
  const maxX = Math.max(...points.map(point => point.x)); const maxY = Math.max(...points.map(point => point.y));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
