import { describe, it, expect } from 'vitest';
import { entriesOn } from './agenda.js';

describe('entriesOn con pendientes', () => {
  it('incluye pendientes del día y marca los hechos', () => {
    const state = { programs: [], subjects: [], classes: [], events: [], exams: [], tasks: [], settings: {},
      todos: [{ id: 'a', title: 'X', date: '2026-11-03', done: false }, { id: 'b', title: 'Y', date: '2026-11-03', done: true }, { id: 'c', title: 'Z', date: '2026-11-04' }] };
    const r = entriesOn(state, '2026-11-03').filter((e) => e.kind === 'pendiente');
    expect(r.map((e) => e.title).sort()).toEqual(['X', 'Y']);
    expect(r.find((e) => e.title === 'Y').status).toBe('entregado');
  });
});
