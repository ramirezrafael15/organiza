// Formulario de un pendiente del día a día (ir al banco, llamar, comprar...).
import { actions } from '../../data/index.js';
import { todayISO } from '../../lib/dates.js';
import { Field, FormShell, SubjectSelect, useForm } from './fields.jsx';

export default function TodoForm({ item, defaults, onClose }) {
  const [f, set, bind] = useForm({
    title: '', date: todayISO(), time: '', subjectId: null, done: false,
    ...defaults, ...item,
  });
  return (
    <FormShell
      title={item ? 'Editar pendiente' : 'Nuevo pendiente'}
      onClose={onClose}
      onSubmit={() => actions.save('todos', { ...f, title: f.title.trim() })}
      onDelete={item && (() => actions.remove('todos', item.id))}
    >
      <Field label="¿Qué tienes que hacer?">
        <input type="text" required autoFocus={!item} placeholder="Ej: Llamar al banco" {...bind('title')} />
      </Field>
      <div className="two">
        <Field label="Para el día" hint="Vacío = sin fecha"><input type="date" {...bind('date')} /></Field>
        <Field label="Hora (opcional)"><input type="time" {...bind('time')} /></Field>
      </div>
      <SubjectSelect value={f.subjectId} onChange={set('subjectId')} />
      <label className="row" style={{ gap: 8 }}>
        <input type="checkbox" checked={!!f.done} onChange={(e) => set('done')(e.target.checked)} style={{ width: 'auto' }} />
        Hecho
      </label>
    </FormShell>
  );
}
