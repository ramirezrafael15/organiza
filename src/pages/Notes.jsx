// Bloc de notas: notas rápidas asociables a asignatura, examen o entrega, con búsqueda por texto.
import { useState } from 'react';
import { Empty, SubjectChip } from '../components/bits.jsx';
import Icon from '../components/Icon.jsx';
import { useUI } from '../components/ui.js';
import { useViewState } from '../data/viewFilter.js';
import { fmt, toISO } from '../lib/dates.js';
import { linkedLabel, matchNote } from '../lib/search.js';

export default function Notes() {
  const state = useViewState();
  const { openForm } = useUI();
  const [query, setQuery] = useState('');
  const [subjectId, setSubjectId] = useState(null);

  const list = state.notes
    .filter((n) => (!subjectId || n.subjectId === subjectId) && matchNote(n, query, state))
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

  return (
    <>
      <div className="page-head">
        <h1>Bloc de notas</h1>
        <button className="btn primary" onClick={() => openForm('note')}><Icon name="plus" /> Nota</button>
      </div>

      <div className="stack" style={{ marginBottom: 14 }}>
        <div className="search">
          <Icon name="search" />
          <input type="search" placeholder="Buscar en las notas…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {state.subjects.length > 0 && (
          <div className="chips">
            <button className={`chip-btn ${!subjectId ? 'on' : ''}`} onClick={() => setSubjectId(null)}>Todas</button>
            {state.subjects.map((s) => (
              <button key={s.id} className={`chip-btn ${subjectId === s.id ? 'on' : ''}`} onClick={() => setSubjectId(s.id)}>{s.name}</button>
            ))}
          </div>
        )}
      </div>

      {list.length ? (
        <div className="notes-grid">
          {list.map((n) => {
            const link = linkedLabel(n, state);
            return (
              <button key={n.id} className="card note-card" onClick={() => openForm('note', n)}>
                <div className="item-title">{n.title}</div>
                <div className="note-body">{n.body}</div>
                <div className="entry-meta">
                  <SubjectChip subject={state.subjects.find((s) => s.id === n.subjectId)} />
                  {link && <span>🔗 {link}</span>}
                  {n.updatedAt && <span>{fmt(toISO(new Date(n.updatedAt)), 'd MMM')}</span>}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <Empty>{query || subjectId ? 'No hay notas que coincidan.' : 'Aún no tienes notas. Pulsa “Nota” para crear la primera.'}</Empty>
        </div>
      )}
    </>
  );
}
