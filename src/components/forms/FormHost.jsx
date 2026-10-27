// Muestra el formulario que toque según lo que pida la interfaz (ver ui.js).
import Icon from '../Icon.jsx';
import Modal from '../Modal.jsx';
import ExamForm from './ExamForm.jsx';
import { GradeForm, ProgramForm, SubjectForm } from './GradeForms.jsx';
import NoteForm from './NoteForm.jsx';
import { ClassForm, EventForm } from './ScheduleForms.jsx';
import TaskForm from './TaskForm.jsx';

const FORMS = {
  exam: ExamForm,
  task: TaskForm,
  class: ClassForm,
  event: EventForm,
  note: NoteForm,
  grade: GradeForm,
  subject: SubjectForm,
  program: ProgramForm,
};

// Opciones del botón "+" (añadir en pocos toques).
const QUICK = [
  { form: 'exam', label: 'Examen', icon: 'exam', color: 'var(--k-examen)' },
  { form: 'task', label: 'Entrega', icon: 'flag', color: 'var(--k-entrega)' },
  { form: 'class', label: 'Horario semanal', icon: 'clock', color: 'var(--k-clase)' },
  { form: 'event', label: 'Evento', icon: 'calendar', color: 'var(--k-personal)' },
  { form: 'note', label: 'Nota rápida', icon: 'note', color: 'var(--k-laboral)' },
];

// El calendario pasa { date }; cada formulario lo usa con su propio nombre de campo.
const defaultsFor = (form, d = {}) =>
  !d.date ? {} : form === 'task' ? { due: d.date } : form === 'exam' || form === 'event' ? { date: d.date } : {};

export function QuickAdd({ defaults, onPick, onClose }) {
  return (
    <Modal title="Añadir" onClose={onClose}>
      <div className="modal-body" style={{ paddingBottom: 22 }}>
        <div className="quick-grid">
          {QUICK.map((q) => (
            <button key={q.form} style={{ '--c': q.color }} onClick={() => onPick(q.form, defaultsFor(q.form, defaults))}>
              <Icon name={q.icon} /> {q.label}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

export default function FormHost({ form, onClose }) {
  const Form = FORMS[form.kind];
  return <Form item={form.item} defaults={form.defaults} onClose={onClose} />;
}
