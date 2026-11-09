// Estadísticas de estudio: foco por asignatura y semana, tareas hechas y racha de días. Lógica pura.
import { addDaysISO, toISO } from './dates.js';

const KEEP_DAYS = 120;

/** Suma un bloque de foco al registro { 'YYYY-MM-DD': { rounds, min, by: { subjectId: min } } }. No muta. */
export function recordFocus(log, day, { min, rounds = 1, subjectId = null }) {
  const cur = log?.[day] ?? { rounds: 0, min: 0, by: {} };
  const by = { ...cur.by };
  if (subjectId) by[subjectId] = (by[subjectId] ?? 0) + min;
  const next = { ...log, [day]: { rounds: cur.rounds + rounds, min: cur.min + min, by } };
  const keys = Object.keys(next).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - KEEP_DAYS))) delete next[k];
  return next;
}

/** Lunes de la semana de `day`. */
export const mondayOf = (day) => {
  const d = new Date(`${day}T12:00:00`);
  return addDaysISO(day, -((d.getDay() + 6) % 7));
};

const doneDay = (ms) => (ms ? toISO(new Date(ms)) : null);

/** Resumen de la semana (lunes a domingo) que contiene `day`. */
export function weekStats(state, log, day) {
  const from = mondayOf(day);
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(from, i));
  const perDay = days.map((d) => ({ day: d, min: log?.[d]?.min ?? 0 }));
  const by = {};
  let rounds = 0;
  for (const d of days) {
    rounds += log?.[d]?.rounds ?? 0;
    for (const [id, m] of Object.entries(log?.[d]?.by ?? {})) by[id] = (by[id] ?? 0) + m;
  }
  const totalMin = perDay.reduce((a, x) => a + x.min, 0);
  const bySubject = Object.entries(by).map(([subjectId, min]) => ({ subjectId, min })).sort((a, b) => b.min - a.min);
  const inWeek = (iso) => iso && iso >= days[0] && iso <= days[6];
  const todosDone = (state.todos ?? []).filter((t) => t.done && inWeek(doneDay(t.doneAt))).length;
  const tasksDone = (state.tasks ?? []).filter((t) => t.status === 'entregado' && inWeek(doneDay(t.updatedAt))).length;
  return { from, days: perDay, totalMin, rounds, bySubject, todosDone, tasksDone, done: todosDone + tasksDone };
}

/**
 * Racha de días cumpliendo el plan. Un día cuenta si hubo actividad (foco o algún pendiente suyo hecho)
 * y no quedó ningún pendiente de ese día sin hacer. Hoy no rompe la racha si aún no lo has cumplido.
 */
export function streak(state, log, today) {
  const todos = state.todos ?? [];
  const ok = (day) => {
    const own = todos.filter((t) => t.date === day);
    if (own.some((t) => !t.done)) return false;
    return (log?.[day]?.min ?? 0) > 0 || own.length > 0; // own.length>0 y todos hechos = actividad
  };
  let n = 0;
  let day = today;
  if (!ok(day)) day = addDaysISO(day, -1);
  for (let i = 0; i < 400 && ok(day); i++) { n++; day = addDaysISO(day, -1); }
  return { days: n, todayDone: ok(today) };
}

export const fmtMin = (m) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);
