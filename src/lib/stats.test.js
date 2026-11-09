import { describe, expect, it } from 'vitest';
import { fmtMin, mondayOf, recordFocus, streak, weekStats } from './stats.js';

describe('stats', () => {
  it('recordFocus acumula por día y asignatura sin mutar', () => {
    const a = recordFocus({}, '2026-11-09', { min: 25, subjectId: 's1' });
    const b = recordFocus(a, '2026-11-09', { min: 25, subjectId: 's2' });
    expect(a['2026-11-09']).toEqual({ rounds: 1, min: 25, by: { s1: 25 } });
    expect(b['2026-11-09']).toEqual({ rounds: 2, min: 50, by: { s1: 25, s2: 25 } });
  });
  it('guarda solo los últimos 120 días', () => {
    let log = {};
    for (let i = 0; i < 130; i++) log = recordFocus(log, `2026-${String(1 + Math.floor(i / 28)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`, { min: 1 });
    expect(Object.keys(log).length).toBe(120);
  });
  it('la semana empieza el lunes', () => {
    expect(mondayOf('2026-11-09')).toBe('2026-11-09'); // lunes
    expect(mondayOf('2026-11-15')).toBe('2026-11-09'); // domingo
  });
  it('resume la semana: foco, asignaturas y tareas hechas', () => {
    const log = { '2026-11-09': { rounds: 2, min: 50, by: { s1: 50 } }, '2026-11-11': { rounds: 1, min: 25, by: { s2: 25 } }, '2026-11-02': { rounds: 9, min: 999, by: {} } };
    const t = new Date('2026-11-10T10:00:00').getTime();
    const state = { todos: [{ done: true, doneAt: t }, { done: true, doneAt: new Date('2026-11-01T10:00:00').getTime() }, { done: false }], tasks: [{ status: 'entregado', updatedAt: t }, { status: 'pendiente', updatedAt: t }] };
    const w = weekStats(state, log, '2026-11-12');
    expect(w.totalMin).toBe(75);
    expect(w.rounds).toBe(3);
    expect(w.bySubject[0]).toEqual({ subjectId: 's1', min: 50 });
    expect(w.todosDone).toBe(1);
    expect(w.tasksDone).toBe(1);
  });
  it('racha: cuenta días seguidos cumplidos y hoy no la rompe', () => {
    const state = { todos: [
      { date: '2026-11-07', done: true }, { date: '2026-11-08', done: true },
      { date: '2026-11-09', done: false },
    ] };
    expect(streak(state, {}, '2026-11-09')).toEqual({ days: 2, todayDone: false });
  });
  it('racha: un pendiente sin hacer la corta; el foco cuenta como actividad', () => {
    const state = { todos: [{ date: '2026-11-07', done: false }, { date: '2026-11-08', done: true }] };
    const log = { '2026-11-09': { rounds: 1, min: 25, by: {} } };
    expect(streak(state, log, '2026-11-09')).toEqual({ days: 2, todayDone: true });
  });
  it('formatea minutos', () => {
    expect(fmtMin(45)).toBe('45 min');
    expect(fmtMin(90)).toBe('1 h 30 min');
    expect(fmtMin(120)).toBe('2 h');
  });
});
