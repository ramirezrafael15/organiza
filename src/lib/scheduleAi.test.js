import { describe, expect, it } from 'vitest';
import { planScheduleImport } from './scheduleImport.js';
import { extractJson, normalizeSchedule, toScheduleFile } from './scheduleAi.js';

describe('horario desde IA', () => {
  it('extrae el JSON aunque venga con bloque de código', () => {
    expect(extractJson('```json\n{"classes":[]}\n```')).toEqual({ classes: [] });
    expect(() => extractJson('no hay nada')).toThrow(/legible/);
  });
  it('valida y limpia las clases', () => {
    const rows = normalizeSchedule({ classes: [
      { title: 'Bases de Datos', weekdays: [0, 2], start: '9:00', end: '11:00', place: 'A1' },
      { title: '', weekdays: [1], start: '10:00', end: '11:00' },
      { title: 'Mal', weekdays: [1], start: '12:00', end: '11:00' },
      { title: 'Sin días', weekdays: [], start: '10:00', end: '11:00' },
      { title: 'Marketing', weekdays: ['Jueves'], start: '17:30', end: '19:00' },
    ] });
    expect(rows).toEqual([
      { title: 'Bases de Datos', subject: 'Bases de Datos', weekdays: [0, 2], start: '09:00', end: '11:00', place: 'A1' },
      { title: 'Marketing', subject: 'Marketing', weekdays: [3], start: '17:30', end: '19:00', place: '' },
    ]);
  });
  it('no duplica clases que ya existen', () => {
    const state = { programs: [], subjects: [], classes: [{ id: 'x', title: 'Marketing', start: '17:30', end: '19:00', weekdays: [3] }] };
    const file = toScheduleFile(normalizeSchedule({ classes: [{ title: 'Marketing', weekdays: [3], start: '17:30', end: '19:00' }, { title: 'Nueva', weekdays: [1], start: '10:00', end: '11:00' }] }), 'DAW');
    let n = 0;
    const plan = planScheduleImport(state, file, () => `id${n++}`);
    expect(plan.classes.map((c) => c.title)).toEqual(['Nueva']);
    expect(plan.skipped).toBe(1);
  });
});
