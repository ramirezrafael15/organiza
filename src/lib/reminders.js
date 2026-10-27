// Avisos escalonados: "avísame 7, 3 y 1 días antes y el mismo día".
// Cada examen, entrega o evento guarda su lista `reminderDays` (días de antelación).
// Esta lógica es pura: la usa el Panel ahora y la usarán las notificaciones push en la fase 2.
import { daysUntil, todayISO } from './dates.js';

/** Antelaciones que se pueden elegir (en días). 0 = el mismo día. */
export const REMINDER_CHOICES = [30, 21, 14, 7, 5, 3, 2, 1, 0];

/** Avisos por defecto de un evento nuevo (examen y entrega usan los de Ajustes). */
export const DEFAULT_EVENT_REMINDERS = [1, 0];

export const reminderChoiceLabel = (d) => (d === 0 ? 'Mismo día' : d === 1 ? '1 día' : `${d} días`);

/** "7, 3 y 1 días antes, y el mismo día" */
export function reminderSummary(days = []) {
  const before = days.filter((d) => d > 0).sort((a, b) => b - a);
  const sameDay = days.includes(0);
  if (!before.length && !sameDay) return 'Sin avisos';
  const list = before.length > 1 ? `${before.slice(0, -1).join(', ')} y ${before.at(-1)}` : String(before[0] ?? '');
  const beforeText = before.length ? `${list} ${before.length === 1 && before[0] === 1 ? 'día' : 'días'} antes` : '';
  if (beforeText && sameDay) return `${beforeText}, y el mismo día`;
  return beforeText || 'El mismo día';
}

const pct = (p) => `${Math.round(p ?? 0)} %`;

/** Texto del aviso: "Te quedan 3 días para el examen de Bases de Datos, llevas el 40 % preparado." */
export function reminderMessage({ kind, title, subjectName, daysLeft, progress }) {
  const n = `${daysLeft} días`;
  if (kind === 'examen') {
    const name = subjectName || 'esta asignatura';
    const tail = `llevas el ${pct(progress)} preparado.`;
    if (daysLeft === 0) return `¡Hoy es el examen de ${name}! Llevas el ${pct(progress)} preparado.`;
    if (daysLeft === 1) return `Mañana es el examen de ${name}, ${tail}`;
    return `Te quedan ${n} para el examen de ${name}, ${tail}`;
  }
  if (kind === 'entrega') {
    const tail = `vas por el ${pct(progress)}.`;
    if (daysLeft === 0) return `Hoy vence «${title}», ${tail}`;
    if (daysLeft === 1) return `Mañana vence «${title}», ${tail}`;
    return `Te quedan ${n} para entregar «${title}», ${tail}`;
  }
  if (daysLeft === 0) return `Hoy: ${title}`;
  if (daysLeft === 1) return `Mañana: ${title}`;
  return `Dentro de ${n}: ${title}`;
}

/** Ritmo necesario para llegar al 100 % ("≈ 15 % al día"), o null si no aplica. */
export function paceHint(progress, daysLeft) {
  if (daysLeft < 1 || progress >= 100) return null;
  const perDay = Math.ceil((100 - (progress ?? 0)) / daysLeft);
  return `Para llegar al 100 % necesitas ≈ ${perDay} % al día`;
}

/**
 * Avisos activos hoy: exámenes, entregas y eventos que ya han entrado en su ventana de aviso
 * (faltan menos días que el aviso más lejano que configuraste).
 *   isNew = true  -> hoy toca justo uno de los avisos (p. ej. faltan exactamente 3 días y tienes un aviso a 3).
 * Ordenados por proximidad. Los exámenes pasados y las entregas ya entregadas no avisan.
 */
export function activeReminders(state, today = todayISO()) {
  const defaults = state.settings?.reminderDays ?? [];
  const subjectName = (id) => state.subjects.find((s) => s.id === id)?.name;
  const out = [];

  const consider = ({ kind, col, item, date, title, days, progress }) => {
    if (!days?.length) return;
    const daysLeft = daysUntil(date, today);
    if (daysLeft < 0 || daysLeft > Math.max(...days)) return;
    out.push({
      key: `${col}-${item.id}`, kind, col, item, date, daysLeft, subjectId: item.subjectId,
      isNew: days.includes(daysLeft),
      reminderTime: item.reminderTime || null, // 'HH:mm' propia de este aviso; null = la de Ajustes
      message: reminderMessage({ kind, title, subjectName: subjectName(item.subjectId), daysLeft, progress }),
      hint: kind === 'evento' ? null : paceHint(progress ?? 0, daysLeft),
    });
  };

  for (const x of state.exams) {
    consider({ kind: 'examen', col: 'exams', item: x, date: x.date, days: x.reminderDays ?? defaults, progress: x.progress });
  }
  for (const t of state.tasks) {
    if (t.status === 'entregado') continue;
    consider({ kind: 'entrega', col: 'tasks', item: t, date: t.due, title: t.title, days: t.reminderDays ?? defaults, progress: t.progress });
  }
  for (const e of state.events) {
    consider({ kind: 'evento', col: 'events', item: e, date: e.date, title: e.title, days: e.reminderDays ?? [] });
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft || a.date.localeCompare(b.date));
}
