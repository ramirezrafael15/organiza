// Color con el que se pinta una entrada de la agenda.
// Por defecto el del tipo (examen, clase...). Si en Ajustes se elige "colorear por estudios",
// las entradas con asignatura usan el color de su estudio (DAW, Marketing...).
import { KINDS } from './kinds.js';

/** Color del estudio (DAW, Marketing...) de una entrada, o null si no tiene. */
export function programColor({ subjectId }, state) {
  const subject = state.subjects.find((s) => s.id === subjectId);
  return state.programs?.find((p) => p.id === subject?.programId)?.color ?? null;
}

export function entryColor({ kind, subjectId }, state) {
  if (state.settings?.colorBy === 'estudios') {
    const subject = state.subjects.find((s) => s.id === subjectId);
    const program = state.programs?.find((p) => p.id === subject?.programId);
    if (program) return program.color;
  }
  return KINDS[kind].color;
}
