export type Point = { x: number; y: number };
export type Transform = Point & { z: number; rotationX: number; rotationY: number; rotationZ: number; scaleX: number; scaleY: number; scaleZ: number };
export type Material = { color: string; opacity: number; printable: boolean };
export type Glyph = { id: string; char: string; offset: Point; scale: number };
export type BaseObject = { id: string; name: string; transform: Transform; visible: boolean; locked: boolean; parentId: string | null; material: Material };
export type WordObject = BaseObject & { type: 'text'; text: string; spacing: number; fontFamily: string; fontSize: number; glyphs: Glyph[] };
export type BoardObject = BaseObject & { type: 'board'; width: number; height: number; depth: number; cornerRadius: number };
export type ShapeObject = BaseObject & { type: 'shape'; shape: 'rectangle' | 'ellipse'; width: number; height: number; depth: number };
export type SvgObject = BaseObject & { type: 'svg'; source: string; viewBox: string; width: number; height: number; depth: number };
export type GeneratedObject = BaseObject & { type: 'generator'; generatorId: string; parameters: Record<string, GeneratorValue>; width: number; height: number; depth: number };
export type GroupObject = BaseObject & { type: 'group'; childIds: string[] };
export type SceneObject = WordObject | BoardObject | ShapeObject | SvgObject | GeneratedObject | GroupObject;
export type GeneratorValue = string | number | boolean;
export type Scene = { schemaVersion: 2; units: 'mm'; objects: SceneObject[]; plate: { enabled: boolean; padding: number } };

let fallbackId = 0;
export const uid = () => globalThis.crypto?.randomUUID?.() ?? `placas-${Date.now()}-${fallbackId++}`;
export function makeTransform(x = 0, y = 0): Transform { return { x, y, z: 0, rotationX: 0, rotationY: 0, rotationZ: 0, scaleX: 1, scaleY: 1, scaleZ: 1 }; }
export function makeMaterial(color = '#102a50'): Material { return { color, opacity: 1, printable: true }; }
function makeBase(name: string, x: number, y: number, color?: string): BaseObject { return { id: uid(), name, transform: makeTransform(x, y), visible: true, locked: false, parentId: null, material: makeMaterial(color) }; }
export function makeWord(text: string, x = 100, y = 100): WordObject {
  return { ...makeBase(text || 'Texto', x, y), type: 'text', text, spacing: 0, fontFamily: 'Arial, sans-serif', fontSize: 42, glyphs: Array.from(text, char => ({ id: uid(), char, offset: { x: 0, y: 0 }, scale: 1 })) };
}
export function makeBoard(width = 300, height = 100, x = 0, y = 0): BoardObject { return { ...makeBase('Placa', x, y, '#ffffff'), type: 'board', width, height, depth: 3, cornerRadius: 8 }; }
export function makeShape(shape: ShapeObject['shape'], width: number, height: number, x = 100, y = 100): ShapeObject { return { ...makeBase(shape === 'rectangle' ? 'Retângulo' : 'Elipse', x, y), type: 'shape', shape, width, height, depth: 1 }; }
export function makeGroup(childIds: string[], name = 'Grupo'): GroupObject { return { ...makeBase(name, 0, 0), type: 'group', childIds: [...new Set(childIds)] }; }
export function isWordObject(object: SceneObject): object is WordObject { return object.type === 'text'; }
export function isRenderableObject(object: SceneObject): object is Exclude<SceneObject, GroupObject> { return object.type !== 'group'; }
export const initialScene: Scene = { schemaVersion: 2, units: 'mm', objects: [makeBoard(), makeWord('SUA MARCA', 56, 58)], plate: { enabled: true, padding: 12 } };
