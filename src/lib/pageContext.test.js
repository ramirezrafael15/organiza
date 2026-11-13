import { describe, expect, it } from 'vitest';
import { getOverview, getPageContext, SECTIONS } from './pageContext.js';
import { emptyState } from '../data/repository.js';

const state = () => ({
  ...emptyState(),
  programs: [{ id: 'p1', name: 'DAW' }],
  subjects: [{ id: 's1', name: 'Bases de Datos', programId: 'p1' }],
  exams: [{ id: 'e1', subjectId: 's1', date: '2026-11-16', topics: 'SQL, JOINs', progress: 40 }, { id: 'e0', subjectId: 's1', date: '2026-10-01' }],
  tasks: [{ id: 't1', subjectId: 's1', title: 'Práctica 2', due: '2026-11-14', status: 'pendiente', progress: 60 }, { id: 't2', title: 'Vieja', due: '2026-10-01', status: 'entregado' }],
  todos: [{ id: 'd1', title: 'Repasar', date: '2026-11-13', done: false, examId: 'e1' }, { id: 'd2', title: 'Comprar', done: false }],
  classes: [{ id: 'c1', subjectId: 's1', weekday: 0, start: '16:00', end: '18:00' }],
  grades: [{ id: 'g1', subjectId: 's1', value: 7, weight: 30 }],
  notes: [{ id: 'n1', title: 'SQL', subjectId: 's1', html: '<p>JOINs y <b>GROUP BY</b></p>' }],
});

describe('contexto del asistente', () => {
  it('el resumen general trae hoy, asignaturas y solo lo que queda por hacer', () => {
    const o = getOverview(state(), '2026-11-13');
    expect(o.hoy).toBe('2026-11-13'); expect(o.asignaturas).toEqual(['Bases de Datos']);
    expect(o.examenes_proximos).toHaveLength(1); expect(o.examenes_proximos[0].dias).toBe(3);
    expect(o.entregas_pendientes).toHaveLength(1);
  });
  it('cada sección devuelve JSON limpio, sin campos vacíos', () => {
    for (const id of SECTIONS) expect(() => JSON.stringify(getPageContext(id, state(), '2026-11-13'))).not.toThrow();
    const c = getPageContext('examenes', state(), '2026-11-13');
    expect(c.proximos[0]).toEqual({ asignatura: 'Bases de Datos', fecha: '2026-11-16', dias: 3, temas: 'SQL, JOINs', preparado: '40%', plan: '0/1 sesiones hechas' });
    expect(c.pasados).toBe(1);
  });
  it('apuntes: título y resumen sin etiquetas HTML', () => {
    expect(getPageContext('notas', state(), '2026-11-13').apuntes[0].resumen).toBe('JOINs y GROUP BY');
  });
  it('calificaciones con media; sección desconocida = vacío', () => {
    expect(getPageContext('calificaciones', state(), '2026-11-13').media_general).toBe(7);
    expect(getPageContext('nada', state(), '2026-11-13')).toEqual({});
  });
});
