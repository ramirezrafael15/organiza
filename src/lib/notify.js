// Qué notificaciones hay que enviar ahora mismo. Lógica pura: la usa el servidor (scripts/send-reminders.mjs).
// Un aviso se manda UNA vez, el día que toca (según los días de antelación de cada examen/entrega/evento),
// a partir de la hora de ese aviso (reminderTime 'HH:mm' del propio examen/entrega/evento; si no tiene, la hora
// por defecto de Ajustes, notifyHour). Si el servidor se retrasa, se manda en cuanto pueda ese mismo día.
import { activeReminders } from './reminders.js';

export const DEFAULT_TZ = 'Europe/Madrid';

/** Fecha 'YYYY-MM-DD', hora (0-23) y minuto en una zona horaria. */
export function zonedNow(now, tz = DEFAULT_TZ) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(now).map((p) => [p.type, p.value]),
  );
  return { today: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), minute: Number(parts.minute) };
}

const TITLES = { examen: 'Examen', entrega: 'Entrega', evento: 'Evento' };

/**
 * @param state  estado de la app del usuario (con settings)
 * @param sent   Set de claves ya enviadas
 * @param graceMinutes  espera extra tras la hora del aviso (el respaldo de GitHub la usa para no pisar al servidor puntual)
 * @returns [{ key, title, body, tag, url }]
 */
export function planNotifications({ state, now = new Date(), sent = new Set(), graceMinutes = 0 }) {
  const tz = state.settings?.timezone || DEFAULT_TZ;
  const notifyHour = state.settings?.notifyHour ?? 8;
  const { today, hour, minute } = zonedNow(now, tz);
  const nowMin = hour * 60 + minute;
  const minutesOf = (hhmm) => {
    if (!hhmm) return notifyHour * 60; // sin hora propia: la de Ajustes
    const [h, m] = hhmm.split(':').map(Number);
    return Number.isFinite(h) ? h * 60 + (m || 0) : notifyHour * 60;
  };

  const subjectName = (id) => state.subjects.find((s) => s.id === id)?.name;
  return activeReminders(state, today)
    .filter((r) => r.isNew && nowMin >= minutesOf(r.reminderTime) + graceMinutes) // hoy toca uno de los avisos y ya es su hora
    .map((r) => {
      const key = `${r.col}-${r.item.id}-${r.date}-d${r.daysLeft}`;
      const what = r.kind === 'examen' ? subjectName(r.subjectId) : r.item.title;
      return {
        key,
        title: `${TITLES[r.kind]}${what ? ` · ${what}` : ''}`,
        body: r.hint ? `${r.message} ${r.hint}.` : r.message,
        tag: key,
      };
    })
    .filter((n) => !sent.has(n.key));
}
