// Formulario de trabajos y entregas.
import { actions, useAppState } from '../../data/index.js';
import { addDaysISO, todayISO } from '../../lib/dates.js';
import { TASK_STATUS } from '../../lib/kinds.js';
import { ProgressSlider } from '../bits.jsx';
import { Field, FormShell, ReminderPicker, Segmented, SubjectSelect, UrgencyPicker, useForm } from './fields.jsx';

export default function TaskForm({ item, defaults, onClose }) {
  const { settings } = useAppState();
  const [f, set, bind] = useForm({
    title: '', subjectId: null, due: addDaysISO(todayISO(), 1), time: '',
    status: 'pendiente', progress: 0, urgencyManual: null,
    ...defaults, ...item,
    reminderDays: item?.reminderDays ?? settings.reminderDays,
  });

  const changeStatus = (status) => {
    set('status')(status);
    if (status === 'entregado') set('progress')(100);
  };

  return (
    <FormShell
      title={item ? 'Editar entrega' : 'Nueva entrega'}
      onClose={onClose}
      onSubmit={() => actions.save('tasks', { ...f, title: f.title.trim() })}
      onDelete={item && (() => actions.remove('tasks', item.id))}
    >
      <Field label="¿Qué hay que entregar?">
        <input type="text" required autoFocus={!item} placeholder="Ej: Práctica 2 de Bases de Datos" {...bind('title')} />
      </Field>
      <SubjectSelect value={f.subjectId} onChange={set('subjectId')} />
      <div className="two">
        <Field label="Fecha límite"><input type="date" required {...bind('due')} /></Field>
        <Field label="Hora (opcional)"><input type="time" {...bind('time')} /></Field>
      </div>
      <Field label="Estado">
        <Segmented value={f.status} onChange={changeStatus}
          options={Object.entries(TASK_STATUS).map(([value, label]) => ({ value, label }))} />
      </Field>
      <Field label="Progreso">
        <ProgressSlider value={f.progress} onCommit={set('progress')} />
      </Field>
      <ReminderPicker value={f.reminderDays} onChange={set('reminderDays')} time={f.reminderTime} onTime={set('reminderTime')} />
      <UrgencyPicker value={f.urgencyManual} onChange={set('urgencyManual')} />
    </FormShell>
  );
}
