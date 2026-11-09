import { describe, expect, it } from 'vitest';
import { nowList } from './now.js';

const TODAY = '2026-11-09'; // lunes
const base = { subjects: [{ id: 's1', name: 'Bases de Datos' }], classes: [], events: [], exams: [], tasks: [], todos: [], grades: [], notes: [] };
const S = (o) => ({ ...base, ...o });

describe('nowList · qué hago ahora', () => {
  it('un examen a 2 días sin preparar va primero; luego el pendiente atrasado, la entrega y lo de hoy', () => {
    const state = S({
      exams: [{ id: 'e1', subjectId: 's1', date: '2026-11-11', progress: 20 }],
      tasks: [{ id: 't1', title: 'Práctica 2', due: '2026-11-13', status: 'pendiente', progress: 10 }],
      todos: [{ id: 'a', title: 'Llamar al banco', date: TODAY }, { id: 'b', title: 'Pedir cita', date: '2026-11-08' }],
    });
    const l = nowList(state, TODAY, '10:00');
    expect(l.map((x) => x.key)).toEqual(['exam-e1', 'todo-b', 'task-t1', 'todo-a']);
  });
  it('una entrega vencida va por encima de todo lo demás', () => {
    const state = S({ tasks: [{ id: 't', title: 'Tarde', due: '2026-11-07', status: 'pendiente' }], exams: [{ id: 'e', subjectId: 's1', date: '2026-11-10' }] });
    expect(nowList(state, TODAY)[0].key).toBe('task-t');
  });
  it('un examen lejano o una entrega hecha no aparecen; un pendiente sin fecha tampoco', () => {
    const state = S({
      exams: [{ id: 'e1', subjectId: 's1', date: '2026-12-20' }],
      tasks: [{ id: 't1', title: 'X', due: '2026-11-10', status: 'entregado' }],
      todos: [{ id: 'a', title: 'Algún día' }, { id: 'c', title: 'Hecho', date: TODAY, done: true }],
    });
    expect(nowList(state, TODAY)).toEqual([]);
  });
  it('lo que va justo de progreso pasa por delante de lo que va sobrado', () => {
    const state = S({ tasks: [
      { id: 'a', title: 'Sobrado', due: '2026-11-12', status: 'pendiente', progress: 90 },
      { id: 'b', title: 'Justo', due: '2026-11-12', status: 'pendiente', progress: 5 },
    ] });
    expect(nowList(state, TODAY)[0].key).toBe('task-b');
  });
  it('un pendiente de hoy con hora próxima va antes que uno sin hora', () => {
    const state = S({ todos: [{ id: 'a', title: 'Sin hora', date: TODAY }, { id: 'b', title: 'A las 12', date: TODAY, time: '12:00' }] });
    expect(nowList(state, TODAY, '11:30')[0].key).toBe('todo-b');
  });
  it('el plan de estudio de un examen urgente pesa más que un pendiente normal de hoy', () => {
    const state = S({
      exams: [{ id: 'e1', subjectId: 's1', date: '2026-11-10' }],
      todos: [{ id: 'a', title: 'Normal', date: TODAY }, { id: 'p', title: 'Estudiar: Tema 3', date: TODAY, examId: 'e1' }],
    });
    const keys = nowList(state, TODAY).map((x) => x.key);
    expect(keys.indexOf('todo-p')).toBeLessThan(keys.indexOf('todo-a'));
  });
  it('una clase solo aparece si está en curso o empieza en la próxima hora', () => {
    const state = S({ classes: [{ id: 'c', title: 'Programación', weekdays: [0], start: '16:00', end: '18:00' }] });
    expect(nowList(state, TODAY, '10:00')).toEqual([]);
    expect(nowList(state, TODAY, '15:20')[0].reason).toBe('Empieza en 40 min');
    expect(nowList(state, TODAY, '16:30')[0].reason).toMatch(/En curso/);
    expect(nowList(state, TODAY, '18:30')).toEqual([]);
  });
  it('indica qué acciones admite cada cosa', () => {
    const state = S({ todos: [{ id: 'a', title: 'X', date: TODAY }], exams: [{ id: 'e', subjectId: 's1', date: '2026-11-10' }] });
    const l = nowList(state, TODAY);
    expect(l.find((x) => x.kind === 'pendiente')).toMatchObject({ canDone: true, canFocus: true });
    expect(l.find((x) => x.kind === 'examen')).toMatchObject({ canDone: false, canFocus: true });
  });
});
