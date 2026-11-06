import { describe, it, expect } from 'vitest';
import { classify, icsId, parseIcs, planCalendarImport, sameSubject, subjectName } from './ics.js';

const ICS = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:92161@pradogrado2627.ugr.es
SUMMARY:Vencimiento de Tema 4.1.
DESCRIPTION:
DTSTART:20261103T133000Z
CATEGORIES:INTRODUCCIÓN AL MÁRKETING (2627)-236_11_13_2627_A
END:VEVENT
BEGIN:VEVENT
UID:44470@pradogrado2627.ugr.es
SUMMARY:Vencimiento de Ventaja en costes o en diferenciación
DESCRIPTION:Realiza un informe sobre la estrategia competitiva de las sigui
\tentes empresas\\, indicando si basan su estrategia
DTSTART:20261110T000000Z
CATEGORIES:FUNDAMENTOS DE DIRECCIÓN Y ADMINISTRAC.DE EMPRESAS (2627)-236_11
\t_12_2627_A
END:VEVENT
BEGIN:VEVENT
UID:44468@pradogrado2627.ugr.es
SUMMARY:Vencimiento de Práctica T5 Estrategias de crecimiento
DTSTART:20261110T230000Z
CATEGORIES:FUNDAMENTOS DE DIRECCIÓN Y ADMINISTRAC.DE EMPRESAS (2627)-236_11_12_2627_A
END:VEVENT
BEGIN:VEVENT
UID:1@x
SUMMARY:Examen parcial de Marketing
DTSTART:20261201T090000Z
CATEGORIES:MARKETING (2627)
END:VEVENT
BEGIN:VEVENT
UID:2@x
SUMMARY:Apertura de Tema 5
DTSTART:20261201T090000Z
END:VEVENT
END:VCALENDAR`;

const state = (extra = {}) => ({ subjects: [], tasks: [], exams: [], settings: { reminderDays: [1, 0] }, ...extra });
const NOW = Date.parse('2026-11-06T12:00:00Z');
let n = 0;
const makeId = () => `id${++n}`;

describe('ics', () => {
  it('lee los eventos, une líneas partidas y limpia el texto', () => {
    const ev = parseIcs(ICS);
    expect(ev).toHaveLength(5);
    expect(ev[1].description).toContain('siguientes empresas, indicando');
    expect(ev[1].category).toBe('FUNDAMENTOS DE DIRECCIÓN Y ADMINISTRAC.DE EMPRESAS (2627)-236_11_12_2627_A');
  });
  it('nombre de asignatura legible', () => {
    expect(subjectName('INTRODUCCIÓN AL MÁRKETING (2627)-236_11_13_2627_A')).toBe('Introducción al márketing');
    expect(subjectName('FUNDAMENTOS DE DIRECCIÓN Y ADMINISTRAC.DE EMPRESAS (2627)-236')).toBe('Fundamentos de dirección y administrac. de empresas');
  });
  it('clasifica', () => {
    expect(classify('Vencimiento de Tema 4.1.')).toEqual({ type: 'task', title: 'Tema 4.1.' });
    expect(classify('Examen parcial de Marketing').type).toBe('exam');
    expect(classify('Apertura de Tema 5')).toBeNull();
  });
  it('crea entregas con zona horaria de Madrid y medianoche = final del día anterior', () => {
    const plan = planCalendarImport(state(), parseIcs(ICS), { makeId, now: NOW });
    expect(plan.tasks.map((t) => [t.title, t.due, t.time])).toEqual([
      ['Tema 4.1.', '2026-11-03', '14:30'],
      ['Ventaja en costes o en diferenciación', '2026-11-09', '23:59'], // 01:00 del 10 → fin del día 9
      ['Práctica T5 Estrategias de crecimiento', '2026-11-10', '23:59'], // 00:00 del 11 → fin del día 10
    ]);
    expect(plan.exams).toHaveLength(1);
    expect(plan.subjects.map((s) => s.name)).toEqual(['Introducción al márketing', 'Fundamentos de dirección y administrac. de empresas']);
    expect(plan.exams[0].subjectId).toBe(plan.tasks[0].subjectId); // "Marketing" reutiliza "Introducción al márketing"
    expect(plan.tasks[1].subjectId).toBe(plan.tasks[2].subjectId);
    expect(plan.skipped).toBe(1);
  });
  it('no duplica, no pisa tu progreso y respeta lo que borraste', () => {
    const first = planCalendarImport(state(), parseIcs(ICS), { makeId, now: NOW });
    const t = { ...first.tasks[0], status: 'entregado', progress: 100 };
    const again = planCalendarImport(state({ tasks: [t], subjects: first.subjects }), parseIcs(ICS).slice(0, 1), { makeId, now: NOW });
    expect(again.tasks).toEqual([]);
    const moved = parseIcs(ICS.replace('20261103T133000Z', '20261104T133000Z')).slice(0, 1);
    const upd = planCalendarImport(state({ tasks: [t], subjects: first.subjects }), moved, { makeId, now: NOW });
    expect(upd.tasks).toEqual([{ id: t.id, title: 'Tema 4.1.', due: '2026-11-04', time: '14:30' }]);
    const dis = planCalendarImport(state({ settings: { icsDismissed: [icsId('92161@pradogrado2627.ugr.es')] } }), parseIcs(ICS).slice(0, 1), { makeId, now: NOW });
    expect(dis.tasks).toEqual([]);
  });
  it('nombres de Atlántida y asignaturas con otro nombre', () => {
    expect(subjectName('0614. Despliegue de Aplicaciones Web 26-27')).toBe('Despliegue de Aplicaciones Web');
    expect(subjectName('0618. Itinerario personal para la empleabilidad II (DAW) 26-27')).toBe('Itinerario personal para la empleabilidad II');
    expect(sameSubject('Desarrollo Web Servidor', 'Desarrollo Web en Entorno Servidor')).toBe(true);
    expect(sameSubject('Desarrollo Web Cliente', 'Desarrollo web en entorno cliente')).toBe(true);
    expect(sameSubject('Desarrollo Web Servidor', 'Desarrollo web en entorno cliente')).toBe(false);
    expect(sameSubject('Inglés', 'Ingles profesional')).toBe(true);
    expect(sameSubject('IPE II', 'Itinerario personal para la empleabilidad II')).toBe(true);
    expect(sameSubject('FDAE', 'Fundamentos de dirección y administrac. de empresas')).toBe(true);
    expect(sameSubject('Profundización en Digitalización', 'Profundizacion en digitalizacion')).toBe(true);
    expect(sameSubject('Diseño de Interfaces Web', 'Despliegue de Aplicaciones Web')).toBe(false);
    expect(classify('ENGLISH EXAM FIRST TERM').type).toBe('exam');
    expect(classify('ENGLISH RETAKE (RECUPERACIÓN DAW)').type).toBe('exam');
  });
});
