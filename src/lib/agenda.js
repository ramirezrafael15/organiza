// Convierte los datos guardados (clases semanales, exámenes, entregas, eventos)
// en "entradas" homogéneas que pintan el calendario, el panel y las listas.
import { todayISO, weekdayOf } from './dates.js';
import { getUrgency } from './urgency.js';

/** Clases del horario que caen en una fecha (se repiten cada semana). */
export function classesOn(classes, iso) {
  const wd = weekdayOf(iso);
  return classes.filter(
    (c) =>
      c.weekdays?.includes(wd) &&
      (!c.from || iso >= c.from) && // las fechas ISO se comparan bien como texto
      (!c.until || iso <= c.until),
  );
}

const byTime = (a, b) => {
  if (!a.start && b.start) return -1; // lo "de todo el día" primero
  if (a.start && !b.start) return 1;
  if (a.start !== b.start) return (a.start || '').localeCompare(b.start || '');
  return a.title.localeCompare(b.title);
};

/**
 * Todas las entradas de un día, ordenadas por hora.
 * entry = { key, kind, title, date, start, end, subjectId, place, urgency, progress, status, col, item }
 * `col` e `item` apuntan al registro original para poder editarlo al pulsarlo.
 */
export function entriesOn(state, iso, today = todayISO()) {
  const out = [];
  const subjectName = (id) => state.subjects.find((s) => s.id === id)?.name;

  for (const c of classesOn(state.classes, iso)) {
    out.push({
      key: `class-${c.id}-${iso}`, kind: c.kind || 'clase', title: c.title, date: iso,
      start: c.start, end: c.end, subjectId: c.subjectId, place: c.place, col: 'classes', item: c,
    });
  }
  for (const e of state.events) {
    if (e.date !== iso) continue;
    out.push({
      key: `event-${e.id}`, kind: e.kind || 'personal', title: e.title, date: iso,
      start: e.start, end: e.end, subjectId: e.subjectId, place: e.place, col: 'events', item: e,
    });
  }
  for (const x of state.exams) {
    if (x.date !== iso) continue;
    const name = subjectName(x.subjectId);
    out.push({
      key: `exam-${x.id}`, kind: 'examen', title: name ? `Examen de ${name}` : 'Examen', date: iso,
      start: x.time, subjectId: x.subjectId, progress: x.progress ?? 0,
      urgency: getUrgency(x, 'exam', today), col: 'exams', item: x,
    });
  }
  for (const t of state.tasks) {
    if (t.due !== iso) continue;
    out.push({
      key: `task-${t.id}`, kind: 'entrega', title: t.title, date: iso, start: t.time,
      subjectId: t.subjectId, progress: t.progress ?? 0, status: t.status,
      urgency: getUrgency(t, 'task', today), col: 'tasks', item: t,
    });
  }
  return out.sort(byTime);
}

/** Entradas de una lista de fechas -> { 'YYYY-MM-DD': [entradas] } */
export function entriesByDay(state, days, today = todayISO()) {
  const map = {};
  for (const d of days) map[d] = entriesOn(state, d, today);
  return map;
}

/**
 * Exámenes y entregas pendientes con su urgencia, de más a menos urgente.
 * Es la base del bloque "Urgente" del panel.
 */
export function urgentItems(state, today = todayISO(), minLevel = 2) {
  const items = [];
  for (const x of state.exams) {
    const urgency = getUrgency(x, 'exam', today);
    if (urgency && urgency.level >= minLevel) items.push({ kind: 'examen', col: 'exams', item: x, date: x.date, urgency });
  }
  for (const t of state.tasks) {
    const urgency = getUrgency(t, 'task', today);
    if (urgency && urgency.level >= minLevel) items.push({ kind: 'entrega', col: 'tasks', item: t, date: t.due, urgency });
  }
  return items.sort((a, b) => b.urgency.level - a.urgency.level || a.date.localeCompare(b.date));
}

/** Exámenes que aún no han pasado, por fecha. */
export function upcomingExams(state, today = todayISO()) {
  return state.exams
    .filter((x) => x.date >= today)
    .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
}
