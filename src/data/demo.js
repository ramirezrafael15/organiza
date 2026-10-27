// Datos de ejemplo para probar la app (Ajustes -> "Cargar datos de ejemplo").
// Las fechas son relativas a hoy para que siempre se vea algo con sentido.
import { addDaysISO, todayISO } from '../lib/dates.js';
import { DEFAULT_SETTINGS } from './repository.js';

export function buildDemoState(today = todayISO()) {
  const d = (n) => addDaysISO(today, n);
  const t = Date.now();
  const meta = { createdAt: t, updatedAt: t };

  const programs = [
    { id: 'demo-daw', name: 'DAW', color: '#2563eb' },
    { id: 'demo-grado', name: 'Marketing', color: '#c026d3' },
  ].map((p) => ({ ...p, ...meta }));

  const subjects = [
    { id: 'demo-bd', name: 'Bases de Datos', color: '#0ea5e9', credits: 6, programId: 'demo-daw' },
    { id: 'demo-prog', name: 'Programación', color: '#4f46e5', credits: 6, programId: 'demo-daw' },
    { id: 'demo-mkt', name: 'Marketing', color: '#db2777', credits: 6, programId: 'demo-grado' },
    { id: 'demo-ing', name: 'Inglés', color: '#ca8a04', credits: 3, programId: 'demo-grado' },
  ].map((s) => ({ ...s, ...meta }));

  const classes = [
    { id: 'demo-c1', title: 'Bases de Datos', kind: 'clase', subjectId: 'demo-bd', weekdays: [0, 2], start: '16:00', end: '18:00', place: 'Aula 2' },
    { id: 'demo-c2', title: 'Programación', kind: 'clase', subjectId: 'demo-prog', weekdays: [1, 3], start: '16:00', end: '18:30', place: 'Aula 4' },
    { id: 'demo-c3', title: 'Marketing', kind: 'clase', subjectId: 'demo-mkt', weekdays: [0, 4], start: '09:00', end: '11:00', place: 'Facultad' },
    { id: 'demo-c4', title: 'Inglés', kind: 'clase', subjectId: 'demo-ing', weekdays: [2], start: '09:00', end: '10:30' },
    { id: 'demo-c5', title: 'Trabajo (contenido)', kind: 'laboral', weekdays: [1, 3], start: '10:00', end: '14:00' },
  ].map((c) => ({ ...c, ...meta }));

  const events = [
    { id: 'demo-ev1', title: 'Gimnasio', kind: 'personal', date: d(1), start: '20:00', end: '21:00' },
    { id: 'demo-ev2', title: 'Reunión con cliente', kind: 'laboral', date: d(2), start: '12:00', end: '12:45' },
  ].map((e) => ({ ...e, ...meta }));

  const exams = [
    { id: 'demo-x1', subjectId: 'demo-bd', date: d(3), time: '10:00', topics: 'SQL avanzado, normalización, transacciones', expectedGrade: 7.5, progress: 40, reminderDays: [7, 3, 1, 0] },
    { id: 'demo-x2', subjectId: 'demo-prog', date: d(12), time: '16:00', topics: 'POO, herencia, interfaces', expectedGrade: 8, progress: 15, reminderDays: [7, 3, 1, 0] },
    { id: 'demo-x3', subjectId: 'demo-mkt', date: d(24), time: '09:00', topics: 'Investigación de mercados', expectedGrade: 6.5, progress: 0, reminderDays: [7, 3, 1, 0] },
  ].map((x) => ({ ...x, ...meta }));

  const tasks = [
    { id: 'demo-t1', title: 'Práctica 2: modelo E/R', subjectId: 'demo-bd', due: d(1), time: '23:59', status: 'en_curso', progress: 60 },
    { id: 'demo-t2', title: 'Informe de mercado', subjectId: 'demo-mkt', due: d(6), status: 'pendiente', progress: 0 },
    { id: 'demo-t3', title: 'Proyecto API REST', subjectId: 'demo-prog', due: d(15), status: 'en_curso', progress: 25 },
    { id: 'demo-t4', title: 'Redacción en inglés', subjectId: 'demo-ing', due: d(-4), status: 'entregado', progress: 100 },
  ].map((x) => ({ ...x, reminderDays: [7, 3, 1, 0], ...meta }));

  const grades = [
    { id: 'demo-g1', subjectId: 'demo-bd', name: 'Parcial 1', value: 7.2, weight: 30 },
    { id: 'demo-g2', subjectId: 'demo-bd', name: 'Práctica 1', value: 8.5, weight: 20 },
    { id: 'demo-g3', subjectId: 'demo-prog', name: 'Test 1', value: 6.4, weight: 1 },
    { id: 'demo-g4', subjectId: 'demo-ing', name: 'Redacción', value: 9, weight: 1 },
  ].map((g) => ({ ...g, ...meta }));

  const notes = [
    { id: 'demo-n1', title: 'Repaso SQL', body: 'JOINs, GROUP BY y HAVING. Repetir los ejercicios 4 y 5 del tema 3.', subjectId: 'demo-bd', linkType: 'exam', linkId: 'demo-x1' },
    { id: 'demo-n2', title: 'Ideas informe de mercado', body: 'Segmentación por edad, comparar 3 competidores y añadir una encuesta corta.', subjectId: 'demo-mkt', linkType: 'task', linkId: 'demo-t2' },
    { id: 'demo-n3', title: 'Comprar', body: 'Pendrive y cuaderno cuadriculado.', subjectId: null, linkType: null, linkId: null },
  ].map((n) => ({ ...n, ...meta }));

  return { programs, subjects, classes, events, exams, tasks, grades, notes, settings: { ...DEFAULT_SETTINGS } };
}
