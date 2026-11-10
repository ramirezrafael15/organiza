// Pendientes del día a día: lo que tienes que hacer hoy y lo que viene, con casilla para marcarlo.
import { useState } from 'react';
import { Empty } from '../components/bits.jsx';
import { burst } from '../components/motion.jsx';
import { pick, SelectBar, SelectButton, useSelect } from '../components/select.jsx';
import { useUI } from '../components/ui.js';
import { actions, useToday } from '../data/index.js';
import { useViewState } from '../data/viewFilter.js';
import { addDaysISO, fmt, relativeLabel } from '../lib/dates.js';

const byWhen = (a, b) => (a.date || '9999').localeCompare(b.date || '9999') || (a.time || '').localeCompare(b.time || '') || (a.createdAt ?? 0) - (b.createdAt ?? 0);

/** Una fila: casilla para marcar + texto (al pulsarlo se edita). */
export function TodoRow({ todo, today, subjects, showDate = false, sel }) {
  const { openForm } = useUI();
  const subject = subjects.find((s) => s.id === todo.subjectId);
  const late = !todo.done && todo.date && todo.date < today;
  return (
    <div className={`todo-row ${todo.done ? 'done' : ''}`} {...(sel ? pick(sel, todo.id) : {})}>
      <button className="todo-check" aria-label={todo.done ? 'Marcar como no hecho' : 'Marcar como hecho'} aria-pressed={!!todo.done} onClick={(e) => { if (!todo.done) burst(e.currentTarget); actions.toggleTodo(todo); }}>
        {todo.done ? '✓' : ''}
      </button>
      <button className="todo-main" onClick={() => openForm('todo', todo)}>
        <span className="todo-title">{todo.title}</span>
        {(todo.time || subject || (showDate && todo.date)) && (
          <span className="todo-meta">
            {todo.time && <span>{todo.time}</span>}
            {showDate && todo.date && <span style={late ? { color: 'var(--u-3)', fontWeight: 700 } : undefined}>{relativeLabel(todo.date, today)}</span>}
            {subject && <span>{subject.name}</span>}
          </span>
        )}
      </button>
    </div>
  );
}

function Group({ title, count, tone, children }) {
  return (
    <section className="section">
      <div className="section-head">
        <h2 style={tone ? { color: tone } : undefined}>{title}</h2>
        <span className="small muted">{count}</span>
      </div>
      <div className="card todo-list">{children}</div>
    </section>
  );
}

export default function Todos() {
  const { todos, subjects } = useViewState();
  const today = useToday();
  const [text, setText] = useState('');
  const [when, setWhen] = useState('hoy'); // hoy | manana | sin
  const [showDone, setShowDone] = useState(false);
  const sel = useSelect();

  const add = (e) => {
    e.preventDefault();
    const title = text.trim();
    if (!title) return;
    const date = when === 'hoy' ? today : when === 'manana' ? addDaysISO(today, 1) : '';
    actions.save('todos', { title, date, time: '', subjectId: null, done: false });
    setText('');
  };

  const open = todos.filter((t) => !t.done);
  const late = open.filter((t) => t.date && t.date < today).sort(byWhen);
  const now = open.filter((t) => t.date === today).sort(byWhen);
  const next = open.filter((t) => t.date && t.date > today).sort(byWhen);
  const noDate = open.filter((t) => !t.date).sort(byWhen);
  const done = todos.filter((t) => t.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));
  const todayAll = todos.filter((t) => t.date === today);
  const todayDone = todayAll.filter((t) => t.done).length;
  const rows = (list, showDate) => list.map((t) => <TodoRow key={t.id} todo={t} today={today} subjects={subjects} showDate={showDate} sel={sel} />);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Pendientes</h1>
          <p className="sub">
            {todayAll.length ? `Hoy llevas ${todayDone} de ${todayAll.length}` : 'Lo que tienes que hacer en el día a día'} · <span style={{ textTransform: 'capitalize' }}>{fmt(today, "EEEE d 'de' MMMM")}</span>
          </p>
        </div>
        <SelectButton sel={sel} />
      </div>

      <form className="card todo-add" onSubmit={add}>
        <div className="row" style={{ gap: 8 }}>
          <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Añade algo que tengas que hacer…" aria-label="Nuevo pendiente" />
          <button className="btn primary" type="submit" disabled={!text.trim()}>Añadir</button>
        </div>
        <div className="chips">
          {[['hoy', 'Hoy'], ['manana', 'Mañana'], ['sin', 'Sin fecha']].map(([v, l]) => (
            <button key={v} type="button" className={`chip-btn ${when === v ? 'on' : ''}`} onClick={() => setWhen(v)}>{l}</button>
          ))}
        </div>
      </form>

      <div className="todo-cols">
      {late.length > 0 && <Group title="Atrasados" count={late.length} tone="var(--u-3)">{rows(late, true)}</Group>}
      <Group title="Hoy" count={now.length}>
        {now.length ? rows(now, false) : <Empty>{todayAll.length ? '¡Todo hecho por hoy! 🎉' : 'No tienes nada para hoy.'}</Empty>}
      </Group>
      {next.length > 0 && <Group title="Próximos" count={next.length}>{rows(next, true)}</Group>}
      {noDate.length > 0 && <Group title="Sin fecha" count={noDate.length}>{rows(noDate, false)}</Group>}
      </div>

      {done.length > 0 && (
        <section className="section">
          <button className="link-btn" onClick={() => setShowDone((v) => !v)}>
            {showDone ? 'Ocultar' : 'Ver'} hechos ({done.length})
          </button>
          {showDone && <div className="card todo-list" style={{ marginTop: 8 }}>{rows(done.slice(0, 30), true)}</div>}
        </section>
      )}
      <SelectBar sel={sel} visibleIds={[...late, ...now, ...next, ...noDate, ...(showDone ? done.slice(0, 30) : [])].map((t) => t.id)} noun="pendientes" onDelete={(ids) => actions.removeMany('todos', ids)} />
    </>
  );
}
