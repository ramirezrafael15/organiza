// Ordenar asignaturas sin perder nada: detectar repetidas y fusionar una dentro de otra moviendo todo lo suyo.
import { norm } from './scheduleImport.js';

/** Colecciones cuyos registros cuelgan de una asignatura por `subjectId`. */
export const SUBJECT_COLS = ['classes', 'events', 'exams', 'tasks', 'todos', 'notes', 'grades'];

/** Cuántas cosas tiene una asignatura, por colección (solo las que no son 0). */
export function subjectUsage(state, id) {
  const out = {};
  for (const c of SUBJECT_COLS) {
    const n = (state[c] ?? []).filter((x) => x.subjectId === id).length;
    if (n) out[c] = n;
  }
  return out;
}

/** Grupos de asignaturas que se llaman casi igual (mayúsculas, tildes y espacios no cuentan). */
export function duplicateGroups(subjects) {
  const by = new Map();
  for (const s of subjects) {
    const key = norm(s.name ?? '').replace(/\s+/g, ' ').trim();
    if (!key) continue;
    by.set(key, [...(by.get(key) ?? []), s]);
  }
  return [...by.values()].filter((g) => g.length > 1);
}

/**
 * Plan para fusionar `fromId` dentro de `intoId`: todo lo que colgaba de `from` pasa a `into` y `from` desaparece
 * (ya vacía). No borra ningún examen, nota, entrega ni calificación. Devuelve null si no se puede.
 */
export function planMerge(state, fromId, intoId) {
  if (!fromId || !intoId || fromId === intoId) return null;
  const from = state.subjects.find((s) => s.id === fromId);
  const into = state.subjects.find((s) => s.id === intoId);
  if (!from || !into) return null;
  const moves = {};
  for (const c of SUBJECT_COLS) {
    const ids = (state[c] ?? []).filter((x) => x.subjectId === fromId).map((x) => x.id);
    if (ids.length) moves[c] = ids;
  }
  // Si la de destino no tiene estudios y la otra sí, los hereda.
  const patch = !into.programId && from.programId ? { id: into.id, programId: from.programId } : null;
  return { from, into, moves, patch, total: Object.values(moves).reduce((a, l) => a + l.length, 0) };
}
