import { describe, it, expect } from 'vitest';
import { planNotifications } from './notify.js';

const state = (todos) => ({ subjects: [], exams: [], tasks: [], events: [], todos, settings: { reminderDays: [] } });
const at = (iso) => new Date(iso);

describe('avisos de pendientes con hora', () => {
  const todos = [{ id: 'a', title: 'Llamar al banco', date: '2026-11-11', time: '12:00', done: false }, { id: 'b', title: 'Sin hora', date: '2026-11-11', done: false }];
  it('no avisa antes de su hora ni los que no tienen hora', () => {
    expect(planNotifications({ state: state(todos), now: at('2026-11-11T10:59:00Z') })).toHaveLength(0); // 11:59 Madrid
  });
  it('avisa en el minuto exacto, una vez', () => {
    const [n] = planNotifications({ state: state(todos), now: at('2026-11-11T11:00:30Z') }); // 12:00 Madrid
    expect(n.body).toBe('Llamar al banco');
    expect(planNotifications({ state: state(todos), now: at('2026-11-11T11:00:30Z'), sent: new Set([n.key]) })).toHaveLength(0);
  });
  it('si pasaron más de 2 h no manda uno atrasado, y hechos no avisan', () => {
    expect(planNotifications({ state: state(todos), now: at('2026-11-11T14:00:00Z') })).toHaveLength(0);
    expect(planNotifications({ state: state([{ ...todos[0], done: true }]), now: at('2026-11-11T11:00:30Z') })).toHaveLength(0);
  });
});
