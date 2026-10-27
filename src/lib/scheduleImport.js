// Importar un horario desde un archivo .json SIN borrar nada: solo añade lo que falta.
//
// Formato del archivo:
// {
//   "programs": [{ "name": "DAW", "color": "#2563eb" }],
//   "subjects": [{ "name": "Desarrollo Web Servidor", "program": "DAW" }],
//   "classes":  [{ "title": "Desarrollo Web Servidor", "subject": "Desarrollo Web Servidor",
//                  "weekdays": [0], "start": "17:30", "end": "21:30", "place": "Aula 4" }]
// }
// weekdays: 0 = lunes ... 4 = viernes. Los estudios y asignaturas que ya existan (por nombre,
// sin mirar mayúsculas ni tildes) se reutilizan; las clases idénticas no se duplican.
import { PALETTE } from './kinds.js';

const norm = (s = '') => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Mismo nombre, o uno contenido en el otro ("Marketing" ~ "Grado en Marketing"). */
const sameName = (a, b) => {
  const x = norm(a), y = norm(b);
  return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
};

/**
 * Calcula qué hay que añadir (función pura, no guarda nada).
 * makeId genera ids nuevos. Devuelve { programs, subjects, classes, skipped } con los registros a guardar.
 */
export function planScheduleImport(state, file, makeId) {
  const programs = [];
  const subjects = []; // nuevos o con cambios (id existente + programId)
  const classes = [];
  let skipped = 0;

  const allPrograms = [...state.programs];
  const allSubjects = [...state.subjects];

  const programIdByName = (name) => {
    if (!name) return null;
    let p = allPrograms.find((x) => sameName(x.name, name));
    if (!p) {
      const spec = (file.programs ?? []).find((x) => norm(x.name) === norm(name));
      p = { id: makeId(), name, color: spec?.color ?? PALETTE[(allPrograms.length * 2) % PALETTE.length] };
      allPrograms.push(p);
      programs.push(p);
    }
    return p.id;
  };

  const subjectByName = (name, programName) => {
    if (!name) return null;
    let s = allSubjects.find((x) => norm(x.name) === norm(name));
    const programId = programIdByName(programName);
    if (!s) {
      s = { id: makeId(), name, color: PALETTE[allSubjects.length % PALETTE.length], programId };
      allSubjects.push(s);
      subjects.push(s);
    } else if (!s.programId && programId) {
      const fixed = { ...s, programId }; // la asignatura existía pero sin estudios: se los damos
      allSubjects[allSubjects.indexOf(s)] = fixed;
      subjects.push({ id: s.id, programId });
      s = fixed;
    }
    return s;
  };

  for (const spec of file.programs ?? []) programIdByName(spec.name);
  for (const spec of file.subjects ?? []) subjectByName(spec.name, spec.program);

  const existing = [...state.classes];
  for (const c of file.classes ?? []) {
    const subject = c.subject ? subjectByName(c.subject, (file.subjects ?? []).find((x) => norm(x.name) === norm(c.subject))?.program) : null;
    const days = [...(c.weekdays ?? [])].sort();
    const dup = existing.some((e) =>
      norm(e.title) === norm(c.title) && e.start === c.start && e.end === c.end && [...(e.weekdays ?? [])].sort().join() === days.join());
    if (dup) { skipped++; continue; }
    const item = {
      id: makeId(), title: c.title, kind: c.kind ?? 'clase', subjectId: subject?.id ?? null,
      weekdays: days, start: c.start, end: c.end, place: c.place ?? '', from: c.from ?? '', until: c.until ?? '',
    };
    existing.push(item);
    classes.push(item);
  }
  return { programs, subjects, classes, skipped };
}
