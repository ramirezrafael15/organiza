// Piezas comunes de los formularios.
import { useState } from 'react';
import { actions, useAppState } from '../../data/index.js';
import { PALETTE } from '../../lib/kinds.js';
import { getFilter } from '../../data/viewFilter.js';
import { URGENCY } from '../../lib/urgency.js';
import { REMINDER_CHOICES, reminderChoiceLabel, reminderSummary } from '../../lib/reminders.js';
import Modal from '../Modal.jsx';

/** Marco de todos los formularios: título, botón Guardar y (si se edita) Eliminar. */
export function FormShell({ title, onClose, onSubmit, onDelete, children }) {
  const submit = (e) => {
    e.preventDefault();
    if (onSubmit() !== false) onClose(); // si onSubmit devuelve false, el formulario sigue abierto
  };
  const remove = () => {
    if (window.confirm('¿Eliminar definitivamente?')) {
      onDelete();
      onClose();
    }
  };
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <div className="modal-foot">
          {onDelete && <button type="button" className="btn danger" onClick={remove}>Eliminar</button>}
          <span className="grow" />
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="submit" form="entity-form" className="btn primary">Guardar</button>
        </div>
      }
    >
      <form id="entity-form" className="modal-body" onSubmit={submit}>{children}</form>
    </Modal>
  );
}

export function Field({ label, hint, children }) {
  return (
    <div className="field">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

/** Botones tipo interruptor. options = [{ value, label }] */
export function Segmented({ value, onChange, options }) {
  return (
    <div className="seg" role="group">
      {options.map((o) => (
        <button key={String(o.value)} type="button" className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Urgencia: "Auto" (la calcula la app) o un mínimo manual. */
export function UrgencyPicker({ value, onChange }) {
  return (
    <Field label="Urgencia" hint="Con 'Auto' se calcula sola. Si marcas un nivel, es el mínimo: seguirá subiendo al acercarse la fecha.">
      <div className="seg" role="group">
        <button type="button" className={value == null ? 'on' : ''} onClick={() => onChange(null)}>Auto</button>
        {URGENCY.map((u) => (
          <button key={u.level} type="button" className={`u-opt ${value === u.level ? 'on' : ''}`}
            style={{ '--c': u.color }} onClick={() => onChange(u.level)}>
            {u.label}
          </button>
        ))}
      </div>
    </Field>
  );
}

/** Con cuántos días de antelación quieres que te avise (varios a la vez: 7, 3, 1 y el mismo día). */
export function ReminderPicker({ value, onChange, label = 'Avisarme antes', time, itemTime, onTime }) {
  const days = value ?? [];
  const toggle = (d) => onChange(days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort((a, b) => b - a));
  return (
    <Field label={label} hint={`Avisos: ${reminderSummary(days).toLowerCase()}. Puedes marcar varios.`}>
      <div className="chips">
        {REMINDER_CHOICES.map((d) => (
          <button key={d} type="button" aria-pressed={days.includes(d)} className={`chip-btn ${days.includes(d) ? 'on' : ''}`} onClick={() => toggle(d)}>
            {reminderChoiceLabel(d)}
          </button>
        ))}
      </div>
      {onTime && days.length > 0 && (
        <div className="row" style={{ marginTop: 8 }}>
          <span className="small muted">A las</span>
          <input type="time" required style={{ width: 'auto' }} value={time || itemTime || '08:00'} onChange={(e) => onTime(e.target.value)} />
          <span className="small muted">{time ? 'cada aviso salta a esta hora' : itemTime ? 'la misma hora que la de arriba (cámbiala si quieres otra)' : 'cada aviso salta a esta hora'}</span>
        </div>
      )}
    </Field>
  );
}

/** Fila de colores para elegir uno. */
export function ColorSwatches({ value, onChange }) {
  return (
    <div className="swatches">
      {PALETTE.map((c) => (
        <button key={c} type="button" aria-label={`Color ${c}`} className={`swatch ${value === c ? 'on' : ''}`}
          style={{ '--c': c }} onClick={() => onChange(c)} />
      ))}
    </div>
  );
}

/** Selector de estudios (DAW, Marketing...) con opción de crear uno nuevo sin salir del formulario. */
export function ProgramSelect({ value, onChange, label = 'Estudios', hint = 'Ej: DAW o Marketing. Sirve para filtrar y diferenciar tus asignaturas.' }) {
  const { programs } = useAppState();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const create = () => {
    const clean = name.trim();
    if (!clean) return;
    const program = actions.save('programs', { name: clean, color: PALETTE[(programs.length * 2) % PALETTE.length] });
    onChange(program.id);
    setCreating(false);
    setName('');
  };

  return (
    <Field label={label} hint={hint}>
      <select
        value={creating ? '__new' : value || ''}
        onChange={(e) => (e.target.value === '__new' ? setCreating(true) : (setCreating(false), onChange(e.target.value || null)))}
      >
        <option value="">Sin estudios</option>
        {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        <option value="__new">+ Nuevos estudios…</option>
      </select>
      {creating && (
        <div className="row">
          <input type="text" className="grow" placeholder="Ej: DAW" value={name} autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), create())} />
          <button type="button" className="btn" onClick={create}>Crear</button>
        </div>
      )}
    </Field>
  );
}

/** Selector de asignatura con opción de crear una nueva sin salir del formulario. */
export function SubjectSelect({ value, onChange, label = 'Asignatura', required = false }) {
  const { subjects, programs } = useAppState();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const create = () => {
    const clean = name.trim();
    if (!clean) return;
    const color = PALETTE[subjects.length % PALETTE.length];
    // Si estás viendo un estudio concreto en el filtro, la asignatura nueva se crea dentro de él.
    const filter = getFilter();
    const programId = programs.some((p) => p.id === filter) ? filter : null;
    const subject = actions.save('subjects', { name: clean, color, programId });
    onChange(subject.id);
    setCreating(false);
    setName('');
  };

  const selected = subjects.find((s) => s.id === value);

  return (
    <>
    <Field label={label}>
      <select
        value={creating ? '__new' : value || ''} required={required && !creating}
        onChange={(e) => (e.target.value === '__new' ? setCreating(true) : (setCreating(false), onChange(e.target.value || null)))}
      >
        <option value="">{required ? 'Elige una asignatura' : 'Sin asignatura'}</option>
        {subjects.map((s) => {
          const program = programs.find((p) => p.id === s.programId);
          return <option key={s.id} value={s.id}>{program ? `${s.name} · ${program.name}` : s.name}</option>;
        })}
        <option value="__new">+ Nueva asignatura…</option>
      </select>
      {creating && (
        <div className="row">
          <input type="text" className="grow" placeholder="Nombre de la asignatura" value={name} autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), create())} />
          <button type="button" className="btn" onClick={create}>Crear</button>
        </div>
      )}
    </Field>
    {/* La asignatura aún no tiene estudios (DAW, Marketing...): se asignan aquí, sin salir del formulario. */}
    {selected && !selected.programId && !creating && (
      <ProgramSelect
        value={null}
        label={`Estudios de ${selected.name}`}
        hint="Esta asignatura aún no tiene estudios. Se guarda en la asignatura, no solo en este formulario."
        onChange={(programId) => actions.save('subjects', { id: selected.id, programId })}
      />
    )}
    </>
  );
}

/** Hook para manejar el estado de un formulario: const [f, set] = useForm({...valoresIniciales}) */
export function useForm(initial) {
  const [f, setF] = useState(initial);
  const set = (key) => (value) => setF((prev) => ({ ...prev, [key]: value }));
  const bind = (key) => ({ value: f[key] ?? '', onChange: (e) => set(key)(e.target.value) });
  return [f, set, bind];
}
