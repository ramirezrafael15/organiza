// Apuntes: documentos tipo Docs organizados en carpetas, con búsqueda por texto.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Empty, SubjectChip } from '../components/bits.jsx';
import Icon from '../components/Icon.jsx';
import { actions } from '../data/index.js';
import { useViewState } from '../data/viewFilter.js';
import { fmt, toISO } from '../lib/dates.js';
import { linkedLabel, matchNote } from '../lib/search.js';
import { fileToNote, KIND_ICON } from '../lib/noteIO.js';
import { flatTree, folderPath, validParents, withDescendants } from '../lib/folders.js';

const NoteEditor = lazy(() => import('../components/NoteEditor.jsx'));

export default function Notes() {
  const state = useViewState();
  const folders = state.folders ?? [];
  const [query, setQuery] = useState('');
  const [subjectId, setSubjectId] = useState(null);
  const [folder, setFolder] = useState('todas'); // 'todas' | 'sin' | id de carpeta
  const [sort, setSort] = useState('recientes');
  const [editing, setEditing] = useState(null); // nota abierta en el editor ({} = nueva)
  const fileRef = useRef(null);
  const importNote = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try { const n = await fileToNote(f); setEditing({ title: n.title, html: n.html, folderId: current?.id ?? null }); }
    catch (err) { window.alert(err.message || 'No he podido leer ese archivo.'); }
  };

  // Desde el "+" del menú Añadir se abre un apunte nuevo directamente.
  useEffect(() => {
    const go = () => { try { sessionStorage.removeItem('organiza:newnote'); } catch { /* sin almacenamiento */ } setEditing({}); };
    let flagged = false;
    try { flagged = sessionStorage.getItem('organiza:newnote') === '1'; } catch { /* sin almacenamiento */ }
    if (flagged) go();
    window.addEventListener('organiza:newnote', go);
    return () => window.removeEventListener('organiza:newnote', go);
  }, []);

  const [closed, setClosed] = useState(() => { try { return new Set(JSON.parse(localStorage.getItem('seiri:folders-closed') || '[]')); } catch { return new Set(); } });
  const setClosedSaved = (fn) => setClosed((prev) => { const n = fn(new Set(prev)); try { localStorage.setItem('seiri:folders-closed', JSON.stringify([...n])); } catch { /* sin almacenamiento */ } return n; });
  const parentOf = new Map(folders.map((f) => [f.id, f.parentId]));
  const hasKids = new Set(folders.map((f) => f.parentId).filter(Boolean));
  const hidden = (f) => { let p = parentOf.get(f.id); const seen = new Set(); while (p && !seen.has(p)) { if (closed.has(p)) return true; seen.add(p); p = parentOf.get(p); } return false; };
  const tree = flatTree(folders).filter(({ folder: f }) => !hidden(f));
  const scope = folders.some((f) => f.id === folder) ? withDescendants(folders, folder) : null; // la carpeta y sus subcarpetas
  const inFolder = (n) => folder === 'todas' || (folder === 'sin' ? !n.folderId : scope?.has(n.folderId));
  const list = state.notes
    .filter((n) => inFolder(n) && (!subjectId || n.subjectId === subjectId) && matchNote(n, query, state))
    .sort((a, b) => (sort === 'az' ? String(a.title).localeCompare(String(b.title), 'es') : (b.updatedAt ?? 0) - (a.updatedAt ?? 0)));
  const count = (id) => (id === 'sin' ? state.notes.filter((n) => !n.folderId).length : state.notes.filter((n) => withDescendants(folders, id).has(n.folderId)).length);
  const current = folders.find((f) => f.id === folder);

  const newFolder = () => {
    const name = window.prompt('Nombre de la carpeta:');
    if (name?.trim()) { const f = actions.save('folders', { name: name.trim() }); setFolder(f.id); }
  };
  const newSubfolder = () => {
    const name = window.prompt(`Nombre de la subcarpeta dentro de «${current.name}»:`);
    if (name?.trim()) { const f = actions.save('folders', { name: name.trim(), parentId: current.id }); setFolder(f.id); }
  };
  const moveFolder = (parentId) => actions.save('folders', { ...current, parentId: parentId || null });
  const renameFolder = () => {
    const name = window.prompt('Nuevo nombre:', current.name);
    if (name?.trim()) actions.save('folders', { ...current, name: name.trim() });
  };
  const deleteFolder = () => {
    if (window.confirm(`¿Borrar la carpeta «${current.name}»? Los apuntes y subcarpetas no se borran, suben a la carpeta de arriba.`)) { actions.remove('folders', current.id); setFolder('todas'); }
  };
  const open = (n) => setEditing(n ?? { folderId: current?.id ?? null });

  const FolderBtn = ({ id, label, n, depth = 0 }) => {
    const kids = hasKids.has(id); const shut = closed.has(id);
    const select = () => { setFolder(id); if (kids && shut) setClosedSaved((c) => { c.delete(id); return c; }); };
    return (
      <div className="folder-row" style={depth ? { '--depth': depth } : undefined} data-depth={depth || undefined}>
        {kids
          ? <button className="folder-toggle" aria-label={shut ? 'Desplegar' : 'Plegar'} aria-expanded={!shut} onClick={() => setClosedSaved((c) => { c.has(id) ? c.delete(id) : c.add(id); return c; })}>{shut ? '▸' : '▾'}</button>
          : <span className="folder-toggle spacer" />}
        <button className={`folder-btn ${folder === id ? 'on' : ''}`} onClick={select}>
          <span>📁 {label}</span>{n != null && <span className="muted small">{n}</span>}
        </button>
      </div>
    );
  };

  return (
    <>
      <div className="page-head">
        <h1>Apuntes</h1>
        <span className="grow" />
        <button className="btn" onClick={() => fileRef.current?.click()}>📥 Importar</button>
        <input ref={fileRef} type="file" hidden accept=".docx,.md,.markdown,.html,.htm,.txt,text/*" onChange={importNote} />
        <button className="btn primary" onClick={() => open()}><Icon name="plus" /> Apunte</button>
      </div>

      <div className="notes-layout">
        <aside className="folders">
          <FolderBtn id="todas" label="Todas" n={state.notes.length} />
          {tree.map(({ folder: f, depth }) => <FolderBtn key={f.id} id={f.id} label={f.name} n={count(f.id)} depth={depth} />)}
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
            <strong>{current ? folderPath(folders, current.id) : folder === 'sin' ? 'Sin carpeta' : 'Todos los apuntes'}</strong>
            <span className="grow" />
            {current && <>
              <select value={current.parentId || ''} onChange={(e) => moveFolder(e.target.value)} aria-label="Mover a" style={{ width: 'auto', maxWidth: 170 }}>
                <option value="">En la raíz</option>
                {validParents(folders, current.id).map(({ folder: f, depth }) => <option key={f.id} value={f.id}>{'— '.repeat(depth)}{f.name}</option>)}
              </select>
              <button className="link-btn" onClick={newSubfolder}>＋ Subcarpeta</button>
              <button className="link-btn" onClick={renameFolder}>Renombrar</button><button className="link-btn danger" onClick={deleteFolder}>Borrar carpeta</button></>}
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
                      {fo && (folder === 'todas' || fo.id !== folder) && <span>📁 {folderPath(folders, fo.id)}</span>}
                      {link && <span>🔗 {link}</span>}
                      {n.links?.length > 0 && <span>{[...new Set(n.links.map((l) => KIND_ICON[l.kind]))].join(' ')} {n.links.length}</span>}
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
