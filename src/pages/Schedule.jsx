// Horario semanal de clases y trabajo (se repite cada semana).
import { Empty, SubjectChip } from '../components/bits.jsx';
import Icon from '../components/Icon.jsx';
import { useUI } from '../components/ui.js';
import { useToday } from '../data/index.js';
import { useViewState } from '../data/viewFilter.js';
import { WEEKDAYS, timeLabel, weekdayOf } from '../lib/dates.js';
import { entryColor } from '../lib/color.js';

export default function Schedule() {
  const state = useViewState();
  const { classes } = state;
  const today = useToday();
  const { openForm } = useUI();
  const todayWd = weekdayOf(today);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Horario</h1>
          <p className="sub">Clases y trabajo que se repiten cada semana</p>
        </div>
        <button className="btn primary" onClick={() => openForm('class')}><Icon name="plus" /> Añadir</button>
      </div>

      <div className="sched">
        {WEEKDAYS.map((name, wd) => {
          const items = classes
            .filter((c) => c.weekdays?.includes(wd))
            .sort((a, b) => a.start.localeCompare(b.start));
          return (
            <section key={name} className="card" style={wd === todayWd ? { borderColor: 'var(--primary)' } : undefined}>
              <div className="section-head">
                <h2>{name}</h2>
                {wd === todayWd && <span className="badge plain" style={{ '--c': 'var(--primary)' }}>Hoy</span>}
              </div>
              {items.length ? (
                <div className="entries">
                  {items.map((c) => (
                    <button key={c.id} className="entry compact" style={{ '--k': entryColor({ kind: c.kind || 'clase', subjectId: c.subjectId }, state) }}
                      onClick={() => openForm('class', c)}>
                      <span className="entry-time">{timeLabel(c.start, c.end)}</span>
                      <span className="entry-main">
                        <span className="entry-title">{c.title}</span>
                        <span className="entry-meta">
                          <SubjectChip subject={state.subjects.find((s) => s.id === c.subjectId)} />
                          {c.place && <span>{c.place}</span>}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <Empty>Libre</Empty>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
