// Organizador de estudio: una semana con lo que vas a estudiar cada día, junto a tus exámenes.
// Las tareas son pendientes (marcados como "estudio"), así que también salen en Pendientes, Panel y Calendario.
import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import Techniques from '../components/Focus.jsx';
import StudyPlan from '../components/StudyPlan.jsx';
import { Progress } from '../components/bits.jsx';
import { useUI } from '../components/ui.js';
import { actions, useToday } from '../data/index.js';
import { useViewState } from '../data/viewFilter.js';
import { addDaysISO, countdownLabel, daysUntil, fmt, WEEKDAYS_3, weekDays, weekdayOf } from '../lib/dates.js';
import { planProgress } from '../lib/studyPlan.js';

const isStudy = (t) => t.study || t.examId;

export default function Study() {
  const { todos, exams, subjects } = useViewState();
  const { openForm } = useUI();
  const today = useToday();
  const [anchor, setAnchor] = useState(today);
  const [adding, setAdding] = useState(null);
  const [subjectId, setSubjectId] = useState('');
  const [text, setText] = useState('');
  const [planId, setPlanId] = useState(null);
  const [over, setOver] = useState(null);
  const [tab, setTab] = useState('semana');

  const days = weekDays(anchor);
  const subj = (id) => subjects.find((s) => s.id === id);
  const upcoming = exams.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const rangeLabel = `${fmt(days[0], 'd MMM')} – ${fmt(days[6], 'd MMM')}`;

  const add = (e, date) => {
    e.preventDefault();
    const title = text.trim();
    if (!title) return;
    // Si hay un examen próximo de esa asignatura, la tarea cuenta para su preparación.
    const exam = subjectId ? upcoming.find((x) => x.subjectId === subjectId && x.date >= date) : null;
    actions.save('todos', { title, date, time: '', subjectId: subjectId || null, examId: exam?.id ?? null, study: true, done: false });
    setText('');
  };
  const drop = (e, date) => {
    e.preventDefault();
    setOver(null);
    const t = todos.find((x) => x.id === e.dataTransfer.getData('text/plain'));
    if (t && t.date !== date) actions.save('todos', { ...t, date });
  };

  return (
    <>
      <div className="page-head">
        <h1>Estudio</h1>
        {tab === 'semana' && <div className="row-gap">
          <button className="btn" aria-label="Semana anterior" onClick={() => setAnchor(addDaysISO(anchor, -7))}><Icon name="left" /></button>
          <button className="btn" onClick={() => setAnchor(today)}>Hoy</button>
          <button className="btn" aria-label="Semana siguiente" onClick={() => setAnchor(addDaysISO(anchor, 7))}><Icon name="right" /></button>
        </div>}
      </div>
      <div className="seg" style={{ marginBottom: 14 }} role="tablist">
        <button className={tab === 'semana' ? 'on' : ''} onClick={() => setTab('semana')}>Semana</button>
        <button className={tab === 'tecnicas' ? 'on' : ''} onClick={() => setTab('tecnicas')}>Técnicas</button>
      </div>
      {tab === 'tecnicas' ? <Techniques /> : <>
      <p className="muted" style={{ margin: '-6px 0 12px' }}>{rangeLabel} · pon en cada día lo que vas a estudiar. En el ordenador puedes arrastrar las tareas de un día a otro.</p>

      {upcoming.length > 0 && (
        <div className="study-exams">
          {upcoming.slice(0, 8).map((x) => {
            const s = subj(x.subjectId);
            const p = planProgress(todos, x.id);
            return (
              <button key={x.id} className="card study-exam" style={{ '--c': s?.color ?? 'var(--primary)' }} onClick={() => setPlanId(x.id)}>
                <b>{s?.name ?? 'Examen'}</b>
                <span className="small muted">{fmt(x.date, 'EEE d MMM')} · {countdownLabel(x.date, today)}</span>
                <Progress value={x.progress ?? 0} color={s?.color} />
                <span className="small muted">{p.total ? `${p.done}/${p.total} tareas · ` : 'Sin plan · '}Preparación {x.progress ?? 0} %</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="study-week">
        {days.map((d) => {
          const items = todos.filter((t) => isStudy(t) && t.date === d)
            .sort((a, b) => (a.time || '99').localeCompare(b.time || '99') || (a.createdAt ?? 0) - (b.createdAt ?? 0));
          const dayExams = exams.filter((x) => x.date === d);
          return (
            <section key={d} className={`study-day ${d === today ? 'today' : ''} ${over === d ? 'over' : ''} ${d < today ? 'past' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setOver(d); }} onDragLeave={() => setOver((o) => (o === d ? null : o))} onDrop={(e) => drop(e, d)}>
              <div className="study-day-head">
                <b>{WEEKDAYS_3[weekdayOf(d)]} {fmt(d, 'd')}</b>
                <span className="small muted">{d === today ? 'Hoy' : daysUntil(d, today) === 1 ? 'Mañana' : fmt(d, 'MMM')}</span>
                <button className="link-btn" style={{ marginLeft: 'auto' }} onClick={() => { setAdding(adding === d ? null : d); setText(''); }}>＋</button>
              </div>
              {dayExams.map((x) => <div key={x.id} className="plan-exam">🎯 Examen · {subj(x.subjectId)?.name ?? ''}{x.time ? ` · ${x.time}` : ''}</div>)}
              {items.map((t) => (
                <div key={t.id} className={`study-item ${t.done ? 'done' : ''}`} style={{ '--c': subj(t.subjectId)?.color ?? 'var(--muted)' }}
                  draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', t.id)}>
                  <button className="todo-check" aria-label="Marcar como hecho" aria-pressed={!!t.done} onClick={() => actions.toggleTodo(t)}>{t.done ? '✓' : ''}</button>
                  <button className="study-item-main" onClick={() => openForm('todo', t)}>
                    <span className="todo-title">{t.title}</span>
                    {(subj(t.subjectId) || t.time) && <span className="small muted">{[t.time, subj(t.subjectId)?.name].filter(Boolean).join(' · ')}</span>}
                  </button>
                </div>
              ))}
              {!items.length && !dayExams.length && adding !== d && <span className="small muted study-empty">—</span>}
              {adding === d && (
                <form className="stack" onSubmit={(e) => add(e, d)}>
                  <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} aria-label="Asignatura">
                    <option value="">Sin asignatura</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <div className="ai-free">
                    <input autoFocus type="text" placeholder="¿Qué vas a estudiar?" value={text} onChange={(e) => setText(e.target.value)} />
                    <button className="btn primary" disabled={!text.trim()}>Añadir</button>
                  </div>
                </form>
              )}
            </section>
          );
        })}
      </div>
      </>}
      {planId && exams.find((x) => x.id === planId) && <StudyPlan exam={exams.find((x) => x.id === planId)} onClose={() => setPlanId(null)} />}
    </>
  );
}
