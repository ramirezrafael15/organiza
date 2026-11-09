// "Qué hago ahora": una sola lista ordenada por urgencia real.
// Junta pendientes, entregas, exámenes cercanos y lo que empieza en breve, y los puntúa.
import { daysUntil, relativeLabel, todayISO } from './dates.js';
import { classesOn } from './agenda.js';
import { getUrgency } from './urgency.js';

const mins = (hhmm) => { const [h, m] = String(hhmm ?? '').split(':').map(Number); return Number.isFinite(h) ? h * 60 + (m || 0) : null; };

const dueLabel = (daysLeft) => (daysLeft < 0 ? `Vencido hace ${-daysLeft} d` : daysLeft === 0 ? 'Hoy' : daysLeft === 1 ? 'Mañana' : `En ${daysLeft} días`);

/**
 * Puntuación de un examen o una entrega: pesa sobre todo el nivel de urgencia (que ya cuenta días y progreso),
 * y a igualdad, lo más cercano y lo menos avanzado va antes. Lo vencido sube por encima de todo.
 */
export function deadlineScore(u, progress = 0) {
  if (u.overdue) return 400 + Math.min(-u.daysLeft, 14);
  return u.level * 100 + Math.max(0, 14 - u.daysLeft) * 3 + (100 - progress) * 0.3;
}

/**
 * Lista ordenada de lo que conviene hacer ahora.
 * Cada elemento: { key, kind, title, subjectId, col, item, score, reason, date, time, canDone, canFocus }.
 * `nowHHMM` es la hora actual ('14:30') para saber qué empieza pronto.
 */
export function nowList(state, today = todayISO(), nowHHMM = '00:00') {
  const out = [];
  const now = mins(nowHHMM) ?? 0;
  const examById = new Map(state.exams.map((x) => [x.id, x]));
  const subjectName = (id) => state.subjects.find((s) => s.id === id)?.name;

  // Exámenes: solo los que ya merece la pena preparar (en 10 días o menos).
  for (const x of state.exams) {
    const u = getUrgency(x, 'exam', today);
    if (!u || u.daysLeft > 10) continue;
    const name = subjectName(x.subjectId);
    out.push({
      key: `exam-${x.id}`, kind: 'examen', title: name ? `Preparar examen de ${name}` : 'Preparar examen', subjectId: x.subjectId,
      col: 'exams', item: x, date: x.date, time: x.time, urgency: u, progress: x.progress ?? 0,
      score: deadlineScore(u, x.progress ?? 0), reason: `Examen ${dueLabel(u.daysLeft).toLowerCase()} · ${x.progress ?? 0} % preparado`,
      canDone: false, canFocus: true,
    });
  }

  // Entregas: pendientes y a 14 días o menos (o vencidas).
  for (const t of state.tasks) {
    const u = getUrgency(t, 'task', today);
    if (!u || u.daysLeft > 14) continue;
    out.push({
      key: `task-${t.id}`, kind: 'entrega', title: t.title, subjectId: t.subjectId, col: 'tasks', item: t, date: t.due, time: t.time,
      urgency: u, progress: t.progress ?? 0, score: deadlineScore(u, t.progress ?? 0),
      reason: `Entrega ${dueLabel(u.daysLeft).toLowerCase()} · ${t.progress ?? 0} %`, canDone: true, canFocus: true,
    });
  }

  // Pendientes del día a día: los de hoy y los atrasados (los sin fecha no compiten).
  for (const t of state.todos ?? []) {
    if (t.done || !t.date || t.date > today) continue;
    const late = daysUntil(t.date, today) < 0;
    let score; let reason;
    if (late) { const d = -daysUntil(t.date, today); score = 260 + Math.min(d, 10); reason = `Atrasado ${d} d`; }
    else {
      const at = mins(t.time);
      const bonus = at == null ? 0 : at - now <= 90 && at - now >= -60 ? 45 : 12;
      score = 200 + bonus; reason = t.time ? `Hoy a las ${t.time}` : 'Hoy';
    }
    const ex = t.examId ? examById.get(t.examId) : null;
    const eu = ex ? getUrgency(ex, 'exam', today) : null;
    if (eu) score += eu.level * 15;
    out.push({
      key: `todo-${t.id}`, kind: 'pendiente', title: t.title, subjectId: t.subjectId, col: 'todos', item: t, date: t.date, time: t.time,
      score, reason, canDone: true, canFocus: true,
    });
  }

  // Clases y eventos de hoy: solo si están en curso o empiezan en la próxima hora.
  const today_ = [
    ...classesOn(state.classes, today).map((c) => ({ c, col: 'classes', kind: 'clase' })),
    ...state.events.filter((e) => e.date === today).map((c) => ({ c, col: 'events', kind: 'evento' })),
  ];
  for (const { c, col, kind } of today_) {
    const s = mins(c.start); if (s == null) continue;
    const e = mins(c.end) ?? s + 60;
    if (now > e || s - now > 60) continue;
    const ongoing = now >= s;
    out.push({
      key: `${kind}-${c.id}`, kind, title: c.title, subjectId: c.subjectId, col, item: c, date: today, time: c.start,
      score: 230, reason: ongoing ? `En curso hasta las ${c.end ?? ''}`.trim() : `Empieza en ${s - now} min`, canDone: false, canFocus: false,
    });
  }

  return out.sort((a, b) => b.score - a.score || (a.date ?? '').localeCompare(b.date ?? '') || a.title.localeCompare(b.title));
}

export { relativeLabel };
