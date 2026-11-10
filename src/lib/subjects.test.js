import { describe, expect, it } from 'vitest';
import { duplicateGroups, planMerge, subjectUsage } from './subjects.js';

const state = {
  subjects: [{ id: 'a', name: 'Inglés', programId: 'p1' }, { id: 'b', name: 'ingles ' }, { id: 'c', name: 'Marketing' }],
  classes: [{ id: 'c1', subjectId: 'b' }],
  exams: [{ id: 'e1', subjectId: 'b' }, { id: 'e2', subjectId: 'a' }],
  grades: [{ id: 'g1', subjectId: 'b' }],
  notes: [{ id: 'n1', subjectId: 'c' }],
};

describe('asignaturas', () => {
  it('cuenta lo que tiene cada una', () => {
    expect(subjectUsage(state, 'b')).toEqual({ classes: 1, exams: 1, grades: 1 });
  });
  it('detecta repetidas aunque cambien tildes, mayúsculas o espacios', () => {
    const g = duplicateGroups(state.subjects);
    expect(g).toHaveLength(1);
    expect(g[0].map((s) => s.id)).toEqual(['a', 'b']);
  });
  it('el plan de fusión mueve todo y hereda los estudios', () => {
    const p = planMerge(state, 'b', 'a');
    expect(p.moves).toEqual({ classes: ['c1'], exams: ['e1'], grades: ['g1'] });
    expect(p.total).toBe(3);
    expect(p.patch).toBeNull(); // 'a' ya tiene estudios
    expect(planMerge(state, 'a', 'b').patch).toEqual({ id: 'b', programId: 'p1' });
  });
  it('no fusiona una consigo misma ni con una que no existe', () => {
    expect(planMerge(state, 'a', 'a')).toBeNull();
    expect(planMerge(state, 'a', 'zzz')).toBeNull();
  });
});
