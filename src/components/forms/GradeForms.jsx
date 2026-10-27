// Formularios de calificaciones y de asignaturas.
import { actions } from '../../data/index.js';
import { PALETTE } from '../../lib/kinds.js';
import { ColorSwatches, Field, FormShell, ProgramSelect, SubjectSelect, useForm } from './fields.jsx';

export function GradeForm({ item, defaults, onClose }) {
  const [f, set, bind] = useForm({ subjectId: null, name: '', value: '', weight: 1, ...defaults, ...item });
  return (
    <FormShell
      title={item ? 'Editar nota' : 'Nueva calificación'}
      onClose={onClose}
      onSubmit={() => actions.save('grades', { ...f, name: f.name.trim() || 'Nota', value: Number(f.value), weight: Number(f.weight) || 1 })}
      onDelete={item && (() => actions.remove('grades', item.id))}
    >
      <SubjectSelect value={f.subjectId} onChange={set('subjectId')} required />
      <Field label="Nombre"><input type="text" placeholder="Ej: Parcial 1" {...bind('name')} /></Field>
      <div className="two">
        <Field label="Nota (0–10)">
          <input type="number" required min="0" max="10" step="0.01" inputMode="decimal" {...bind('value')} />
        </Field>
        <Field label="Peso" hint="Ej: 40 si vale el 40 %. Deja 1 si todas valen igual.">
          <input type="number" min="0" step="any" inputMode="decimal" {...bind('weight')} />
        </Field>
      </div>
    </FormShell>
  );
}

export function SubjectForm({ item, defaults, onClose }) {
  const [f, set, bind] = useForm({ name: '', color: PALETTE[0], credits: '', programId: null, ...defaults, ...item });
  return (
    <FormShell
      title={item ? 'Editar asignatura' : 'Nueva asignatura'}
      onClose={onClose}
      onSubmit={() => actions.save('subjects', { ...f, name: f.name.trim(), credits: f.credits === '' ? null : Number(f.credits) })}
      onDelete={item && (() => actions.remove('subjects', item.id))}
    >
      <Field label="Nombre"><input type="text" required autoFocus={!item} {...bind('name')} /></Field>
      <ProgramSelect value={f.programId} onChange={set('programId')} />
      <Field label="Color"><ColorSwatches value={f.color} onChange={set('color')} /></Field>
      <Field label="Créditos (opcional)" hint="Se usan para ponderar la media general.">
        <input type="number" min="0" step="any" inputMode="decimal" {...bind('credits')} />
      </Field>
      {item && <p className="muted small">Al eliminarla se borran también sus calificaciones.</p>}
    </FormShell>
  );
}

/** Estudios: DAW, Marketing... Agrupan asignaturas y permiten filtrar toda la app. */
export function ProgramForm({ item, defaults, onClose }) {
  const [f, set, bind] = useForm({ name: '', color: PALETTE[0], ...defaults, ...item });
  return (
    <FormShell
      title={item ? 'Editar estudios' : 'Nuevos estudios'}
      onClose={onClose}
      onSubmit={() => actions.save('programs', { ...f, name: f.name.trim() })}
      onDelete={item && (() => actions.remove('programs', item.id))}
    >
      <Field label="Nombre"><input type="text" required autoFocus={!item} placeholder="Ej: DAW" {...bind('name')} /></Field>
      <Field label="Color"><ColorSwatches value={f.color} onChange={set('color')} /></Field>
      {item && <p className="muted small">Si los eliminas, sus asignaturas se quedan pero sin estudios.</p>}
    </FormShell>
  );
}
