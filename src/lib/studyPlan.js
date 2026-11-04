// Plan de estudio de un examen: tareas por día (son pendientes con `examId`).
import { addDaysISO } from './dates.js';

/** "Tema 1, Tema 2\nTema 3" -> ['Tema 1','Tema 2','Tema 3'] */
export const parseTopics = (text) =>
  String(text ?? '').split(/[\n,;]+/).map((t) => t.replace(/^[-•*\d.)\s]+(?=\S)/, '').trim()).filter(Boolean);

/** Días disponibles para estudiar: desde hoy hasta el día ANTES del examen. */
export function studyDays(today, examDate) {
  const out = [];
  for (let d = today; d < examDate && out.length < 120; d = addDaysISO(d, 1)) out.push(d);
  return out;
}

/**
 * Reparte los temas a lo largo de los días. Si `reviewLast`, el último día queda para un repaso general.
 * Devuelve [{ date, title }].
 */
export function distribute(topics, days, { reviewLast = true } = {}) {
  if (!days.length) return [];
  const review = reviewLast && days.length >= 2;
  const spread = review ? days.slice(0, -1) : days;
  const out = topics.map((t, i) => ({ date: spread[Math.floor((i * spread.length) / topics.length)], title: `Estudiar: ${t}` }));
  if (review) out.push({ date: days[days.length - 1], title: 'Repaso general' });
  return out;
}

export const planOf = (todos, examId) => (todos ?? []).filter((t) => t.examId === examId);

export function planProgress(todos, examId) {
  const plan = planOf(todos, examId);
  const done = plan.filter((t) => t.done).length;
  return { done, total: plan.length, pct: plan.length ? Math.round((done / plan.length) * 100) : null };
}
