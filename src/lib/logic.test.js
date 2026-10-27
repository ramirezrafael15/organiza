import { describe, expect, it } from 'vitest';
import { addDaysISO, daysUntil, monthGrid, weekdayOf, weekDays } from './dates.js';
import { autoLevel, getUrgency } from './urgency.js';
import { overallAverage, subjectAverage, weightedAverage } from './grades.js';
import { classesOn, entriesOn, urgentItems } from './agenda.js';
import { matchNote } from './search.js';

const TODAY = '2026-10-26'; // lunes

describe('fechas', () => {
  it('calcula días y día de la semana (0 = lunes)', () => {
    expect(weekdayOf('2026-10-26')).toBe(0);
    expect(weekdayOf('2026-11-01')).toBe(6);
    expect(daysUntil('2026-10-29', TODAY)).toBe(3);
    expect(daysUntil('2026-10-25', TODAY)).toBe(-1);
    expect(addDaysISO(TODAY, 7)).toBe('2026-11-02');
  });
  it('semana y mes empiezan en lunes y son completos', () => {
    expect(weekDays('2026-10-28')[0]).toBe('2026-10-26');
    expect(weekDays('2026-10-28')).toHaveLength(7);
    const grid = monthGrid('2026-10-15');
    expect(grid.length % 7).toBe(0);
    expect(weekdayOf(grid[0])).toBe(0);
  });
});

describe('urgencia', () => {
  it('sube según se acerca la fecha', () => {
    expect(autoLevel({ daysLeft: 20, progress: 100 })).toBe(0);
    expect(autoLevel({ daysLeft: 10, progress: 0 })).toBe(0);
    expect(autoLevel({ daysLeft: 7, progress: 60 })).toBe(1);
    expect(autoLevel({ daysLeft: 3, progress: 60 })).toBe(2);
    expect(autoLevel({ daysLeft: 1, progress: 60 })).toBe(3);
    expect(autoLevel({ daysLeft: 0, progress: 0 })).toBe(3);
  });
  it('sube un nivel si vas justo y baja uno si vas sobrado', () => {
    expect(autoLevel({ daysLeft: 7, progress: 10 })).toBe(2);
    expect(autoLevel({ daysLeft: 3, progress: 10 })).toBe(3);
    expect(autoLevel({ daysLeft: 3, progress: 90 })).toBe(1);
  });
  it('la urgencia manual es un mínimo, no un tope', () => {
    const exam = { date: '2026-12-01', progress: 0, urgencyManual: 2 };
    expect(getUrgency(exam, 'exam', TODAY).level).toBe(2);
    const near = { date: '2026-10-27', progress: 0, urgencyManual: 0 };
    expect(getUrgency(near, 'exam', TODAY).level).toBe(3);
  });
  it('no aplica a exámenes pasados ni a trabajos entregados; lo vencido es crítico', () => {
    expect(getUrgency({ date: '2026-10-01' }, 'exam', TODAY)).toBeNull();
    expect(getUrgency({ due: '2026-10-27', status: 'entregado' }, 'task', TODAY)).toBeNull();
    const late = getUrgency({ due: '2026-10-20', status: 'pendiente' }, 'task', TODAY);
    expect(late.level).toBe(3);
    expect(late.overdue).toBe(true);
  });
});

describe('notas', () => {
  it('media ponderada', () => {
    expect(weightedAverage([{ value: 8, weight: 1 }, { value: 4, weight: 1 }])).toBe(6);
    expect(weightedAverage([{ value: 10, weight: 30 }, { value: 5, weight: 70 }])).toBeCloseTo(6.5);
    expect(weightedAverage([])).toBeNull();
  });
  it('media por asignatura y general (con créditos)', () => {
    const subjects = [{ id: 'a', credits: 6 }, { id: 'b', credits: 3 }, { id: 'c' }];
    const grades = [
      { subjectId: 'a', value: 9 },
      { subjectId: 'b', value: 6 },
    ];
    expect(subjectAverage('a', grades)).toBe(9);
    expect(subjectAverage('c', grades)).toBeNull();
    expect(overallAverage(subjects, grades)).toBeCloseTo(8); // (9*6 + 6*3) / 9
  });
});

describe('agenda', () => {
  const state = {
    subjects: [{ id: 's1', name: 'Bases de Datos' }],
    classes: [
      { id: 'c1', title: 'BBDD', kind: 'clase', weekdays: [0, 2], start: '09:00', end: '11:00', subjectId: 's1' },
      { id: 'c2', title: 'Turno', kind: 'laboral', weekdays: [0], start: '16:00', end: '20:00', until: '2026-10-20' },
    ],
    events: [],
    exams: [{ id: 'e1', subjectId: 's1', date: '2026-10-29', time: '10:00', progress: 40 }],
    tasks: [{ id: 't1', title: 'Práctica 2', due: '2026-10-26', status: 'en_curso', progress: 50 }],
    grades: [],
    notes: [],
  };
  it('las clases se repiten cada semana y respetan la fecha final', () => {
    expect(classesOn(state.classes, '2026-10-26').map((c) => c.id)).toEqual(['c1']); // c2 ya terminó
    expect(classesOn(state.classes, '2026-11-02').map((c) => c.id)).toEqual(['c1']);
    expect(classesOn(state.classes, '2026-10-27')).toHaveLength(0);
    expect(classesOn(state.classes, '2026-10-28').map((c) => c.id)).toEqual(['c1']);
  });
  it('mezcla clases, exámenes y entregas y los ordena por hora', () => {
    const lunes = entriesOn(state, '2026-10-26', TODAY);
    expect(lunes.map((e) => e.kind)).toEqual(['entrega', 'clase']); // entrega sin hora va primero
    const jueves = entriesOn(state, '2026-10-29', TODAY);
    expect(jueves[0].title).toBe('Examen de Bases de Datos');
    expect(jueves[0].urgency.level).toBe(3); // faltan 3 días y vas al 40 %
  });
  it('lista lo urgente de más a menos', () => {
    const urgent = urgentItems(state, TODAY);
    expect(urgent.map((u) => u.kind)).toEqual(['entrega', 'examen']);
  });
});

describe('búsqueda de notas', () => {
  const state = {
    subjects: [{ id: 's1', name: 'Programación' }],
    exams: [], tasks: [],
  };
  const note = { title: 'Apuntes tema 3', body: 'Bucles y funciones recursivas', subjectId: 's1' };
  it('ignora mayúsculas y tildes, y busca en asignatura', () => {
    expect(matchNote(note, 'RECURSIVAS', state)).toBe(true);
    expect(matchNote(note, 'programacion bucles', state)).toBe(true);
    expect(matchNote(note, 'java', state)).toBe(false);
    expect(matchNote(note, '', state)).toBe(true);
  });
});

import { filterState } from './filter.js';
import { entryColor, programColor } from './color.js';
import { activeReminders, paceHint, reminderMessage, reminderSummary } from './reminders.js';

import { planScheduleImport } from './scheduleImport.js';
import { planNotifications, zonedNow } from './notify.js';
import { dispatchDue } from './dispatch.js';

describe('notificaciones del servidor', () => {
  const state = {
    settings: { reminderDays: [7, 3, 1, 0], notifyHour: 8, timezone: 'Europe/Madrid' },
    subjects: [{ id: 's1', name: 'Bases de Datos' }],
    exams: [{ id: 'x1', subjectId: 's1', date: '2026-10-29', progress: 40, reminderDays: [7, 3, 1, 0] }],
    tasks: [], events: [],
  };
  const at = (iso) => new Date(iso); // instantes en UTC; Madrid en octubre = UTC+1 (CET desde el 25/10)
  it('calcula fecha y hora en la zona horaria del usuario', () => {
    expect(zonedNow(at('2026-10-26T22:30:00Z'), 'Europe/Madrid')).toEqual({ today: '2026-10-26', hour: 23, minute: 30 });
    expect(zonedNow(at('2026-10-26T23:30:00Z'), 'Europe/Madrid')).toEqual({ today: '2026-10-27', hour: 0, minute: 30 });
  });
  it('no avisa antes de la hora elegida y avisa después con el texto completo', () => {
    expect(planNotifications({ state, now: at('2026-10-26T06:00:00Z') })).toHaveLength(0); // 07:00 en Madrid
    const [n] = planNotifications({ state, now: at('2026-10-26T07:30:00Z') }); // 08:30, faltan 3 días
    expect(n.title).toBe('Examen · Bases de Datos');
    expect(n.body).toContain('Te quedan 3 días para el examen de Bases de Datos, llevas el 40 % preparado.');
  });
  it('cada aviso sale a su propia hora (uno a las 14:00 y otro a las 18:00)', () => {
    const two = {
      ...state,
      exams: [],
      tasks: [
        { id: 'a', title: 'Práctica A', due: '2026-10-27', status: 'pendiente', progress: 0, reminderDays: [1], reminderTime: '14:00' },
        { id: 'b', title: 'Práctica B', due: '2026-10-27', status: 'pendiente', progress: 0, reminderDays: [1], reminderTime: '18:00' },
        { id: 'c', title: 'Práctica C', due: '2026-10-27', status: 'pendiente', progress: 0, reminderDays: [1] }, // sin hora propia: 08:00
      ],
    };
    const titles = (iso) => planNotifications({ state: two, now: at(iso) }).map((n) => n.title).sort();
    expect(titles('2026-10-26T06:30:00Z')).toEqual([]); // 07:30
    expect(titles('2026-10-26T07:30:00Z')).toEqual(['Entrega · Práctica C']); // 08:30
    expect(titles('2026-10-26T13:10:00Z')).toEqual(['Entrega · Práctica A', 'Entrega · Práctica C']); // 14:10
    expect(titles('2026-10-26T17:10:00Z')).toHaveLength(3); // 18:10
  });
  it('no repite un aviso ya enviado ni avisa en días sin aviso', () => {
    const first = planNotifications({ state, now: at('2026-10-26T07:30:00Z') });
    expect(planNotifications({ state, now: at('2026-10-26T09:00:00Z'), sent: new Set(first.map((n) => n.key)) })).toHaveLength(0);
    expect(planNotifications({ state, now: at('2026-10-27T07:30:00Z') })).toHaveLength(0); // faltan 2: no hay aviso a 2 días
    expect(planNotifications({ state, now: at('2026-10-28T07:30:00Z') })).toHaveLength(1); // falta 1
  });
});

describe('reparto de avisos puntuales', () => {
  const base = {
    settings: { reminderDays: [1], notifyHour: 8, timezone: 'Europe/Madrid' },
    subjects: [], exams: [], events: [],
    tasks: [{ id: 'a', title: 'Práctica A', due: '2026-10-27', status: 'pendiente', progress: 0, reminderDays: [1], reminderTime: '06:00' }],
  };
  const user = () => ({ id: 'u1', subs: [{}], state: base, sent: new Set() });
  const run = (extra) => {
    const calls = [];
    return dispatchDue({ send: async (u, n) => (calls.push(n.title), true), markSent: async () => {}, ...extra }).then((count) => ({ count, calls }));
  };
  it('a las 06:00 en punto sale el aviso de las 06:00 (no a las 06:15)', async () => {
    const early = await run({ users: [user()], now: new Date('2026-10-26T04:59:30Z') }); // 05:59:30 en Madrid
    expect(early.count).toBe(0);
    const onTime = await run({ users: [user()], now: new Date('2026-10-26T05:00:20Z') }); // 06:00:20
    expect(onTime.calls).toEqual(['Entrega · Práctica A']);
  });
  it('lo ya enviado no se repite', async () => {
    const u = user();
    await run({ users: [u], now: new Date('2026-10-26T05:00:20Z') });
    expect((await run({ users: [u], now: new Date('2026-10-26T05:00:40Z') })).count).toBe(0);
  });
  it('el respaldo de GitHub espera 10 minutos antes de enviar lo que el servidor no envió', async () => {
    expect((await run({ users: [user()], now: new Date('2026-10-26T05:05:00Z'), graceMinutes: 10 })).count).toBe(0);
    expect((await run({ users: [user()], now: new Date('2026-10-26T05:12:00Z'), graceMinutes: 10 })).count).toBe(1);
  });
  it('si el envío falla varias veces se pausa y no insiste cada pasada', async () => {
    const attempts = new Map();
    const u = user();
    let sends = 0;
    const fail = { users: [u], attempts, send: async () => (sends++, false), markSent: async () => {} };
    for (let i = 0; i < 8; i++) await dispatchDue({ ...fail, now: new Date('2026-10-26T05:01:00Z') });
    expect(sends).toBe(5);
  });
});

describe('importar horario', () => {
  let n = 0;
  const id = () => `n${++n}`;
  const file = {
    programs: [{ name: 'DAW', color: '#111111' }, { name: 'Marketing' }],
    subjects: [{ name: 'Inglés', program: 'DAW' }, { name: 'IMK', program: 'Marketing' }],
    classes: [
      { title: 'Inglés', subject: 'Inglés', weekdays: [0], start: '15:30', end: '17:30' },
      { title: 'IMK', subject: 'IMK', weekdays: [1, 0], start: '08:30', end: '10:30' },
    ],
  };
  it('crea estudios, asignaturas y clases en un estado vacío', () => {
    const plan = planScheduleImport({ programs: [], subjects: [], classes: [] }, file, id);
    expect(plan.programs.map((p) => p.name)).toEqual(['DAW', 'Marketing']);
    expect(plan.subjects.map((s) => s.name)).toEqual(['Inglés', 'IMK']);
    expect(plan.classes).toHaveLength(2);
    const ingles = plan.subjects.find((s) => s.name === 'Inglés');
    expect(ingles.programId).toBe(plan.programs[0].id);
    expect(plan.classes[0].subjectId).toBe(ingles.id);
  });
  it('reutiliza lo que ya existe y no duplica clases', () => {
    const state = {
      programs: [{ id: 'p1', name: 'Grado en Marketing' }, { id: 'p2', name: 'DAW' }],
      subjects: [{ id: 's1', name: 'inglés', programId: null }],
      classes: [{ id: 'c1', title: 'Inglés', weekdays: [0], start: '15:30', end: '17:30' }],
    };
    const plan = planScheduleImport(state, file, id);
    expect(plan.programs).toHaveLength(0); // "Marketing" ya existe como "Grado en Marketing"
    expect(plan.subjects.find((s) => s.id === 's1').programId).toBe('p2'); // le pone estudios
    expect(plan.classes.map((c) => c.title)).toEqual(['IMK']);
    expect(plan.skipped).toBe(1);
    expect(plan.classes[0].weekdays).toEqual([0, 1]);
  });
});

describe('avisos previos', () => {
  const base = {
    settings: { reminderDays: [7, 3, 1, 0] },
    subjects: [{ id: 's1', name: 'Bases de Datos' }],
    exams: [], tasks: [], events: [],
  };
  it('describe los avisos en texto', () => {
    expect(reminderSummary([7, 3, 1, 0])).toBe('7, 3 y 1 días antes, y el mismo día');
    expect(reminderSummary([1])).toBe('1 día antes');
    expect(reminderSummary([0])).toBe('El mismo día');
    expect(reminderSummary([])).toBe('Sin avisos');
  });
  it('mensaje con días que quedan y % preparado', () => {
    expect(reminderMessage({ kind: 'examen', subjectName: 'Bases de Datos', daysLeft: 3, progress: 40 }))
      .toBe('Te quedan 3 días para el examen de Bases de Datos, llevas el 40 % preparado.');
    expect(reminderMessage({ kind: 'examen', subjectName: 'BD', daysLeft: 1, progress: 0 })).toContain('Mañana');
    expect(reminderMessage({ kind: 'entrega', title: 'Práctica 2', daysLeft: 0, progress: 50 })).toContain('Hoy vence');
  });
  it('el aviso empieza al entrar en la ventana del primer aviso y no antes', () => {
    const exam = (date, extra = {}) => ({ ...base, exams: [{ id: 'x', subjectId: 's1', date, progress: 40, ...extra }] });
    expect(activeReminders(exam('2026-11-10'), TODAY)).toHaveLength(0); // faltan 15 > 7
    expect(activeReminders(exam('2026-11-02'), TODAY)).toHaveLength(1); // faltan 7
    expect(activeReminders(exam('2026-11-02'), TODAY)[0].isNew).toBe(true); // justo hoy toca avisar
    expect(activeReminders(exam('2026-10-31'), TODAY)[0].isNew).toBe(false); // faltan 5: hay aviso en curso, pero no toca uno nuevo
  });
  it('respeta los días elegidos en cada examen (aviso a 14 días)', () => {
    const state = { ...base, exams: [{ id: 'x', subjectId: 's1', date: '2026-11-09', progress: 0, reminderDays: [14, 3] }] };
    expect(activeReminders(state, TODAY)).toHaveLength(1); // faltan 14
    expect(activeReminders({ ...state, exams: [{ ...state.exams[0], reminderDays: [] }] }, TODAY)).toHaveLength(0);
  });
  it('no avisa de entregas ya entregadas ni de exámenes pasados; avisa de eventos con aviso', () => {
    const state = {
      ...base,
      exams: [{ id: 'x', subjectId: 's1', date: '2026-10-20' }],
      tasks: [{ id: 't', title: 'A', due: '2026-10-27', status: 'entregado' }, { id: 't2', title: 'B', due: '2026-10-27', status: 'pendiente', progress: 20 }],
      events: [{ id: 'e', title: 'Cita', date: '2026-10-27', reminderDays: [1] }, { id: 'e2', title: 'Sin aviso', date: '2026-10-27' }],
    };
    expect(activeReminders(state, TODAY).map((r) => r.key).sort()).toEqual(['events-e', 'tasks-t2']);
  });
  it('calcula el ritmo necesario al día', () => {
    expect(paceHint(40, 3)).toContain('20 %');
    expect(paceHint(100, 3)).toBeNull();
    expect(paceHint(0, 0)).toBeNull();
  });
  it('programColor devuelve el color del estudio de la asignatura', () => {
    const st = { programs: [{ id: 'p', color: '#abc' }], subjects: [{ id: 's', programId: 'p' }] };
    expect(programColor({ subjectId: 's' }, st)).toBe('#abc');
    expect(programColor({ subjectId: null }, st)).toBeNull();
  });
});

describe('estudios (DAW / Marketing)', () => {
  const state = {
    programs: [{ id: 'p1', name: 'DAW', color: '#111111' }, { id: 'p2', name: 'Marketing', color: '#222222' }],
    subjects: [
      { id: 's1', programId: 'p1' },
      { id: 's2', programId: 'p2' },
      { id: 's3', programId: null },
    ],
    classes: [{ id: 'c1', subjectId: 's1' }, { id: 'c2', subjectId: 's2' }, { id: 'c3', subjectId: null, kind: 'laboral' }],
    events: [{ id: 'e1', subjectId: null }],
    exams: [{ id: 'x1', subjectId: 's1' }, { id: 'x2', subjectId: 's2' }],
    tasks: [], grades: [{ id: 'g1', subjectId: 's1' }, { id: 'g2', subjectId: 's2' }], notes: [],
    settings: { colorBy: 'tipo' },
  };
  it('"todo" no filtra nada', () => {
    expect(filterState(state, 'todo')).toBe(state);
  });
  it('un estudio deja solo lo suyo', () => {
    const daw = filterState(state, 'p1');
    expect(daw.subjects.map((s) => s.id)).toEqual(['s1']);
    expect(daw.classes.map((c) => c.id)).toEqual(['c1']);
    expect(daw.exams.map((x) => x.id)).toEqual(['x1']);
    expect(daw.grades.map((g) => g.id)).toEqual(['g1']);
    expect(daw.events).toHaveLength(0);
  });
  it('"otros" deja lo que no tiene estudio (trabajo, personal, asignaturas sueltas)', () => {
    const otros = filterState(state, 'otros');
    expect(otros.classes.map((c) => c.id)).toEqual(['c3']);
    expect(otros.events.map((e) => e.id)).toEqual(['e1']);
    expect(otros.subjects.map((s) => s.id)).toEqual(['s3']);
  });
  it('colorear por estudios usa el color del estudio; por tipo, el del tipo', () => {
    expect(entryColor({ kind: 'clase', subjectId: 's1' }, state)).toBe('var(--k-clase)');
    const byProgram = { ...state, settings: { colorBy: 'estudios' } };
    expect(entryColor({ kind: 'clase', subjectId: 's1' }, byProgram)).toBe('#111111');
    expect(entryColor({ kind: 'laboral', subjectId: null }, byProgram)).toBe('var(--k-laboral)');
  });
});
