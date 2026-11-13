// Contexto que se manda al asistente: un resumen limpio y corto de lo que el usuario tiene en la app.
// `getPageContext(sección, estado, hoy)` devuelve el JSON de esa sección; `getOverview` es lo básico de TODA la app
// (para ahorrar tokens no se manda nada más). Funciones puras: se prueban sin React.
import { daysUntil, WEEKDAYS } from './dates.js';
import { overallAverage, subjectAverage } from './grades.js';
import { planProgress } from './studyPlan.js';

export const SECTIONS = ['panel', 'calendario', 'examenes', 'tareas', 'pendientes', 'estudio', 'notas', 'horario', 'calificaciones', 'ajustes'];

const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length)));
const short = (t, n = 120) => { const s = String(t ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? `${s.slice(0, n)}…` : s; };
const text = (html, n = 160) => short(String(html ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' '), n);
const byDate = (k) => (a, b) => String(a[k] ?? '9999').localeCompare(String(b[k] ?? '9999'));

function helpers(state, today) {
  const sname = (id) => state.subjects.find((s) => s.id === id)?.name;
  const exam = (x) => clean({ asignatura: sname(x.subjectId), fecha: x.date, hora: x.time, dias: daysUntil(x.date, today), temas: short(x.topics, 200), preparado: x.progress != null ? `${x.progress}%` : undefined, plan: planLabel(x) });
  const planLabel = (x) => { const p = planProgress(state.todos, x.id); return p.total ? `${p.done}/${p.total} sesiones hechas` : undefined; };
  const task = (t) => clean({ titulo: short(t.title, 80), asignatura: sname(t.subjectId), entrega: t.due, hora: t.time, dias: daysUntil(t.due, today), estado: t.status, progreso: t.progress != null ? `${t.progress}%` : undefined });
  const todo = (t) => clean({ titulo: short(t.title, 80), fecha: t.date, hora: t.time, dias: t.date ? daysUntil(t.date, today) : undefined, examen: t.examId ? 'plan de estudio' : undefined });
  const klass = (c) => clean({ dia: WEEKDAYS[c.weekday], de: c.start, a: c.end, asignatura: sname(c.subjectId), aula: c.room });
  return { sname, exam, task, todo, klass };
}

const upcomingExams = (s, today) => s.exams.filter((x) => x.date >= today).sort(byDate('date'));
const openTasks = (s) => s.tasks.filter((t) => t.status !== 'entregado').sort(byDate('due'));
const openTodos = (s) => s.todos.filter((t) => !t.done).sort(byDate('date'));

/** Lo básico de toda la app (siempre se manda). */
export function getOverview(state, today) {
  const h = helpers(state, today);
  return clean({
    hoy: today,
    dia: WEEKDAYS[(new Date(`${today}T12:00:00`).getDay() + 6) % 7],
    estudios: state.programs.map((p) => p.name),
    asignaturas: state.subjects.map((s) => s.name),
    examenes_proximos: upcomingExams(state, today).slice(0, 10).map(h.exam),
    entregas_pendientes: openTasks(state).slice(0, 10).map(h.task),
    pendientes_sin_hacer: openTodos(state).filter((t) => !t.examId).length,
    clases_por_semana: state.classes.length,
    apuntes: state.notes.length,
  });
}

/** Cada sección devuelve sus datos en JSON limpio y resumido. */
const BUILDERS = {
  panel: (s, today, h) => ({
    entregas: openTasks(s).slice(0, 12).map(h.task),
    examenes: upcomingExams(s, today).slice(0, 8).map(h.exam),
    pendientes_de_hoy: openTodos(s).filter((t) => !t.date || t.date <= today).slice(0, 15).map(h.todo),
  }),
  calendario: (s, today, h) => ({
    eventos: s.events.filter((e) => (e.date ?? '') >= today).sort(byDate('date')).slice(0, 20).map((e) => clean({ titulo: short(e.title, 80), fecha: e.date, hora: e.start ?? e.time })),
    examenes: upcomingExams(s, today).slice(0, 15).map(h.exam),
    entregas: openTasks(s).slice(0, 15).map(h.task),
  }),
  examenes: (s, today, h) => ({ proximos: upcomingExams(s, today).slice(0, 25).map(h.exam), pasados: s.exams.filter((x) => x.date < today).length }),
  tareas: (s, today, h) => ({ pendientes: openTasks(s).slice(0, 30).map(h.task), entregadas: s.tasks.filter((t) => t.status === 'entregado').length }),
  pendientes: (s, today, h) => ({ por_hacer: openTodos(s).slice(0, 40).map(h.todo), hechos: s.todos.filter((t) => t.done).length }),
  estudio: (s, today, h) => ({ examenes_con_plan: upcomingExams(s, today).slice(0, 15).map(h.exam), clases: s.classes.map(h.klass) }),
  notas: (s) => ({ apuntes: [...s.notes].slice(0, 30).map((n) => clean({ titulo: short(n.title, 60), asignatura: s.subjects.find((x) => x.id === n.subjectId)?.name, resumen: text(n.html ?? n.body) })), total: s.notes.length }),
  horario: (s, today, h) => ({ clases: s.classes.map(h.klass) }),
  calificaciones: (s) => ({
    media_general: overallAverage(s.subjects, s.grades),
    asignaturas: s.subjects.map((sub) => clean({
      asignatura: sub.name,
      media: subjectAverage(sub.id, s.grades),
      notas: s.grades.filter((g) => g.subjectId === sub.id).slice(0, 12).map((g) => clean({ nombre: short(g.name ?? g.title, 40), nota: g.value, peso: g.weight })),
    })).filter((x) => x.notas?.length),
  }),
  ajustes: () => ({}),
};

export function getPageContext(section, state, today) {
  const build = BUILDERS[section];
  return build ? clean(build(state, today, helpers(state, today))) : {};
}
