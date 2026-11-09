import { describe, expect, it } from 'vitest';
import { summaryData } from './summaryCard.js';
import { weekStats } from './stats.js';

describe('summaryData', () => {
  it('prepara los datos de la tarjeta', () => {
    const log = { '2026-11-09': { rounds: 2, min: 90, by: { s1: 60, s2: 30, gone: 5 } } };
    const week = weekStats({ todos: [], tasks: [] }, log, '2026-11-10');
    const d = summaryData(week, { days: 3 }, [{ id: 's1', name: 'Bases de Datos', color: '#f00' }, { id: 's2', name: 'Marketing', color: '#0f0' }]);
    expect(d.focus).toBe('1 h 30 min');
    expect(d.streak).toBe(3);
    expect(d.subjects.map((s) => s.name)).toEqual(['Bases de Datos', 'Marketing']); // 'gone' no existe → fuera
    expect(d.days).toHaveLength(7);
    expect(d.range).toMatch(/9 de noviembre/);
  });
});
