// Nota del bloc: se puede asociar a una asignatura, un examen o una entrega.
import { actions, useAppState } from '../../data/index.js';
import { fmt } from '../../lib/dates.js';
import { Field, FormShell, Segmented, SubjectSelect, useForm } from './fields.jsx';

export default function NoteForm({ item, defaults, onClose }) {
  const { exams, tasks, subjects } = useAppState();
  const [f, set, bind] = useForm({
    title: '', body: '', subjectId: null, linkType: null, linkId: null,
    ...defaults, ...item,
  });

  const examLabel = (x) => `${subjects.find((s) => s.id === x.subjectId)?.name ?? 'Examen'} · ${fmt(x.date, "d MMM")}`;
  const options = f.linkType === 'exam'
    ? exams.map((x) => ({ id: x.id, label: examLabel(x), subjectId: x.subjectId }))
    : f.linkType === 'task'
      ? tasks.map((t) => ({ id: t.id, label: t.title, subjectId: t.subjectId }))
      : [];

  const changeLinkType = (type) => {
    set('linkType')(type);
    set('linkId')(null);
  };
  const pickLink = (id) => {
    set('linkId')(id || null);
    const target = options.find((o) => o.id === id);
    if (target?.subjectId && !f.subjectId) set('subjectId')(target.subjectId); // hereda la asignatura
  };

  const save = () => {
    const title = f.title.trim() || f.body.trim().split('\n')[0].slice(0, 40) || 'Nota sin título';
    actions.save('notes', { ...f, title, linkId: f.linkType ? f.linkId : null });
  };

  return (
    <FormShell
      title={item ? 'Editar nota' : 'Nueva nota'}
      onClose={onClose}
      onSubmit={save}
      onDelete={item && (() => actions.remove('notes', item.id))}
    >
      <Field label="Título"><input type="text" placeholder="Opcional" {...bind('title')} /></Field>
      <Field label="Nota"><textarea autoFocus={!item} placeholder="Escribe aquí…" {...bind('body')} /></Field>
      <SubjectSelect value={f.subjectId} onChange={set('subjectId')} />
      <Field label="Asociar a">
        <Segmented value={f.linkType} onChange={changeLinkType}
          options={[{ value: null, label: 'Nada' }, { value: 'exam', label: 'Examen' }, { value: 'task', label: 'Entrega' }]} />
      </Field>
      {f.linkType && (
        <Field label={f.linkType === 'exam' ? 'Examen' : 'Entrega'}>
          <select value={f.linkId || ''} onChange={(e) => pickLink(e.target.value)}>
            <option value="">{options.length ? 'Elige una…' : 'Aún no hay ninguna'}</option>
            {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </Field>
      )}
    </FormShell>
  );
}
