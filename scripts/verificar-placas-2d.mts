import { exportSvg } from '../features/placas/exportSvg';
import { objectBounds, placeWordInOpenSpace, wordBounds } from '../features/placas/layout';
import { makeGroup, makeWord, initialScene, isWordObject } from '../features/placas/model';
import { serializeScene, validateScene } from '../features/placas/projectIO';

let failures = 0;
let total = 0;
const check = (label: string, condition: boolean) => {
  total++;
  if (!condition) failures++;
  console.log(`${condition ? '  ok  ' : ' FALHA'}  ${label}`);
};

const scene = structuredClone(initialScene);
const first = scene.objects.find(isWordObject);
if (!first) throw new Error('A cena inicial precisa conter texto.');
const firstTransform = structuredClone(first.transform);
const placement = placeWordInOpenSpace(scene, makeWord('SEGUNDA'));
const second = placement.word;
const group = makeGroup([first.id, second.id], 'Composição');
first.parentId = group.id;
second.parentId = group.id;
scene.objects.push(second, group);

const restored = validateScene(JSON.parse(serializeScene(scene)));
const words = restored.objects.filter(isWordObject);
const restoredGroup = restored.objects.find(object => object.type === 'group');
const board = restored.objects.find(object => object.type === 'board' && object.visible);
check('duas palavras sobrevivem ao serialize/validate', words.length === 2);
check('grupo preserva os membros', restoredGroup?.type === 'group' && restoredGroup.childIds.length === 2);
check('membros continuam ligados ao grupo', words.every(word => word.parentId === restoredGroup?.id));
check('nova palavra cabe na placa sem sobrepor a existente', Boolean(board && placement.insideBoard && (() => {
  const one = wordBounds(first); const two = wordBounds(second); const area = objectBounds(restored, board);
  return two.x >= area.x && two.y >= area.y && two.x + two.width <= area.x + area.width && two.y + two.height <= area.y + area.height
    && (two.x + two.width <= one.x || one.x + one.width <= two.x || two.y + two.height <= one.y || one.y + one.height <= two.y);
})()));
check('adicionar palavra não altera transformação existente', JSON.stringify(first.transform) === JSON.stringify(firstTransform));

const svg = exportSvg(restored);
check('SVG exporta os glifos das duas palavras', (svg.match(/<text /g) ?? []).length > first.glyphs.length);
check('SVG declara composição 2D sem malha imprimível', svg.includes('não representa uma malha 3D imprimível'));

console.log(`\n${total - failures}/${total} passaram`);
if (failures) process.exitCode = 1;
