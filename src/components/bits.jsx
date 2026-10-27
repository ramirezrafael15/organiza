// Piezas pequeñas reutilizables: insignias de urgencia/tipo, asignatura, barra de progreso...
import { useEffect, useState } from 'react';
import { useAppState } from '../data/index.js';
import { KINDS } from '../lib/kinds.js';
import Icon from './Icon.jsx';

export function UrgencyBadge({ urgency }) {
  if (!urgency) return null;
  return (
    <span className="badge" style={{ '--c': urgency.color }} title="Nivel de urgencia">
      {urgency.overdue ? 'Vencido' : urgency.label}
    </span>
  );
}

export function KindBadge({ kind }) {
  const k = KINDS[kind];
  return <span className="badge plain" style={{ '--c': k.color }}>{k.label}</span>;
}

/** Icono + nombre del tipo (Clase, Examen...): refuerza el color para distinguirlos de un vistazo. */
export function KindLabel({ kind, color }) {
  const k = KINDS[kind];
  return (
    <span className="kind-label" style={{ '--c': color ?? k.color }}>
      <Icon name={k.icon} /> {k.label}
    </span>
  );
}

/** Etiqueta del estudio al que pertenece una asignatura (DAW, Marketing...). */
export function ProgramPill({ subject }) {
  const { programs } = useAppState();
  const program = programs.find((p) => p.id === subject?.programId);
  if (!program) return null;
  return <span className="prog-pill" style={{ '--c': program.color }}>{program.name}</span>;
}

export function SubjectChip({ subject }) {
  if (!subject) return null;
  return (
    <span className="subject-chip" style={{ '--c': subject.color }}>
      <i /> {subject.name} <ProgramPill subject={subject} />
    </span>
  );
}

export function Progress({ value = 0, color }) {
  return (
    <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${value}%`, '--c': color }} />
    </div>
  );
}

/**
 * Deslizador de progreso: se mueve con fluidez y solo guarda al soltar
 * (así no se escribe en los datos en cada píxel).
 */
export function ProgressSlider({ value = 0, onCommit, label = 'Progreso' }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  const commit = () => local !== value && onCommit(local);
  return (
    <div className="prog-row">
      <input
        type="range" min="0" max="100" step="5" value={local} aria-label={label}
        onChange={(e) => setLocal(Number(e.target.value))}
        onPointerUp={commit} onKeyUp={commit} onBlur={commit}
      />
      <span className="pct">{local}%</span>
    </div>
  );
}

export const Empty = ({ children }) => <div className="empty">{children}</div>;
