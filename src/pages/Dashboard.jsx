// Panel de inicio: lo de hoy, lo de esta semana, lo urgente y los próximos exámenes.
import EntryRow from '../components/EntryRow.jsx';
import { Empty, ProgramPill, Progress, UrgencyBadge } from '../components/bits.jsx';
import { useUI } from '../components/ui.js';
import { actions, useAppState, useToday } from '../data/index.js';
import { useViewState } from '../data/viewFilter.js';
import { buildDemoState } from '../data/demo.js';
import { entriesOn, upcomingExams, urgentItems } from '../lib/agenda.js';
import { addDaysISO, countdownLabel, daysUntil, fmt, relativeLabel } from '../lib/dates.js';
import { entryColor } from '../lib/color.js';
import { KINDS } from '../lib/kinds.js';
import { getUrgency } from '../lib/urgency.js';
import { activeReminders } from '../lib/reminders.js';
import { FORM_FOR_COL } from '../components/ui.js';

const Section = ({ title, action, children }) => (
  <section className="section">
    <div className="section-head">
      <h2>{title}</h2>
      {action}
    </div>
    {children}
  </section>
);

export default function Dashboard() {
  const full = useAppState();
  const state = useViewState(); // lo que se ve depende del filtro de estudios
  const today = useToday();
  const { openForm, openQuickAdd, navigate } = useUI();

  const isEmpty = !full.subjects.length && !full.exams.length && !full.tasks.length && !full.classes.length && !full.events.length;
  if (isEmpty) {
    return (
      <>
        <div className="page-head"><h1>Panel</h1></div>
        <div className="card empty">
          <h2 style={{ color: 'var(--text)' }}>¡Empecemos! 👋</h2>
          <p>Añade tu horario, tus exámenes y entregas, y aquí verás todo de un vistazo.</p>
          <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
            <button className="btn primary" onClick={() => openQuickAdd()}>Añadir lo primero</button>
            <button className="btn" onClick={() => actions.replaceAll(buildDemoState())}>Cargar datos de ejemplo</button>
          </div>
        </div>
      </>
    );
  }

  const todayEntries = entriesOn(state, today, today);
  // Próximos 6 días (sin contar hoy), agrupados por día. Aquí solo van los "hitos"
  // (exámenes, entregas y eventos sueltos); las clases que se repiten ya están en el Horario.
  const week = Array.from({ length: 6 }, (_, i) => addDaysISO(today, i + 1))
    .map((d) => ({ date: d, entries: entriesOn(state, d, today).filter((e) => e.col !== 'classes') }))
    .filter((d) => d.entries.length);
  const urgent = urgentItems(state, today);
  const reminders = activeReminders(state, today);
  const exams = upcomingExams(state, today).slice(0, 3);
  const subjectOf = (id) => state.subjects.find((s) => s.id === id);

  const pendingTasks = state.tasks.filter((t) => t.status !== 'entregado').length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Hola 👋</h1>
          <p className="sub" style={{ textTransform: 'capitalize' }}>{fmt(today, "EEEE, d 'de' MMMM")}</p>
        </div>
      </div>

      <div className="stats">
        <div className="card stat"><b>{todayEntries.length}</b><span>hoy</span></div>
        <div className="card stat"><b style={{ color: urgent.length ? 'var(--u-3)' : undefined }}>{urgent.length}</b><span>urgentes</span></div>
        <div className="card stat"><b>{pendingTasks}</b><span>entregas pendientes</span></div>
      </div>

      {reminders.length > 0 && (
        <Section title="Avisos" action={<span className="small muted">{reminders.filter((r) => r.isNew).length ? 'Hay avisos nuevos hoy' : 'En curso'}</span>}>
          <div className="entries">
            {reminders.slice(0, 6).map((r) => (
              <button key={r.key} className="entry" style={{ '--k': entryColor({ kind: r.kind === 'evento' ? 'personal' : r.kind, subjectId: r.subjectId }, full) }}
                onClick={() => openForm(FORM_FOR_COL[r.col], r.item)}>
                <span className="entry-time">{countdownLabel(r.date, today)}</span>
                <span className="entry-main">
                  <span className="entry-title">{r.message}</span>
                  <span className="entry-meta">
                    <ProgramPill subject={subjectOf(r.subjectId)} />
                    {r.hint && <span>{r.hint}</span>}
                  </span>
                </span>
                {r.isNew && <span className="badge plain" style={{ '--c': 'var(--primary)' }}>Aviso de hoy</span>}
              </button>
            ))}
          </div>
          {reminders.length > 6 && <p className="small muted" style={{ margin: '6px 0 0' }}>y {reminders.length - 6} más en camino</p>}
        </Section>
      )}

      <div className="grid-2">
        <div>
          <Section title="Hoy" action={<button className="link-btn" onClick={() => navigate('calendario')}>Calendario</button>}>
            {todayEntries.length ? (
              <div className="entries">{todayEntries.map((e) => <EntryRow key={e.key} entry={e} />)}</div>
            ) : (
              <div className="card"><Empty>Hoy no tienes nada. Buen momento para adelantar trabajo.</Empty></div>
            )}
          </Section>

          <Section title="Esta semana">
            {week.length ? (
              <div className="stack">
                {week.map(({ date, entries }) => (
                  <div key={date}>
                    <p className="small muted" style={{ fontWeight: 700, textTransform: 'capitalize', margin: '0 0 6px' }}>
                      {relativeLabel(date, today) === 'Mañana' ? 'Mañana' : fmt(date, 'EEEE d')}
                    </p>
                    <div className="entries">{entries.map((e) => <EntryRow key={e.key} entry={e} compact />)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card"><Empty>Sin exámenes, entregas ni eventos en los próximos días.</Empty></div>
            )}
          </Section>
        </div>

        <div>
          <Section title="Urgente">
            {urgent.length ? (
              <div className="entries">
                {urgent.map(({ kind, col, item, date, urgency }) => {
                  const subject = subjectOf(item.subjectId);
                  const title = kind === 'examen' ? `Examen de ${subject?.name ?? ''}`.trim() : item.title;
                  return (
                    <button key={item.id} className="entry" style={{ '--k': entryColor({ kind, subjectId: item.subjectId }, full) }}
                      onClick={() => openForm(col === 'exams' ? 'exam' : 'task', item)}>
                      <span className="entry-time">{urgency.overdue ? 'Vencido' : countdownLabel(date, today)}</span>
                      <span className="entry-main">
                        <span className="entry-title">{title}</span>
                        <span className="entry-meta">
                          <span>{KINDS[kind].label} · {fmt(date, 'd MMM')}</span>
                          <ProgramPill subject={subject} />
                          <span>{item.progress ?? 0}%</span>
                        </span>
                      </span>
                      <UrgencyBadge urgency={urgency} />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="card"><Empty>Todo bajo control ✅</Empty></div>
            )}
          </Section>

          <Section title="Próximos exámenes" action={<button className="link-btn" onClick={() => navigate('tareas')}>Ver todos</button>}>
            {exams.length ? (
              <div className="stack">
                {exams.map((x) => {
                  const u = getUrgency(x, 'exam', today);
                  return (
                    <button key={x.id} className="card item-card" style={{ '--c': u?.color ?? 'var(--k-examen)', textAlign: 'left' }}
                      onClick={() => openForm('exam', x)}>
                      <div className="item-top">
                        <div className="countdown">
                          <b>{daysUntil(x.date, today)}</b>
                          <span>{daysUntil(x.date, today) === 1 ? 'día' : 'días'}</span>
                        </div>
                        <div className="grow">
                          <div className="item-title">{subjectOf(x.subjectId)?.name ?? 'Examen'} <ProgramPill subject={subjectOf(x.subjectId)} /></div>
                          <div className="small muted">{fmt(x.date, "EEE d MMM")}{x.time ? ` · ${x.time}` : ''}</div>
                        </div>
                        <UrgencyBadge urgency={u} />
                      </div>
                      <div className="prog-row">
                        <div className="grow"><Progress value={x.progress ?? 0} color={u?.color} /></div>
                        <span className="pct">{x.progress ?? 0}% preparado</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="card">
                <Empty>
                  No tienes exámenes próximos.
                  <br /><button className="btn small" onClick={() => openForm('exam')}>Añadir examen</button>
                </Empty>
              </div>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}
