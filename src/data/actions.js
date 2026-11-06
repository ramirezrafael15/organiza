// Operaciones de alto nivel sobre los datos (con las reglas de negocio).
import { parseIcs, planCalendarImport } from '../lib/ics.js';
import { planScheduleImport } from '../lib/scheduleImport.js';
import { planProgress } from '../lib/studyPlan.js';
import { newId } from './repository.js';
import { repo } from './repo.js';

export const actions = {
  /** Guarda un registro nuevo o editado. Los exámenes y entregas nuevos reciben los avisos por defecto. */
  save(col, data) {
    const isNew = !data.id;
    let item = data;
    if (isNew && (col === 'exams' || col === 'tasks') && !data.reminderDays) {
      item = { ...data, reminderDays: [...repo.getState().settings.reminderDays] };
    }
    // Un trabajo entregado está al 100 %.
    if (col === 'tasks' && item.status === 'entregado') item = { ...item, progress: 100 };
    return repo.upsert(col, item);
  },

  /** Borra un registro y limpia lo que dependía de él. */
  remove(col, id) {
    const state = repo.getState();
    // Una entrega o examen que vino de un calendario y borras a mano no vuelve a aparecer en la siguiente lectura.
    if ((col === 'tasks' || col === 'exams') && String(id).startsWith('ics_')) {
      repo.updateSettings({ icsDismissed: [...new Set([...(state.settings.icsDismissed ?? []), id])] });
    }
    if (col === 'programs') {
      // Las asignaturas se quedan, pero sin estudio.
      state.subjects.filter((s) => s.programId === id).forEach((s) => repo.upsert('subjects', { id: s.id, programId: null }));
    }
    if (col === 'subjects') {
      state.grades.filter((g) => g.subjectId === id).forEach((g) => repo.remove('grades', g.id));
    }
    if (col === 'exams') state.todos.filter((t) => t.examId === id).forEach((t) => repo.remove('todos', t.id)); // su plan de estudio
    if (col === 'folders') {
      // Los apuntes de la carpeta se quedan, sin carpeta.
      state.notes.filter((n) => n.folderId === id).forEach((n) => repo.upsert('notes', { id: n.id, folderId: null }));
    }
    if (col === 'exams' || col === 'tasks') {
      const type = col === 'exams' ? 'exam' : 'task';
      // Las notas enlazadas se quedan, pero sin enlace.
      state.notes
        .filter((n) => n.linkType === type && n.linkId === id)
        .forEach((n) => repo.upsert('notes', { id: n.id, linkType: null, linkId: null }));
    }
    repo.remove(col, id);
  },

  /** Borra varios de golpe (modo seleccionar). */
  removeMany(col, ids) {
    ids.forEach((id) => actions.remove(col, id));
  },

  /** Cambia el estado de una entrega (al entregarla pasa al 100 %). */
  setTaskStatus(task, status) {
    return actions.save('tasks', { ...task, status });
  },

  /** Marca o desmarca un pendiente del día a día. */
  toggleTodo(todo) {
    const saved = repo.upsert('todos', { ...todo, done: !todo.done, doneAt: todo.done ? null : Date.now() });
    // Si es una tarea del plan de estudio de un examen, la preparación del examen se calcula sola.
    if (todo.examId) {
      const { pct, total } = planProgress(repo.getState().todos, todo.examId);
      if (total >= 3) repo.upsert('exams', { id: todo.examId, progress: pct });
    }
    return saved;
  },

  setProgress(col, item, progress) {
    return actions.save(col, { ...item, progress });
  },

  /** Añade un horario desde un archivo (ver lib/scheduleImport.js) sin tocar lo que ya hay. */
  importSchedule(file) {
    const plan = planScheduleImport(repo.getState(), file, newId);
    plan.programs.forEach((p) => repo.upsert('programs', p));
    plan.subjects.forEach((s) => repo.upsert('subjects', s));
    plan.classes.forEach((c) => repo.upsert('classes', c));
    return plan;
  },

  /** Importa un calendario .ics (Moodle de PRADO, Atlántida…): entregas y exámenes, sin duplicar. */
  importCalendar(text, { programId = null } = {}) {
    const plan = planCalendarImport(repo.getState(), parseIcs(text), { programId, makeId: newId });
    plan.subjects.forEach((s) => repo.upsert('subjects', s));
    plan.tasks.forEach((t) => repo.upsert('tasks', t));
    plan.exams.forEach((x) => repo.upsert('exams', x));
    return plan;
  },

  updateSettings: (patch) => repo.updateSettings(patch),
  replaceAll: (state) => repo.replaceAll(state),
};
