import { describe, it, expect } from 'vitest';
import { distribute, parseTopics, planProgress, studyDays } from './studyPlan.js';

describe('plan de estudio', () => {
  it('separa los temas por líneas o comas y quita viñetas', () => {
    expect(parseTopics('Tema 1, Tema 2\n- Tema 3\n\n2) Tema 4')).toEqual(['Tema 1', 'Tema 2', 'Tema 3', 'Tema 4']);
  });
  it('los días van de hoy hasta el día antes del examen', () => {
    expect(studyDays('2026-11-04', '2026-11-07')).toEqual(['2026-11-04', '2026-11-05', '2026-11-06']);
    expect(studyDays('2026-11-07', '2026-11-07')).toEqual([]);
  });
  it('reparte 6 temas en 4 días dejando el último para repasar', () => {
    const days = studyDays('2026-11-04', '2026-11-08'); // 4 días
    const plan = distribute(['a', 'b', 'c', 'd', 'e', 'f'], days);
    expect(plan.at(-1)).toEqual({ date: '2026-11-07', title: 'Repaso general' });
    expect(plan.filter((p) => p.date === '2026-11-07')).toHaveLength(1);
    expect(new Set(plan.slice(0, 6).map((p) => p.date)).size).toBe(3);
  });
  it('con pocos temas los separa en días distintos', () => {
    const plan = distribute(['a', 'b'], studyDays('2026-11-04', '2026-11-11'), { reviewLast: false });
    expect(plan.map((p) => p.date)).toEqual(['2026-11-04', '2026-11-07']);
  });
  it('el progreso cuenta lo hecho', () => {
    expect(planProgress([{ examId: 'e', done: true }, { examId: 'e' }, { examId: 'x', done: true }], 'e')).toEqual({ done: 1, total: 2, pct: 50 });
    expect(planProgress([], 'e').pct).toBe(null);
  });
});
