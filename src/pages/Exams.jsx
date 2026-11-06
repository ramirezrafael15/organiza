// Exámenes: agrupados por asignatura para que no sea una lista infinita.
import { useState } from 'react';
import { Empty, ProgramPill, ProgressSlider, UrgencyBadge } from '../components/bits.jsx';
import Icon from '../components/Icon.jsx';
import StudyPlan from '../components/StudyPlan.jsx';
import { pick, SelectBar, SelectButton, useSelect } from '../components/select.jsx';
import { useUI } from '../components/ui.js';
import { actions, useToday } from '../data/index.js';
import { useViewState } from '../data/viewFilter.js';
import { countdownLabel, daysUntil, fmt } from '../lib/dates.js';
import { planProgress } from '../lib/studyPlan.js';
import { getUrgency } from '../lib/urgency.js';

export default function Exams() {
  const { exams, subjects, todos } = useViewState();
  const today = useToday();
  const { openForm } = useUI();
  const [showPast, setShowPast] = useState(false);
  const [closed, setClosed] = useState({}); // grupos plegados
  const [planId, setPlanId] = useState(null);
  const sel = useSelect();

  const list = exams.filter((x) => (showPast ? x.date < today : x.date >= today));
  const sortBy = (a, b) => (showPast ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));

  // Un grupo por asignatura; el que tiene el examen más cercano va primero.
  const groups = [];
  list.forEach((x) => {
    const key = x.subjectId ?? 'none';
    let g = groups.find((y) => y.key === key);
    if (!g) groups.push((g = { key, subject: subjects.find((s) => s.id === x.subjectId), items: [] }));
    g.items.push(x);
  });
  groups.forEach((g) => g.items.sort(sortBy));
  groups.sort((a, b) => sortBy(a.items[0], b.items[0]));

  return (
    <>
      <div className="page-head">
        <h1>Exámenes</h1>
        <div className="row" style={{ gap: 8 }}>
          <SelectButton sel={sel} />
          <button className="btn primary" onClick={() => openForm('exam')}><Icon name="plus" /> Examen</button>
        </div>
      </div>
      <div className="chips" style={{ marginBottom: 12 }}>
        <button className={`chip-btn ${!showPast ? 'on' : ''}`} onClick={() => setShowPast(false)}>Próximos</button>
        <button className={`chip-btn ${showPast ? 'on' : ''}`} onClick={() => setShowPast(true)}>Pasados</button>
      </div>

      {groups.length ? (
        <div className="stack">
          {groups.map((g) => {
            const open = !closed[g.key];
            const next = g.items[0];
            return (
              <section key={g.key} className="exam-group" style={{ '--g': g.subject?.color ?? 'var(--muted)' }}>
                <button className="exam-group-head" aria-expanded={open} onClick={() => setClosed({ ...closed, [g.key]: open })}>
                  <i className="dot" />
                  <b>{g.subject?.name ?? 'Sin asignatura'}</b>
                  <span className="small muted">
                    {g.items.length} {g.items.length === 1 ? 'examen' : 'exámenes'}{!showPast && ` · el próximo ${countdownLabel(next.date, today)}`}
                  </span>
                  <span className="chev">{open ? '▾' : '▸'}</span>
                </button>
                {sel.on && (
                  <button className="btn small" style={{ margin: '0 0 8px' }} onClick={() => {
                    const all = g.items.every((x) => sel.has(x.id));
                    sel.set(all ? [...sel.ids].filter((id) => !g.items.some((x) => x.id === id)) : [...sel.ids, ...g.items.map((x) => x.id)]);
                  }}>
                    {g.items.every((x) => sel.has(x.id)) ? 'Quitar' : 'Marcar'} todos de {g.subject?.name ?? 'sin asignatura'}
                  </button>
                )}
                {open && (
                  <div className="cards">
                    {g.items.map((x) => {
                      const urgency = getUrgency(x, 'exam', today);
                      const n = daysUntil(x.date, today);
                      const p = planProgress(todos, x.id);
                      return (
                        <article key={x.id} className="card item-card" {...pick(sel, x.id)} style={{ '--c': urgency?.color ?? 'var(--muted)' }}>
                          <div className="item-top">
                            <div className="countdown">
                              <b>{n >= 0 ? n : '—'}</b>
                              <span>{n === 1 ? 'día' : n >= 0 ? 'días' : 'pasado'}</span>
                            </div>
                            <button className="grow" style={{ textAlign: 'left' }} onClick={() => openForm('exam', x)}>
                              <div className="item-title">{fmt(x.date, 'EEE d MMM')}{x.time ? ` · ${x.time}` : ''} <ProgramPill subject={g.subject} /></div>
                              <div className="small muted">{countdownLabel(x.date, today)}</div>
                              {x.topics && <div className="small muted" style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{x.topics}</div>}
                              {x.expectedGrade != null && <div className="small" style={{ marginTop: 4 }}>Nota esperada: <b>{x.expectedGrade}</b></div>}
                            </button>
                            <UrgencyBadge urgency={urgency} />
                          </div>
                          {!showPast && (
                            <div>
                              <div className="small muted">Preparación</div>
                              <ProgressSlider value={x.progress ?? 0} label="Preparación" onCommit={(v) => actions.setProgress('exams', x, v)} />
                              <button className="btn small" style={{ marginTop: 8 }} onClick={() => setPlanId(x.id)}>
                                📅 Plan de estudio{p.total ? ` · ${p.done}/${p.total}` : ''}
                              </button>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="card"><Empty>{showPast ? 'Aún no hay exámenes pasados.' : 'No tienes exámenes próximos.'}</Empty></div>
      )}
      <SelectBar sel={sel} visibleIds={list.map((x) => x.id)} noun="exámenes" onDelete={(ids) => actions.removeMany('exams', ids)} />
      {planId && exams.find((e) => e.id === planId) && <StudyPlan exam={exams.find((e) => e.id === planId)} onClose={() => setPlanId(null)} />}
    </>
  );
}
