// Filtro de estudios (Todo / DAW / Marketing / Otros) que aparece arriba en las pantallas.
// Filtra todo lo que se ve: calendario, panel, tareas, horario, notas y medias.
import { useAppState } from '../data/index.js';
import { setFilter, useFilter } from '../data/viewFilter.js';

export default function ProgramFilter() {
  const { programs } = useAppState();
  const filter = useFilter();
  if (!programs.length) return null; // sin estudios creados no hay nada que filtrar

  return (
    <div className="chips filter-bar" role="group" aria-label="Filtrar por estudios">
      <button className={`chip-btn ${filter === 'todo' ? 'on' : ''}`} onClick={() => setFilter('todo')}>Todo</button>
      {programs.map((p) => (
        <button key={p.id} className={`chip-btn prog ${filter === p.id ? 'on' : ''}`} style={{ '--c': p.color }} onClick={() => setFilter(p.id)}>
          <i /> {p.name}
        </button>
      ))}
      <button className={`chip-btn ${filter === 'otros' ? 'on' : ''}`} onClick={() => setFilter('otros')}>Otros</button>
    </div>
  );
}
