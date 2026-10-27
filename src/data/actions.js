// Operaciones de alto nivel sobre los datos (con las reglas de negocio).
import { planScheduleImport } from '../lib/scheduleImport.js';
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
    if (col === 'programs') {
      // Las asignaturas se quedan, pero sin estudio.
      state.subjects.filter((s) => s.programId === id).forEach((s) => repo.upsert('subjects', { id: s.id, programId: null }));
    }
    if (col === 'subjects') {
      state.grades.filter((g) => g.subjectId === id).forEach((g) => repo.remove('grades', g.id));
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

  /** Cambia el estado de una entrega (al entregarla pasa al 100 %). */
  setTaskStatus(task, status) {
    return actions.save('tasks', { ...task, status });
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

  updateSettings: (patch) => repo.updateSettings(patch),
  replaceAll: (state) => repo.replaceAll(state),
};
