// Calendario con vista mensual, semanal y diaria.
import { addMonths } from 'date-fns';
import { useMemo, useState } from 'react';
import EntryRow from '../components/EntryRow.jsx';
import Icon from '../components/Icon.jsx';
import { Empty } from '../components/bits.jsx';
import { FORM_FOR_COL, useUI } from '../components/ui.js';
import { useAppState, useToday } from '../data/index.js';
import { entriesByDay, entriesOn } from '../lib/agenda.js';
import { WEEKDAYS_3, addDaysISO, fmt, fromISO, monthGrid, timeLabel, toISO, weekDays } from '../lib/dates.js';
import { entryColor, programColor } from '../lib/color.js';
import { filterState } from '../lib/filter.js';

const VIEWS = [
  { value: 'mes', label: 'Mes' },
  { value: 'semana', label: 'Semana' },
  { value: 'dia', label: 'Día' },
  { value: 'agenda', label: 'Lista' },
];
const AGENDA_DAYS = 14;

/**
 * Calendario COMÚN: junta clases, trabajo, exámenes, entregas y eventos de todos tus estudios.
 * No usa el filtro global de arriba; si quieres ver solo un estudio, usa los botones de aquí
 * (siempre arranca en "Todo junto").
 */
export default function CalendarPage() {
  const full = useAppState();
  const today = useToday();
  const { openQuickAdd } = useUI();
  const [scope, setScope] = useState('todo');
  const [view, setView] = useState('mes');
  const [cursor, setCursor] = useState(today); // fecha de referencia de lo que se está viendo
  const [selected, setSelected] = useState(today); // día elegido en la vista mensual

  const scopeValid = scope === 'todo' || scope === 'otros' || full.programs.some((p) => p.id === scope);
  const state = useMemo(() => filterState(full, scopeValid ? scope : 'todo'), [full, scope, scopeValid]);

  const move = (dir) => {
    if (view === 'mes') setCursor(toISO(addMonths(fromISO(cursor), dir)));
    else setCursor(addDaysISO(cursor, dir * (view === 'semana' ? 7 : view === 'agenda' ? AGENDA_DAYS : 1)));
  };
  const goToday = () => { setCursor(today); setSelected(today); };
  const openDay = (iso) => { setCursor(iso); setSelected(iso); setView('dia'); };

  const title =
    view === 'mes' ? fmt(cursor, 'MMMM yyyy')
    : view === 'semana' ? `${fmt(weekDays(cursor)[0], 'd MMM')} – ${fmt(weekDays(cursor)[6], 'd MMM')}`
    : view === 'agenda' ? `${fmt(cursor, 'd MMM')} – ${fmt(addDaysISO(cursor, AGENDA_DAYS - 1), 'd MMM')}`
    : fmt(cursor, "EEEE d 'de' MMMM");

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Calendario</h1>
          <p className="sub">Todo en un mismo sitio: clases, trabajo, exámenes, entregas, pendientes y eventos.</p>
        </div>
      </div>

      {full.programs.length > 0 && (
        <div className="chips filter-bar" role="group" aria-label="Qué estudios mostrar">
          <button className={`chip-btn ${scope === 'todo' ? 'on' : ''}`} onClick={() => setScope('todo')}>Todo junto</button>
          {full.programs.map((p) => (
            <button key={p.id} className={`chip-btn prog ${scope === p.id ? 'on' : ''}`} style={{ '--c': p.color }} onClick={() => setScope(p.id)}>
              <i /> {p.name}
            </button>
          ))}
          <button className={`chip-btn ${scope === 'otros' ? 'on' : ''}`} onClick={() => setScope('otros')}>Otros</button>
        </div>
      )}

      <div className="cal-bar">
        <button className="icon-btn" onClick={() => move(-1)} aria-label="Anterior"><Icon name="left" /></button>
        <button className="icon-btn" onClick={() => move(1)} aria-label="Siguiente"><Icon name="right" /></button>
        <span className="cal-title">{title}</span>
        <button className="btn small" onClick={goToday}>Hoy</button>
        <div className="seg">
          {VIEWS.map((v) => (
            <button key={v.value} className={view === v.value ? 'on' : ''} onClick={() => setView(v.value)}>{v.label}</button>
          ))}
        </div>
      </div>

      <Legend state={full} />

      {view === 'mes' && (
        <MonthView state={state} today={today} cursor={cursor} selected={selected} onSelect={setSelected} onOpenDay={openDay} onAdd={(date) => openQuickAdd({ date })} />
      )}
      {view === 'agenda' && <AgendaList state={state} today={today} from={cursor} />}
      {view === 'semana' && <WeekView state={state} today={today} cursor={cursor} onOpenDay={openDay} />}
      {view === 'dia' && <DayList state={state} today={today} date={cursor} onAdd={(date) => openQuickAdd({ date })} />}
    </>
  );
}

// Cada tipo se distingue por su FORMA (además del color): examen = bloque relleno ★, entrega = borde ☐, pendiente del día a día = borde discontinuo ○, el resto = suave.
const shapeOf = (e) => (e.kind === 'examen' ? 'k-examen' : e.kind === 'entrega' ? 'k-entrega' : e.kind === 'pendiente' ? 'k-pend' : 'k-otro');
const markOf = (e) => (e.kind === 'examen' ? '★ ' : e.kind === 'entrega' ? (e.status === 'entregado' ? '☑ ' : '☐ ') : e.kind === 'pendiente' ? (e.status === 'entregado' ? '✔ ' : '○ ') : '');

function MonthView({ state, today, cursor, selected, onSelect, onOpenDay, onAdd }) {
  const days = monthGrid(cursor);
  const byDay = entriesByDay(state, days, today);
  // En cada casilla del mes, lo importante (exámenes y entregas) va primero: si hay muchas clases no queda escondido en "+N más".
  const rank = (e) => (e.kind === 'examen' || e.kind === 'entrega' ? 0 : e.kind === 'pendiente' ? 1 : 2);
  for (const d of days) byDay[d] = [...byDay[d]].sort((a, b) => rank(a) - rank(b));
  const mark = (e) => markOf(e);
  const month = cursor.slice(0, 7);

  return (
    <>
      <div className="month">
        {WEEKDAYS_3.map((d) => <div key={d} className="month-head">{d}</div>)}
        {days.map((iso) => {
          const entries = byDay[iso];
          const cls = ['day-cell', !iso.startsWith(month) && 'out', iso === today && 'today', iso === selected && 'sel']
            .filter(Boolean).join(' ');
          return (
            <button key={iso} className={cls} onClick={() => (iso === selected ? onOpenDay(iso) : onSelect(iso))} aria-label={fmt(iso, "d 'de' MMMM")}>
              <span className="num">{Number(iso.slice(8))}</span>
              {/* Móvil: puntos de color. Ordenador: etiquetas con el título. */}
              <span className="dots">
                {entries.slice(0, 4).map((e) => <i key={e.key} style={{ '--k': entryColor(e, state) }} />)}
              </span>
              {entries.slice(0, 3).map((e) => (
                <span key={e.key} className={`mini ${shapeOf(e)} ${e.status === 'entregado' ? 'done' : ''}`} style={{ '--k': entryColor(e, state), '--p': programColor(e, state) ?? 'transparent' }}>{mark(e)}{e.title}</span>
              ))}
              {entries.length > 3 && <span className="more">+{entries.length - 3} más</span>}
            </button>
          );
        })}
      </div>

      <div className="section" style={{ marginTop: 20 }}>
        <div className="section-head">
          <h2 style={{ textTransform: 'capitalize' }}>{fmt(selected, "EEEE d 'de' MMMM")}</h2>
          <span className="row">
            <button className="link-btn" onClick={() => onAdd(selected)}>+ Añadir</button>
            <button className="link-btn" onClick={() => onOpenDay(selected)}>Ver día</button>
          </span>
        </div>
        <EntryList entries={entriesOn(state, selected, today)} />
      </div>
    </>
  );
}

function WeekView({ state, today, cursor, onOpenDay }) {
  const days = weekDays(cursor);
  const byDay = entriesByDay(state, days, today);
  return (
    <div className="week">
      {days.map((iso, i) => (
        <section key={iso} className={`week-col ${iso === today ? 'today' : ''}`}>
          <button className="week-head" onClick={() => onOpenDay(iso)} aria-label={fmt(iso, "EEEE d 'de' MMMM")}>
            <span className="wd">{WEEKDAYS_3[i]}</span>
            <span className="num">{Number(iso.slice(8))}</span>
          </button>
          <div className="week-items">
            {byDay[iso].length
              ? byDay[iso].map((e) => <WeekItem key={e.key} entry={e} state={state} />)
              : <span className="small muted">Libre</span>}
          </div>
        </section>
      ))}
    </div>
  );
}

/** Bloque de color de la vista semanal: hora arriba, título debajo (puede ocupar varias líneas). */
function WeekItem({ entry, state }) {
  const { openForm } = useUI();
  const done = entry.status === 'entregado';
  const mark = markOf(entry);
  return (
    <button
      className={`week-item ${shapeOf(entry)} ${done ? 'done' : ''}`}
      style={{ '--k': entryColor(entry, state), '--p': programColor(entry, state) ?? 'transparent' }}
      onClick={() => openForm(FORM_FOR_COL[entry.col], entry.item)}
    >
      <span className="wi-time">{timeLabel(entry.start, entry.end)}</span>
      <span className="wi-title">{mark}{entry.title}</span>
      {entry.place && <span className="wi-place">{entry.place}</span>}
    </button>
  );
}

function DayList({ state, today, date, onAdd }) {
  const entries = entriesOn(state, date, today);
  return (
    <>
      <EntryList entries={entries} />
      <div style={{ marginTop: 14 }}>
        <button className="btn" onClick={() => onAdd(date)}><Icon name="plus" /> Añadir a este día</button>
      </div>
    </>
  );
}

/** Lista cronológica de los próximos días con todo junto (solo se muestran los días con algo). */
function AgendaList({ state, today, from }) {
  const days = Array.from({ length: AGENDA_DAYS }, (_, i) => addDaysISO(from, i));
  const byDay = entriesByDay(state, days, today);
  const withStuff = days.filter((d) => byDay[d].length);
  if (!withStuff.length) return <div className="card"><Empty>No hay nada en estos {AGENDA_DAYS} días.</Empty></div>;
  return (
    <div className="stack">
      {withStuff.map((d) => (
        <section key={d}>
          <p className="small" style={{ fontWeight: 700, textTransform: 'capitalize', margin: '0 0 6px', color: d === today ? 'var(--primary)' : 'var(--muted)' }}>
            {d === today ? 'Hoy · ' : ''}{fmt(d, "EEEE d 'de' MMMM")}
          </p>
          <EntryList entries={byDay[d]} />
        </section>
      ))}
    </div>
  );
}

/** Leyenda: cómo se distingue cada tipo por su forma. */
function Legend({ state }) {
  const byProgram = state.settings?.colorBy === 'estudios';
  return (
    <div className="legend" aria-label="Leyenda">
      <span className="mini k-examen" style={{ '--k': '#9333ea' }}>★ Examen</span>
      <span className="mini k-entrega" style={{ '--k': '#0d9488' }}>☐ Tarea / entrega</span>
      <span className="mini k-pend" style={{ '--k': '#64748b' }}>○ Pendiente</span>
      <span className="mini k-otro" style={{ '--k': '#2563eb' }}>Clases y eventos</span>
      {state.programs.length > 0 && (
        <span className="muted">· {byProgram ? 'el color es el de cada estudio' : 'la franja de color a la derecha marca el estudio'}</span>
      )}
    </div>
  );
}

function EntryList({ entries }) {
  if (!entries.length) return <div className="card"><Empty>Nada este día.</Empty></div>;
  return <div className="entries">{entries.map((e) => <EntryRow key={e.key} entry={e} />)}</div>;
}
