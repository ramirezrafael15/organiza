// Apuntes: documentos tipo Docs organizados en carpetas, con búsqueda por texto.
import { lazy, Suspense, useEffect, useState } from 'react';
import { Empty, SubjectChip } from '../components/bits.jsx';
import Icon from '../components/Icon.jsx';
import { actions } from '../data/index.js';
import { useViewState } from '../data/viewFilter.js';
import { fmt, toISO } from '../lib/dates.js';
import { linkedLabel, matchNote } from '../lib/search.js';

const NoteEditor = lazy(() => import('../components/NoteEditor.jsx'));

export default function Notes() {
  const state = useViewState();
  const folders = state.folders ?? [];
  const [query, setQuery] = useState('');
  const [subjectId, setSubjectId] = useState(null);
  const [folder, setFolder] = useState('todas'); // 'todas' | 'sin' | id de carpeta
  const [sort, setSort] = useState('recientes');
  const [editing, setEditing] = useState(null); // nota abierta en el editor ({} = nueva)

  // Desde el "+" del menú Añadir se abre un apunte nuevo directamente.
  useEffect(() => {
    const go = () => { try { sessionStorage.removeItem('organiza:newnote'); } catch { /* sin almacenamiento */ } setEditing({}); };
    let flagged = false;
    try { flagged = sessionStorage.getItem('organiza:newnote') === '1'; } catch { /* sin almacenamiento */ }
    if (flagged) go();
    window.addEventListener('organiza:newnote', go);
    return () => window.removeEventListener('organiza:newnote', go);
  }, []);

  const inFolder = (n) => folder === 'todas' || (folder === 'sin' ? !n.folderId : n.folderId === folder);
  const list = state.notes
    .filter((n) => inFolder(n) && (!subjectId || n.subjectId === subjectId) && matchNote(n, query, state))
    .sort((a, b) => (sort === 'az' ? String(a.title).localeCompare(String(b.title), 'es') : (b.updatedAt ?? 0) - (a.updatedAt ?? 0)));
  const count = (id) => state.notes.filter((n) => (id === 'sin' ? !n.folderId : n.folderId === id)).length;
  const current = folders.find((f) => f.id === folder);

  const newFolder = () => {
    const name = window.prompt('Nombre de la carpeta:');
    if (name?.trim()) { const f = actions.save('folders', { name: name.trim() }); setFolder(f.id); }
  };
  const renameFolder = () => {
    const name = window.prompt('Nuevo nombre:', current.name);
    if (name?.trim()) actions.save('folders', { ...current, name: name.trim() });
  };
  const deleteFolder = () => {
    if (window.confirm(`¿Borrar la carpeta «${current.name}»? Los apuntes no se borran, se quedan sin carpeta.`)) { actions.remove('folders', current.id); setFolder('todas'); }
  };
  const open = (n) => setEditing(n ?? { folderId: current?.id ?? null });

  const FolderBtn = ({ id, label, n }) => (
    <button className={`folder-btn ${folder === id ? 'on' : ''}`} onClick={() => setFolder(id)}>
      <span>📁 {label}</span>{n != null && <span className="muted small">{n}</span>}
    </button>
  );

  return (
    <>
      <div className="page-head">
        <h1>Apuntes</h1>
        <button className="btn primary" onClick={() => open()}><Icon name="plus" /> Apunte</button>
      </div>

      <div className="notes-layout">
        <aside className="folders">
          <FolderBtn id="todas" label="Todas" n={state.notes.length} />
          {folders.map((f) => <FolderBtn key={f.id} id={f.id} label={f.name} n={count(f.id)} />)}
          <FolderBtn id="sin" label="Sin carpeta" n={count('sin')} />
          <button className="folder-btn add" onClick={newFolder}>＋ Nueva carpeta</button>
        </aside>

        <div className="stack notes-main">
          <div className="search">
            <Icon name="search" />
            <input type="search" placeholder="Buscar en los apuntes…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {state.subjects.length > 0 && (
            <div className="chips">
              <button className={`chip-btn ${!subjectId ? 'on' : ''}`} onClick={() => setSubjectId(null)}>Todas las asignaturas</button>
              {state.subjects.map((s) => (
                <button key={s.id} className={`chip-btn ${subjectId === s.id ? 'on' : ''}`} onClick={() => setSubjectId(s.id)}>{s.name}</button>
              ))}
            </div>
          )}
          <div className="notes-bar">
            <strong>{current ? current.name : folder === 'sin' ? 'Sin carpeta' : 'Todos los apuntes'}</strong>
            <span className="grow" />
            {current && <><button className="link-btn" onClick={renameFolder}>Renombrar</button><button className="link-btn danger" onClick={deleteFolder}>Borrar carpeta</button></>}
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Orden" style={{ width: 'auto' }}>
              <option value="recientes">Recientes</option><option value="az">A → Z</option>
            </select>
          </div>

          {list.length ? (
            <div className="notes-grid">
              {list.map((n) => {
                const link = linkedLabel(n, state);
                const fo = folders.find((f) => f.id === n.folderId);
                return (
                  <button key={n.id} className="card note-card" onClick={() => open(n)}>
                    <div className="item-title">{n.title}</div>
                    <div className="note-body">{n.body}</div>
                    <div className="entry-meta">
                      <SubjectChip subject={state.subjects.find((s) => s.id === n.subjectId)} />
                      {fo && folder === 'todas' && <span>📁 {fo.name}</span>}
                      {link && <span>🔗 {link}</span>}
                      {n.updatedAt && <span>{fmt(toISO(new Date(n.updatedAt)), 'd MMM')}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="card">
              <Empty>{query || subjectId ? 'No hay apuntes que coincidan.' : 'Aún no hay apuntes aquí. Pulsa “Apunte” para crear el primero.'}</Empty>
            </div>
          )}
        </div>
      </div>

      {editing && (
        <Suspense fallback={null}>
          <NoteEditor key={editing.id ?? 'new'} note={editing} onClose={() => setEditing(null)} />
        </Suspense>
      )}
    </>
  );
}
