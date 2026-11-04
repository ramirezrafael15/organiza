// Plan de estudio de un examen: qué vas a hacer cada día hasta la fecha.
// Cada tarea es un pendiente (con el examen enlazado), así que sale también en Pendientes, Panel y Calendario.
import { useState } from 'react';
import { actions, useAppState, useToday } from '../data/index.js';
import { addDaysISO, countdownLabel, daysUntil, fmt, relativeLabel } from '../lib/dates.js';
import { distribute, parseTopics, planOf, planProgress, studyDays } from '../lib/studyPlan.js';
import { Progress } from './bits.jsx';

export default function StudyPlan({ exam, onClose }) {
  const { todos, subjects } = useAppState();
  const today = useToday();
  const subject = subjects.find((s) => s.id === exam.subjectId);
  const plan = planOf(todos, exam.id);
  const { done, total, pct } = planProgress(todos, exam.id);
  const days = studyDays(today, exam.date);
  const [topics, setTopics] = useState(exam.topics ?? '');
  const [reviewLast, setReviewLast] = useState(true);
  const [adding, setAdding] = useState(null); // día con el cuadro de añadir abierto
  const [text, setText] = useState('');

  const overdue = plan.filter((t) => !t.done && t.date < today);
  const byDate = (d) => plan.filter((t) => t.date === d).sort((a, b) => (a.time || '').localeCompare(b.time || '') || (a.createdAt ?? 0) - (b.createdAt ?? 0));
  const examDay = exam.date >= today ? exam.date : null;
  const list = examDay ? [...days, examDay] : [];

  const add = (date, title) => actions.save('todos', { title, date, time: '', subjectId: exam.subjectId ?? null, examId: exam.id, done: false });
  const submit = (e, date) => {
    e.preventDefault();
    if (text.trim()) add(date, text.trim());
    setText('');
  };
  const spread = () => {
    const items = parseTopics(topics);
    if (!items.length || !days.length) return;
    if (plan.length && !window.confirm(`Ya tienes ${plan.length} tareas en el plan. ¿Añadir estas también?`)) return;
    distribute(items, days, { reviewLast }).forEach((p) => add(p.date, p.title));
    if (topics !== (exam.topics ?? '')) actions.save('exams', { id: exam.id, topics });
  };
  const moveOverdue = () => overdue.forEach((t) => actions.save('todos', { ...t, date: today }));
  const clearPlan = () => {
    if (window.confirm('¿Borrar todas las tareas de este plan?')) plan.forEach((t) => actions.remove('todos', t.id));
  };

  return (
    <div className="note-editor">
      <header className="ne-head">
        <button className="btn" onClick={onClose}>← Volver</button>
        <span className="ne-status small muted" />
        {plan.length > 0 && <button className="btn danger" onClick={clearPlan}>Borrar plan</button>}
      </header>
      <div className="ne-scroll">
        <div className="ne-page stack">
          <div>
            <h1 style={{ margin: 0 }}>Plan de estudio</h1>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              {subject?.name ?? 'Examen'} · {fmt(exam.date, 'EEEE d MMM')} · {countdownLabel(exam.date, today)}
            </p>
          </div>

          <section className="card stack">
            <div className="small muted">{total ? `${done} de ${total} tareas hechas · preparación ${pct} %` : 'Aún no hay tareas en el plan.'}</div>
            {total > 0 && <Progress value={pct} />}
          </section>

          {days.length > 0 ? (
            <section className="card stack">
              <h2 style={{ margin: 0 }}>Repartir los temas solos</h2>
              <textarea rows={4} placeholder="Temas del examen (uno por línea o separados por comas)" value={topics} onChange={(e) => setTopics(e.target.value)} />
              <label className="check-row"><input type="checkbox" checked={reviewLast} onChange={(e) => setReviewLast(e.target.checked)} /> Dejar el último día para repasar</label>
              <button className="btn primary" disabled={!parseTopics(topics).length} onClick={spread}>
                Repartir en {days.length} {days.length === 1 ? 'día' : 'días'}
              </button>
              <p className="small muted" style={{ margin: 0 }}>Luego puedes cambiar, borrar o añadir lo que quieras en cada día.</p>
            </section>
          ) : (
            <section className="card"><p style={{ margin: 0 }}>{exam.date <= today ? 'Este examen es hoy o ya pasó: no quedan días para planificar.' : ''}</p></section>
          )}

          {overdue.length > 0 && (
            <section className="card stack" style={{ borderColor: 'var(--u-3)' }}>
              <h2 style={{ margin: 0, color: 'var(--u-3)' }}>Atrasado ({overdue.length})</h2>
              {overdue.map((t) => <Row key={t.id} todo={t} />)}
              <button className="btn" onClick={moveOverdue}>Pasar todo a hoy</button>
            </section>
          )}

          {list.map((d) => {
            const items = byDate(d);
            const isExam = d === exam.date;
            return (
              <section key={d} className="plan-day">
                <div className="plan-day-head">
                  <b>{relativeLabel(d, today)}</b>
                  <span className="small muted">{fmt(d, 'EEEE d MMM')}</span>
                  {!isExam && <button className="link-btn" style={{ marginLeft: 'auto' }} onClick={() => { setAdding(adding === d ? null : d); setText(''); }}>＋ Añadir</button>}
                </div>
                {isExam && <div className="plan-exam">🎯 Examen de {subject?.name ?? 'la asignatura'}{exam.time ? ` · ${exam.time}` : ''}</div>}
                {items.map((t) => <Row key={t.id} todo={t} />)}
                {adding === d && (
                  <form className="ai-free" onSubmit={(e) => submit(e, d)}>
                    <input autoFocus type="text" placeholder="¿Qué vas a hacer este día?" value={text} onChange={(e) => setText(e.target.value)} />
                    <button className="btn primary" disabled={!text.trim()}>Añadir</button>
                  </form>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Row({ todo }) {
  return (
    <div className={`todo-row ${todo.done ? 'done' : ''}`}>
      <button className="todo-check" aria-label="Marcar como hecho" aria-pressed={!!todo.done} onClick={() => actions.toggleTodo(todo)}>{todo.done ? '✓' : ''}</button>
      <span className="todo-main"><span className="todo-title">{todo.title}</span></span>
      <button className="link-btn" aria-label="Borrar tarea" onClick={() => actions.remove('todos', todo.id)}>✕</button>
    </div>
  );
}
