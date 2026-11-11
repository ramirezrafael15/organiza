import { describe, it, expect } from 'vitest';
import { flatTree, withDescendants, folderPath, validParents } from './folders.js';

const F = [
  { id: 'a', name: 'Bases de Datos' },
  { id: 'b', name: 'Temas', parentId: 'a' },
  { id: 'c', name: 'Tema 1', parentId: 'b' },
  { id: 'd', name: 'Marketing' },
];
describe('subcarpetas', () => {
  it('ordena en árbol con profundidad', () => {
    expect(flatTree(F).map((x) => [x.folder.id, x.depth])).toEqual([['a', 0], ['b', 1], ['c', 2], ['d', 0]]);
  });
  it('calcula descendientes y ruta', () => {
    expect([...withDescendants(F, 'a')].sort()).toEqual(['a', 'b', 'c']);
    expect(folderPath(F, 'c')).toBe('Bases de Datos › Temas › Tema 1');
  });
  it('no deja mover una carpeta dentro de sí misma ni de sus hijas', () => {
    expect(validParents(F, 'a').map((x) => x.folder.id)).toEqual(['d']);
  });
  it('aguanta ciclos y padres que no existen', () => {
    const bad = [{ id: 'x', name: 'X', parentId: 'y' }, { id: 'y', name: 'Y', parentId: 'x' }, { id: 'z', name: 'Z', parentId: 'nope' }];
    expect(flatTree(bad)).toHaveLength(3);
    expect(folderPath(bad, 'x')).toBeTruthy();
  });
});
