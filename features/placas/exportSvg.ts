import type { Scene, SceneObject } from './model';
import { layoutWord, objectBounds, sceneBounds } from './layout';

export function exportSvg(scene: Scene) {
  const board = scene.objects.find((object): object is Extract<SceneObject, { type: 'board' }> => object.type === 'board' && object.visible);
  const bounds = board ? objectBounds(scene, board) : sceneBounds(scene, scene.plate.enabled ? scene.plate.padding : 0);
  const objects = scene.objects.filter(object => object.visible).sort((left, right) => Number(right.type === 'board') - Number(left.type === 'board')).map(renderObject).join('');
  const plate = scene.plate.enabled && !board ? `<rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" rx="12" fill="#ffffff" stroke="#102a50" stroke-width="2"/>` : '';
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bounds.x - 30} ${bounds.y - 30} ${bounds.width + 60} ${bounds.height + 60}"><desc>Composição visual 2D em SVG. Texto permanece em fonte visual e não foi convertido em contornos; este arquivo não representa uma malha 3D imprimível.</desc>${plate}${objects}</svg>`;
}

function renderObject(object: SceneObject) {
  if (object.type === 'group') return '';
  const color = escapeXml(object.material.color); const opacity = object.material.opacity;
  if (object.type === 'text') {
    return `<g data-object-id="${escapeXml(object.id)}">${layoutWord(object).map(glyph => `<text x="${glyph.x}" y="${glyph.y}" font-family="${escapeXml(object.fontFamily)}" font-size="${glyph.fontSize}" font-weight="700" fill="${color}" opacity="${opacity}" transform="translate(${glyph.x} ${glyph.y}) rotate(${glyph.rotation}) scale(${glyph.scaleX} ${glyph.scaleY}) translate(${-glyph.x} ${-glyph.y})">${escapeXml(glyph.char)}</text>`).join('')}</g>`;
  }
  const transform = `rotate(${object.transform.rotationZ} ${object.transform.x} ${object.transform.y})`;
  if (object.type === 'shape' && object.shape === 'ellipse') return `<ellipse data-object-id="${escapeXml(object.id)}" cx="${object.transform.x + object.width * object.transform.scaleX / 2}" cy="${object.transform.y + object.height * object.transform.scaleY / 2}" rx="${object.width * object.transform.scaleX / 2}" ry="${object.height * object.transform.scaleY / 2}" fill="${color}" opacity="${opacity}" transform="${transform}"/>`;
  const radius = object.type === 'board' ? object.cornerRadius : 0;
  return `<rect data-object-id="${escapeXml(object.id)}" x="${object.transform.x}" y="${object.transform.y}" width="${object.width * object.transform.scaleX}" height="${object.height * object.transform.scaleY}" rx="${radius}" fill="${color}" opacity="${opacity}" transform="${transform}"/>`;
}

function escapeXml(value: string) { return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[character] as string)); }
