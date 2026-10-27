// Formularios del horario semanal (clases / turnos que se repiten) y de eventos sueltos.
import { actions } from '../../data/index.js';
import { WEEKDAYS_SHORT, todayISO } from '../../lib/dates.js';
import { EVENT_KINDS, KINDS, SCHEDULE_KINDS } from '../../lib/kinds.js';
import { DEFAULT_EVENT_REMINDERS } from '../../lib/reminders.js';
import { Field, FormShell, ReminderPicker, Segmented, SubjectSelect, useForm } from './fields.jsx';

const kindOptions = (list) => list.map((k) => ({ value: k, label: KINDS[k].label }));

/** Clase o turno de trabajo que se repite cada semana. */
export function ClassForm({ item, defaults, onClose }) {
  const [f, set, bind] = useForm({
    title: '', kind: 'clase', subjectId: null, weekdays: [], start: '09:00', end: '10:00',
    place: '', from: '', until: '',
    ...defaults, ...item,
  });

  const toggleDay = (i) =>
    set('weekdays')(f.weekdays.includes(i) ? f.weekdays.filter((d) => d !== i) : [...f.weekdays, i].sort());

  const save = () => {
    if (!f.weekdays.length) {
      window.alert('Elige al menos un día de la semana.');
      return false; // no cerrar el formulario
    }
    actions.save('classes', { ...f, title: f.title.trim(), subjectId: f.kind === 'clase' ? f.subjectId : null });
  };

  return (
    <FormShell
      title={item ? 'Editar horario' : 'Nuevo horario semanal'}
      onClose={onClose}
      onSubmit={save}
      onDelete={item && (() => actions.remove('classes', item.id))}
    >
      <Field label="Tipo"><Segmented value={f.kind} onChange={set('kind')} options={kindOptions(SCHEDULE_KINDS)} /></Field>
      <Field label="Nombre">
        <input type="text" required placeholder={f.kind === 'laboral' ? 'Ej: Turno en la tienda' : 'Ej: Bases de Datos'} {...bind('title')} />
      </Field>
      {f.kind === 'clase' && <SubjectSelect value={f.subjectId} onChange={set('subjectId')} />}
      <Field label="Se repite los días">
        <div className="daypick">
          {WEEKDAYS_SHORT.map((d, i) => (
            <button key={d + i} type="button" className={f.weekdays.includes(i) ? 'on' : ''} onClick={() => toggleDay(i)}>{d}</button>
          ))}
        </div>
      </Field>
      <div className="two">
        <Field label="Empieza"><input type="time" required {...bind('start')} /></Field>
        <Field label="Termina"><input type="time" required {...bind('end')} /></Field>
      </div>
      <Field label="Lugar (opcional)"><input type="text" placeholder="Aula, oficina…" {...bind('place')} /></Field>
      <div className="two">
        <Field label="Desde (opcional)" hint="Inicio del cuatrimestre"><input type="date" {...bind('from')} /></Field>
        <Field label="Hasta (opcional)" hint="Fin del cuatrimestre"><input type="date" {...bind('until')} /></Field>
      </div>
    </FormShell>
  );
}

/** Evento suelto (una sola vez): quedada, cita, reunión... */
export function EventForm({ item, defaults, onClose }) {
  const [f, set, bind] = useForm({
    title: '', kind: 'personal', date: todayISO(), start: '', end: '', place: '',
    ...defaults, ...item,
    reminderDays: item ? item.reminderDays ?? [] : DEFAULT_EVENT_REMINDERS,
    reminderTime: item?.reminderTime || '08:00',
  });
  return (
    <FormShell
      title={item ? 'Editar evento' : 'Nuevo evento'}
      onClose={onClose}
      onSubmit={() => actions.save('events', { ...f, title: f.title.trim() })}
      onDelete={item && (() => actions.remove('events', item.id))}
    >
      <Field label="Tipo"><Segmented value={f.kind} onChange={set('kind')} options={kindOptions(EVENT_KINDS)} /></Field>
      <Field label="¿Qué es?"><input type="text" required autoFocus={!item} placeholder="Ej: Reunión con cliente" {...bind('title')} /></Field>
      <Field label="Fecha"><input type="date" required {...bind('date')} /></Field>
      <div className="two">
        <Field label="Empieza"><input type="time" {...bind('start')} /></Field>
        <Field label="Termina"><input type="time" {...bind('end')} /></Field>
      </div>
      <Field label="Lugar (opcional)"><input type="text" {...bind('place')} /></Field>
      <ReminderPicker value={f.reminderDays} onChange={set('reminderDays')} time={f.reminderTime} onTime={set('reminderTime')} />
    </FormShell>
  );
}
