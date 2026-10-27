// Filtro por estudios: deja solo lo que pertenece a un estudio (DAW, Marketing...).
//   filter = 'todo'   -> todo
//   filter = id       -> solo las asignaturas de ese estudio y lo que cuelga de ellas
//   filter = 'otros'  -> lo que no tiene estudio: trabajo, eventos personales, asignaturas sin estudio
export function filterState(state, filter) {
  if (!filter || filter === 'todo') return state;
  const subjects = state.subjects.filter((s) => (filter === 'otros' ? !s.programId : s.programId === filter));
  const ids = new Set(subjects.map((s) => s.id));
  const inScope = (subjectId) => (subjectId ? ids.has(subjectId) : filter === 'otros');
  return {
    ...state,
    subjects,
    classes: state.classes.filter((x) => inScope(x.subjectId)),
    events: state.events.filter((x) => inScope(x.subjectId)),
    exams: state.exams.filter((x) => inScope(x.subjectId)),
    tasks: state.tasks.filter((x) => inScope(x.subjectId)),
    grades: state.grades.filter((x) => inScope(x.subjectId)),
    notes: state.notes.filter((x) => inScope(x.subjectId)),
  };
}
