import { describe, expect, it } from 'vitest';
import { advance, catchUp, DEFAULTS, schedule, startRun } from './focus.js';

const pomo = DEFAULTS[0];
const start = (at = 0) => ({ techId: 'pomodoro', phase: 'focus', round: 1, left: 25 * 60000, endAt: at + 25 * 60000, running: true });

describe('focus', () => {
  it('foco -> descanso -> foco, y descanso largo tras 4 rondas', () => {
    let r = start();
    const phases = [];
    for (let i = 0; i < 8; i++) { r = advance(pomo, r.run ?? r, (r.run ?? r).endAt); phases.push(r.run.phase); }
    expect(phases).toEqual(['rest', 'focus', 'rest', 'focus', 'rest', 'focus', 'long', 'focus']);
  });
  it('catchUp avanza sin deriva y cuenta los bloques hechos', () => {
    const { run, blocks } = catchUp(pomo, start(0), 70 * 60000);
    // 0-25 foco, 25-30 desc, 30-55 foco, 55-60 desc, 60-85 foco
    expect(run.phase).toBe('focus'); expect(run.round).toBe(3); expect(run.endAt).toBe(85 * 60000); expect(blocks).toBe(2);
  });
  it('schedule da las horas exactas de cada cambio', () => {
    const s = schedule(pomo, start(0), 0, { max: 3 });
    expect(s.map((e) => [e.at / 60000, e.title])).toEqual([[25, 'Descanso'], [30, 'A estudiar'], [55, 'Descanso']]);
  });
  it('en pausa no hay avisos', () => {
    expect(schedule(pomo, { ...start(), running: false }, 0)).toEqual([]);
  });
});

describe('startRun', () => {
  it('arranca en foco, con la hora de fin y lo que estudias', () => {
    const r = startRun(pomo, 1000, { label: 'Tema 3', subjectId: 's1' });
    expect(r).toMatchObject({ techId: 'pomodoro', phase: 'focus', round: 1, running: true, endAt: 1000 + 25 * 60000, label: 'Tema 3', subjectId: 's1' });
  });
});
