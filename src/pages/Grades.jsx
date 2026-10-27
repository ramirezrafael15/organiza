// Calificaciones por asignatura, con media automática (por asignatura y general).
import { Empty, ProgramPill } from '../components/bits.jsx';
import Icon from '../components/Icon.jsx';
import { useUI } from '../components/ui.js';
import { useViewState } from '../data/viewFilter.js';
import { formatGrade, gradeBand, overallAverage, subjectAverage } from '../lib/grades.js';

export default function Grades() {
  const { subjects, grades } = useViewState();
  const { openForm } = useUI();
  const overall = overallAverage(subjects, grades);
  const band = gradeBand(overall);

  return (
    <>
      <div className="page-head">
        <h1>Calificaciones</h1>
        <button className="btn" onClick={() => openForm('subject')}><Icon name="plus" /> Asignatura</button>
      </div>

      <div className="card row spread" style={{ marginBottom: 16 }}>
        <div>
          <div className="small muted">Media general</div>
          <div className={`grade-big tone-${band.tone}`}>{formatGrade(overall)}</div>
        </div>
        <span className="badge plain" style={{ '--c': 'var(--primary)' }}>{band.label}</span>
      </div>

      {subjects.length ? (
        <div className="cards">
          {subjects.map((s) => {
            const list = grades.filter((g) => g.subjectId === s.id);
            const avg = subjectAverage(s.id, grades);
            return (
              <section key={s.id} className="card item-card" style={{ '--c': s.color }}>
                <div className="row spread">
                  <button className="row" style={{ gap: 10, textAlign: 'left' }} onClick={() => openForm('subject', s)}>
                    <span className="item-title">{s.name}</span> <ProgramPill subject={s} />
                  </button>
                  <div className={`grade-big tone-${gradeBand(avg).tone}`} style={{ fontSize: '1.5rem' }}>{formatGrade(avg)}</div>
                </div>
                <div>
                  {list.map((g) => (
                    <button key={g.id} className="grade-row" onClick={() => openForm('grade', g)}>
                      <span className="grow">{g.name}</span>
                      {Number(g.weight) !== 1 && <span className="small muted">peso {g.weight}</span>}
                      <span className="grade-val">{formatGrade(g.value)}</span>
                    </button>
                  ))}
                </div>
                <button className="btn small" style={{ alignSelf: 'flex-start' }} onClick={() => openForm('grade', null, { subjectId: s.id })}>
                  <Icon name="plus" /> Nota
                </button>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="card"><Empty>Crea tus asignaturas para empezar a guardar notas.</Empty></div>
      )}
    </>
  );
}
