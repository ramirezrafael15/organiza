// Exámenes y entregas (trabajos): fechas, estado, progreso y urgencia.
import { useState } from 'react';
import { Empty, ProgramPill, Progress, ProgressSlider, SubjectChip, UrgencyBadge } from '../components/bits.jsx';
import Icon from '../components/Icon.jsx';
import { useUI } from '../components/ui.js';
import { actions, useToday } from '../data/index.js';
import { useViewState } from '../data/viewFilter.js';
import { countdownLabel, daysUntil, fmt } from '../lib/dates.js';
import { TASK_STATUS } from '../lib/kinds.js';
import { getUrgency } from '../lib/urgency.js';

export default function Tasks() {
  const [tab, setTab] = useState('examenes');
  const { openForm } = useUI();
  return (
    <>
      <div className="page-head">
        <h1>Exámenes y entregas</h1>
        <button className="btn primary" onClick={() => openForm(tab === 'examenes' ? 'exam' : 'task')}>
          <Icon name="plus" /> {tab === 'examenes' ? 'Examen' : 'Entrega'}
        </button>
      </div>
      <div className="seg tabs">
        <button className={tab === 'examenes' ? 'on' : ''} onClick={() => setTab('examenes')}>Exámenes</button>
        <button className={tab === 'entregas' ? 'on' : ''} onClick={() => setTab('entregas')}>Entregas</button>
      </div>
      {tab === 'examenes' ? <Exams /> : <Deliveries />}
    </>
  );
}

function Exams() {
  const { exams, subjects } = useViewState();
  const today = useToday();
  const { openForm } = useUI();
  const [showPast, setShowPast] = useState(false);

  const list = exams
    .filter((x) => (showPast ? x.date < today : x.date >= today))
    .sort((a, b) => (showPast ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));

  return (
    <>
      <div className="chips" style={{ marginBottom: 12 }}>
        <button className={`chip-btn ${!showPast ? 'on' : ''}`} onClick={() => setShowPast(false)}>Próximos</button>
        <button className={`chip-btn ${showPast ? 'on' : ''}`} onClick={() => setShowPast(true)}>Pasados</button>
      </div>
      {list.length ? (
        <div className="cards">
          {list.map((x) => {
            const subject = subjects.find((s) => s.id === x.subjectId);
            const urgency = getUrgency(x, 'exam', today);
            const n = daysUntil(x.date, today);
            return (
              <article key={x.id} className="card item-card" style={{ '--c': urgency?.color ?? 'var(--muted)' }}>
                <div className="item-top">
                  <div className="countdown">
                    <b>{n >= 0 ? n : '—'}</b>
                    <span>{n === 1 ? 'día' : n >= 0 ? 'días' : 'pasado'}</span>
                  </div>
                  <button className="grow" style={{ textAlign: 'left' }} onClick={() => openForm('exam', x)}>
                    <div className="item-title">{subject?.name ?? 'Examen'} <ProgramPill subject={subject} /></div>
                    <div className="small muted">
                      {fmt(x.date, 'EEE d MMM')}{x.time ? ` · ${x.time}` : ''} · {countdownLabel(x.date, today)}
                    </div>
                    {x.topics && <div className="small muted" style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{x.topics}</div>}
                    {x.expectedGrade != null && <div className="small" style={{ marginTop: 4 }}>Nota esperada: <b>{x.expectedGrade}</b></div>}
                  </button>
                  <UrgencyBadge urgency={urgency} />
                </div>
                {!showPast && (
                  <div>
                    <div className="small muted">Preparación</div>
                    <ProgressSlider value={x.progress ?? 0} label="Preparación" onCommit={(v) => actions.setProgress('exams', x, v)} />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card"><Empty>{showPast ? 'Aún no hay exámenes pasados.' : 'No tienes exámenes próximos.'}</Empty></div>
      )}
    </>
  );
}

const FILTERS = [{ value: 'todas', label: 'Todas' }, ...Object.entries(TASK_STATUS).map(([value, label]) => ({ value, label }))];

function Deliveries() {
  const { tasks, subjects } = useViewState();
  const today = useToday();
  const { openForm } = useUI();
  const [filter, setFilter] = useState('todas');

  // Pendientes primero (por fecha límite); los entregados al final.
  const list = tasks
    .filter((t) => filter === 'todas' || t.status === filter)
    .sort((a, b) => (a.status === 'entregado') - (b.status === 'entregado') || a.due.localeCompare(b.due));

  return (
    <>
      <div className="chips" style={{ marginBottom: 12 }}>
        {FILTERS.map((f) => (
          <button key={f.value} className={`chip-btn ${filter === f.value ? 'on' : ''}`} onClick={() => setFilter(f.value)}>{f.label}</button>
        ))}
      </div>
      {list.length ? (
        <div className="cards">
          {list.map((t) => {
            const subject = subjects.find((s) => s.id === t.subjectId);
            const urgency = getUrgency(t, 'task', today);
            return (
              <article key={t.id} className="card item-card" style={{ '--c': urgency?.color ?? 'var(--u-0)', opacity: t.status === 'entregado' ? 0.7 : 1 }}>
                <div className="item-top">
                  <button className="grow" style={{ textAlign: 'left' }} onClick={() => openForm('task', t)}>
                    <div className="item-title">{t.title}</div>
                    <div className="small muted">
                      {fmt(t.due, 'EEE d MMM')}{t.time ? ` · ${t.time}` : ''} · {countdownLabel(t.due, today)}
                    </div>
                    <SubjectChip subject={subject} />
                  </button>
                  <UrgencyBadge urgency={urgency} />
                </div>
                <div className="seg" role="group" aria-label="Estado">
                  {Object.entries(TASK_STATUS).map(([value, label]) => (
                    <button key={value} className={t.status === value ? 'on' : ''} onClick={() => actions.setTaskStatus(t, value)}>{label}</button>
                  ))}
                </div>
                {t.status === 'entregado' ? (
                  <Progress value={100} color="var(--u-0)" />
                ) : (
                  <ProgressSlider value={t.progress ?? 0} label="Progreso" onCommit={(v) => actions.setProgress('tasks', t, v)} />
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card"><Empty>No hay entregas aquí.</Empty></div>
      )}
    </>
  );
}
