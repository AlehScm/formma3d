import { makeGroup, makeMaterial, makeTransform } from './model';
import type { GeneratorValue, Point, Scene, SceneObject, WordObject } from './model';

type UnknownRecord = Record<string, unknown>;

export function validateScene(value: unknown): Scene {
  if (!isRecord(value)) throw new Error('Projeto inválido.');
  if (value.schemaVersion === 1) return migrateSceneV1(value);
  if (value.schemaVersion !== 2 || value.units !== 'mm' || !Array.isArray(value.objects) || !validPlate(value.plate)) throw new Error('Estrutura do projeto incompatível.');
  const ids = new Set<string>(); const objectIds = new Set<string>();
  for (const candidate of value.objects) validateObject(candidate, ids, objectIds);
  const groups = new Set(value.objects.filter(isRecord).filter(object => object.type === 'group').map(object => object.id));
  for (const candidate of value.objects) {
    const object = candidate as SceneObject;
    if (object.parentId !== null && !groups.has(object.parentId)) throw new Error('Objeto referencia um grupo inexistente.');
    if (object.type === 'group' && (object.childIds.includes(object.id) || object.childIds.some(id => !objectIds.has(id)))) throw new Error('Grupo contém referências inválidas.');
  }
  return value as Scene;
}

export const serializeScene = (scene: Scene) => JSON.stringify(scene, null, 2);

function validateObject(value: unknown, ids: Set<string>, objectIds: Set<string>) {
  if (!isRecord(value) || !validId(value.id) || ids.has(value.id) || !validBaseObject(value)) throw new Error('Objeto inválido.');
  ids.add(value.id); objectIds.add(value.id);
  switch (value.type) {
    case 'text': validateTextObject(value, ids); break;
    case 'board': if (!positive(value.width) || !positive(value.height) || !positive(value.depth) || !nonNegative(value.cornerRadius)) throw new Error('Placa inválida.'); break;
    case 'shape': if (!['rectangle', 'ellipse'].includes(String(value.shape)) || !positive(value.width) || !positive(value.height) || !positive(value.depth)) throw new Error('Forma inválida.'); break;
    case 'svg': if (typeof value.source !== 'string' || typeof value.viewBox !== 'string' || !positive(value.width) || !positive(value.height) || !positive(value.depth)) throw new Error('SVG inválido.'); break;
    case 'generator': if (!validId(value.generatorId) || !isRecord(value.parameters) || !Object.values(value.parameters).every(isGeneratorValue) || !positive(value.width) || !positive(value.height) || !positive(value.depth)) throw new Error('Objeto gerado inválido.'); break;
    case 'group': if (!Array.isArray(value.childIds) || !value.childIds.every(validId) || new Set(value.childIds).size !== value.childIds.length) throw new Error('Grupo inválido.'); break;
    default: throw new Error('Tipo de objeto desconhecido.');
  }
}

function validateTextObject(value: UnknownRecord, ids: Set<string>) {
  if (typeof value.text !== 'string' || !finite(value.spacing) || typeof value.fontFamily !== 'string' || !positive(value.fontSize) || !Array.isArray(value.glyphs)) throw new Error('Objeto de texto inválido.');
  for (const candidate of value.glyphs) {
    if (!isRecord(candidate) || !validId(candidate.id) || ids.has(candidate.id) || typeof candidate.char !== 'string' || Array.from(candidate.char).length > 1 || !validPoint(candidate.offset) || !positive(candidate.scale)) throw new Error('Glifo inválido.');
    ids.add(candidate.id);
  }
  if (value.glyphs.map(candidate => (candidate as UnknownRecord).char).join('') !== value.text) throw new Error('Texto e glifos não correspondem.');
}

function validBaseObject(value: UnknownRecord) {
  return typeof value.name === 'string' && typeof value.visible === 'boolean' && typeof value.locked === 'boolean'
    && (value.parentId === null || validId(value.parentId)) && validTransform(value.transform) && isRecord(value.material)
    && typeof value.material.color === 'string' && finite(value.material.opacity) && value.material.opacity >= 0 && value.material.opacity <= 1
    && typeof value.material.printable === 'boolean';
}

function validTransform(value: unknown) {
  if (!isRecord(value)) return false;
  return finite(value.x) && finite(value.y) && finite(value.z) && finite(value.rotationX) && finite(value.rotationY) && finite(value.rotationZ)
    && positive(value.scaleX) && positive(value.scaleY) && positive(value.scaleZ);
}

function migrateSceneV1(value: UnknownRecord): Scene {
  if (!Array.isArray(value.objects) || !validPlate(value.plate)) throw new Error('Projeto legado inválido.');
  const groups = new Map<string, WordObject[]>();
  const objects: SceneObject[] = value.objects.map(candidate => {
    if (!isRecord(candidate) || candidate.type !== 'text' || !validId(candidate.id) || typeof candidate.text !== 'string' || !Array.isArray(candidate.glyphs) || !isRecord(candidate.transform)) throw new Error('Objeto legado inválido.');
    const scale = Number(candidate.transform.scale);
    if (!finite(candidate.transform.x) || !finite(candidate.transform.y) || !positive(scale) || !finite(candidate.spacing)) throw new Error('Transformação legada inválida.');
    const word: WordObject = { id: candidate.id, name: candidate.text || 'Texto', type: 'text', transform: { ...makeTransform(Number(candidate.transform.x), Number(candidate.transform.y)), scaleX: scale, scaleY: scale, scaleZ: scale }, visible: true, locked: false, parentId: null, material: makeMaterial(), text: candidate.text, spacing: Number(candidate.spacing), fontFamily: 'Arial, sans-serif', fontSize: 48, glyphs: candidate.glyphs.map(glyph => {
      if (!isRecord(glyph) || !validId(glyph.id) || typeof glyph.char !== 'string' || !validPoint(glyph.offset) || !positive(glyph.scale)) throw new Error('Glifo legado inválido.');
      return { id: glyph.id, char: glyph.char, offset: { x: Number(glyph.offset.x), y: Number(glyph.offset.y) }, scale: Number(glyph.scale) };
    }) };
    if (typeof candidate.groupId === 'string') groups.set(candidate.groupId, [...(groups.get(candidate.groupId) ?? []), word]);
    return word;
  });
  for (const members of groups.values()) { const group = makeGroup(members.map(member => member.id)); for (const member of members) member.parentId = group.id; objects.push(group); }
  return validateScene({ schemaVersion: 2, units: 'mm', objects, plate: value.plate });
}

function validPlate(value: unknown): value is Scene['plate'] { return isRecord(value) && typeof value.enabled === 'boolean' && nonNegative(value.padding); }
function isRecord(value: unknown): value is UnknownRecord { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function validPoint(value: unknown): value is Point { return isRecord(value) && finite(value.x) && finite(value.y); }
function validId(value: unknown): value is string { return typeof value === 'string' && value.length > 0; }
function finite(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
function positive(value: unknown): boolean { return finite(value) && value > 0; }
function nonNegative(value: unknown): boolean { return finite(value) && value >= 0; }
function isGeneratorValue(value: unknown): value is GeneratorValue { return typeof value === 'string' || typeof value === 'boolean' || finite(value); }
