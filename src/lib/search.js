// Búsqueda de texto en las notas (sin distinguir mayúsculas ni tildes).
const normalize = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Texto de lo que está enlazado a la nota (asignatura, examen o entrega). */
export function linkedLabel(note, state) {
  if (note.linkType === 'exam') {
    const x = state.exams.find((e) => e.id === note.linkId);
    if (!x) return null;
    const s = state.subjects.find((s) => s.id === x.subjectId);
    return s ? `Examen de ${s.name}` : 'Examen';
  }
  if (note.linkType === 'task') {
    return state.tasks.find((t) => t.id === note.linkId)?.title ?? null;
  }
  return null;
}

/** ¿La nota contiene todas las palabras de la búsqueda? */
export function matchNote(note, query, state) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const subject = state.subjects.find((s) => s.id === note.subjectId)?.name;
  const haystack = normalize([note.title, note.body, subject, linkedLabel(note, state)].join(' '));
  return words.every((w) => haystack.includes(w));
}
