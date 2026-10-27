// Formulario de exámenes.
import { actions, useAppState } from '../../data/index.js';
import { addDaysISO, todayISO } from '../../lib/dates.js';
import { ProgressSlider } from '../bits.jsx';
import { Field, FormShell, ReminderPicker, SubjectSelect, UrgencyPicker, useForm } from './fields.jsx';

export default function ExamForm({ item, defaults, onClose }) {
  const { settings } = useAppState();
  const [f, set, bind] = useForm({
    subjectId: null, date: addDaysISO(todayISO(), 7), time: '', topics: '',
    expectedGrade: '', progress: 0, urgencyManual: null,
    ...defaults, ...item,
    // Los avisos de un examen antiguo sin lista usan los de Ajustes.
    reminderDays: item?.reminderDays ?? settings.reminderDays,
    reminderTime: item?.reminderTime || '08:00',
  });

  const save = () =>
    actions.save('exams', {
      ...f,
      expectedGrade: f.expectedGrade === '' || f.expectedGrade == null ? null : Number(f.expectedGrade),
    });

  return (
    <FormShell
      title={item ? 'Editar examen' : 'Nuevo examen'}
      onClose={onClose}
      onSubmit={save}
      onDelete={item && (() => actions.remove('exams', item.id))}
    >
      <SubjectSelect value={f.subjectId} onChange={set('subjectId')} required />
      <div className="two">
        <Field label="Fecha"><input type="date" required {...bind('date')} /></Field>
        <Field label="Hora"><input type="time" {...bind('time')} /></Field>
      </div>
      <Field label="Temario">
        <textarea placeholder="Temas que entran (uno por línea o separados por comas)" {...bind('topics')} />
      </Field>
      <div className="two">
        <Field label="Nota esperada">
          <input type="number" min="0" max="10" step="0.1" inputMode="decimal" placeholder="0 – 10" {...bind('expectedGrade')} />
        </Field>
      </div>
      <Field label="¿Cuánto llevas preparado?">
        <ProgressSlider value={f.progress} onCommit={set('progress')} label="Preparación" />
      </Field>
      <ReminderPicker value={f.reminderDays} onChange={set('reminderDays')} time={f.reminderTime} onTime={set('reminderTime')} />
      <UrgencyPicker value={f.urgencyManual} onChange={set('urgencyManual')} />
    </FormShell>
  );
}
