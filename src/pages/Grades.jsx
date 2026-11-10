// Calificaciones por asignatura, con media automática (por asignatura y general).
import { Empty, ProgramPill } from '../components/bits.jsx';
import Icon from '../components/Icon.jsx';
import { useUI } from '../components/ui.js';
import { useViewState } from '../data/viewFilter.js';
import { useState } from 'react';
import MergeSubjects from '../components/MergeSubjects.jsx';
import { formatGrade, gradeBand, neededGrade, overallAverage, subjectAverage } from '../lib/grades.js';

/** "¿Qué nota necesito?": nota mínima en lo que falta para llegar a un objetivo. */
function NeedCalc({ list }) {
  const [open, setOpen] = useState(false);
  // Si los pesos de las notas suman un porcentaje (p. ej. 50 de 100), propone lo que queda hasta 100; si no, 1.
  const [weight, setWeight] = useState(() => {
    const total = list.reduce((a, g) => a + (Number(g.weight) > 0 ? Number(g.weight) : 1), 0);
    return String(total >= 20 && total < 100 ? Math.round((100 - total) * 100) / 100 : 1);
  });
  const [target, setTarget] = useState('5');
  const r = open ? neededGrade(list, weight, target.replace(',', '.')) : null;
  if (!open) return <button className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => setOpen(true)}>¿Qué nota necesito?</button>;
  const msg = !r ? 'Pon un peso mayor que 0 y un objetivo.'
    : r.status === 'hecho' ? `Ya llegas al ${target} aunque saques 0 en lo que falta. 🎉`
    : r.status === 'imposible' ? `Imposible: necesitarías un ${formatGrade(r.needed)} y el máximo es 10. Prueba con un objetivo más bajo.`
    : `Necesitas un ${formatGrade(r.needed)} o más en lo que falta.`;
  const tone = !r || r.status === 'imposible' ? 'var(--danger)' : 'inherit';
  return (
    <div className="need-calc">
      <div className="row-gap" style={{ flexWrap: 'wrap', alignItems: 'end' }}>
        <label className="small muted">Peso de lo que falta<input type="number" inputMode="decimal" min="0" step="any" value={weight} onChange={(e) => setWeight(e.target.value)} style={{ width: 90 }} /></label>
        <label className="small muted">Quiero sacar<input type="number" inputMode="decimal" min="0" max="10" step="any" value={target} onChange={(e) => setTarget(e.target.value)} style={{ width: 90 }} /></label>
        <button className="link-btn" onClick={() => setOpen(false)}>Cerrar</button>
      </div>
      <p style={{ margin: '8px 0 0', fontWeight: 600, color: tone }}>{msg}</p>
      <p className="small muted" style={{ margin: '2px 0 0' }}>El peso va en la misma escala que el de tus notas (si pesan en porcentaje, lo que falta hasta 100; si todas pesan 1, un examen más = 1).</p>
    </div>
  );
}

export default function Grades() {
  const [merge, setMerge] = useState(false);
  const { subjects, grades } = useViewState();
  const { openForm } = useUI();
  const overall = overallAverage(subjects, grades);
  const band = gradeBand(overall);

  return (
    <>
      {merge && <MergeSubjects onClose={() => setMerge(false)} />}
      <div className="page-head">
        <h1>Calificaciones</h1>
        <div className="row-gap">
          <button className="btn" onClick={() => setMerge(true)}>Ordenar / fusionar</button>
          <button className="btn" onClick={() => openForm('subject')}><Icon name="plus" /> Asignatura</button>
        </div>
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
                <NeedCalc list={list} />
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
