import type { Scene } from './model';
export type History = { past: Scene[]; present: Scene; future: Scene[] };
export function createHistory(scene: Scene): History { return { past: [], present: scene, future: [] }; }
export function commitHistory(history: History, next: Scene): History {
  if (next === history.present || JSON.stringify(next) === JSON.stringify(history.present)) return history;
  return { past: [...history.past.slice(-99), history.present], present: next, future: [] };
}
export function undoHistory(history: History): History {
  if (!history.past.length) return history;
  const previous = history.past.at(-1);
  if (!previous) return history;
  return { past: history.past.slice(0, -1), present: previous, future: [history.present, ...history.future] };
}
export function redoHistory(history: History): History {
  if (!history.future.length) return history;
  const next = history.future[0];
  if (!next) return history;
  return { past: [...history.past, history.present], present: next, future: history.future.slice(1) };
}
