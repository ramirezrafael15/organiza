// Entregas (trabajos): fechas, estado, progreso y urgencia.
import { useState } from 'react';
import { Empty, Progress, ProgressSlider, SubjectChip, UrgencyBadge } from '../components/bits.jsx';
import Icon from '../components/Icon.jsx';
import { useUI } from '../components/ui.js';
import { actions, useToday } from '../data/index.js';
import { useViewState } from '../data/viewFilter.js';
import { countdownLabel, fmt } from '../lib/dates.js';
import { TASK_STATUS } from '../lib/kinds.js';
import { getUrgency } from '../lib/urgency.js';

export default function Tasks() {
  const { openForm } = useUI();
  return (
    <>
      <div className="page-head">
        <h1>Entregas</h1>
        <button className="btn primary" onClick={() => openForm('task')}><Icon name="plus" /> Entrega</button>
      </div>
      <Deliveries />
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
