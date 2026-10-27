import { useAppState } from '../data/index.js';
import { entryColor } from '../lib/color.js';
import { timeLabel } from '../lib/dates.js';
import { KindLabel, ProgramPill, SubjectChip, UrgencyBadge } from './bits.jsx';
import { FORM_FOR_COL, useUI } from './ui.js';

/** Una entrada de la agenda (clase, examen, entrega, evento). Al pulsarla se edita el registro original. */
export default function EntryRow({ entry, compact = false }) {
  const { openForm } = useUI();
  const state = useAppState(); // estado completo (no filtrado) para buscar asignatura y colores
  const subject = state.subjects.find((s) => s.id === entry.subjectId);
  const color = entryColor(entry, state);
  const done = entry.status === 'entregado';

  return (
    <button
      className={`entry ${compact ? 'compact' : ''}`}
      style={{ '--k': color, opacity: done ? 0.6 : 1 }}
      onClick={() => openForm(FORM_FOR_COL[entry.col], entry.item)}
    >
      <span className="entry-time">{timeLabel(entry.start, entry.end)}</span>
      <span className="entry-main">
        <span className="entry-title" style={done ? { textDecoration: 'line-through' } : undefined}>
          {entry.title}
        </span>
        {!compact && (
          <span className="entry-meta">
            <KindLabel kind={entry.kind} color={color} />
            {/* En los exámenes el título ya incluye la asignatura: solo se añade el estudio */}
            {entry.kind === 'examen' ? <ProgramPill subject={subject} /> : <SubjectChip subject={subject} />}
            {entry.place && <span>{entry.place}</span>}
            {entry.kind === 'entrega' && <span>{entry.progress}%</span>}
            {entry.kind === 'examen' && <span>{entry.progress}% preparado</span>}
          </span>
        )}
      </span>
      <UrgencyBadge urgency={entry.urgency} />
    </button>
  );
}
