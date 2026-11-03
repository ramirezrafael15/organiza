// Editor de apuntes tipo Docs: títulos, negrita, listas, checklist, resaltado, citas, etc.
// Se guarda solo (sin botón) y el texto va a la nube como cualquier otro dato.
import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import { actions, useAppState } from '../data/index.js';
import { SubjectSelect } from './forms/fields.jsx';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Las notas antiguas eran texto plano: se convierten a párrafos la primera vez que se abren.
const initialHtml = (n) => n.html ?? (n.body ? n.body.split('\n').map((l) => `<p>${esc(l)}</p>`).join('') : '');

export default function NoteEditor({ note, onClose }) {
  const { subjects } = useAppState();
  const idRef = useRef(note.id ?? null);
  const [title, setTitle] = useState(note.title ?? '');
  const [subjectId, setSubjectId] = useState(note.subjectId ?? null);
  const [status, setStatus] = useState('');
  const dirty = useRef(false);
  const timer = useRef(null);
  const latest = useRef({});

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Highlight.configure({ multicolor: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: 'Empieza a escribir tus apuntes…' }),
    ],
    content: initialHtml(note),
    autofocus: !note.id,
    onUpdate: () => schedule(),
  });

  const flush = () => {
    clearTimeout(timer.current);
    if (!dirty.current || !editor) return;
    const text = editor.getText({ blockSeparator: '\n' }).trim();
    const t = latest.current.title.trim();
    if (!idRef.current && !text && !t) { dirty.current = false; return; } // nota vacía: no se guarda
    const saved = actions.save('notes', {
      ...(note.id || idRef.current ? { ...note, id: idRef.current ?? note.id } : { linkType: null, linkId: null }),
      title: t || text.split('\n')[0].slice(0, 40) || 'Nota sin título',
      body: text,
      html: editor.getHTML(),
      subjectId: latest.current.subjectId,
    });
    idRef.current = saved.id;
    dirty.current = false;
    setStatus('Guardado');
  };
  latest.current = { title, subjectId };
  const flushRef = useRef(flush);
  flushRef.current = flush;

  function schedule() {
    dirty.current = true;
    setStatus('Guardando…');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => flushRef.current(), 700);
  }
  useEffect(() => { if (title !== (note.title ?? '') || subjectId !== (note.subjectId ?? null)) schedule(); }, [title, subjectId]); // eslint-disable-line
  // Al cerrar o salir de la app se guarda lo pendiente.
  useEffect(() => {
    const onHide = () => flushRef.current();
    document.addEventListener('visibilitychange', onHide);
    return () => { document.removeEventListener('visibilitychange', onHide); flushRef.current(); };
  }, []);

  const close = () => { flush(); onClose(); };
  const remove = () => {
    if (!window.confirm('¿Borrar esta nota?')) return;
    dirty.current = false;
    if (idRef.current) actions.remove('notes', idRef.current);
    onClose();
  };

  if (!editor) return null;
  const B = ({ on, active, children, label, disabled }) => (
    <button type="button" className={`tb ${active ? 'on' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={on} aria-label={label} title={label} disabled={disabled}>{children}</button>
  );
  const c = () => editor.chain().focus();
  const words = editor.getText({ blockSeparator: '\n' }).trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="note-editor">
      <header className="ne-head">
        <button className="btn" onClick={close}>← Notas</button>
        <span className="ne-status small muted">{status}</span>
        <button className="btn danger" onClick={remove}>Borrar</button>
      </header>
      <div className="ne-scroll">
        <div className="ne-page">
          <input className="ne-title" placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
          {subjects.length >= 0 && <div className="ne-subject"><SubjectSelect value={subjectId} onChange={setSubjectId} /></div>}
          <div className="ne-toolbar" role="toolbar">
            <B label="Deshacer" on={() => c().undo().run()} disabled={!editor.can().undo()}>↶</B>
            <B label="Rehacer" on={() => c().redo().run()} disabled={!editor.can().redo()}>↷</B>
            <span className="sep" />
            <B label="Título" active={editor.isActive('heading', { level: 1 })} on={() => c().toggleHeading({ level: 1 }).run()}>T1</B>
            <B label="Subtítulo" active={editor.isActive('heading', { level: 2 })} on={() => c().toggleHeading({ level: 2 }).run()}>T2</B>
            <B label="Apartado" active={editor.isActive('heading', { level: 3 })} on={() => c().toggleHeading({ level: 3 }).run()}>T3</B>
            <span className="sep" />
            <B label="Negrita" active={editor.isActive('bold')} on={() => c().toggleBold().run()}><b>N</b></B>
            <B label="Cursiva" active={editor.isActive('italic')} on={() => c().toggleItalic().run()}><i>C</i></B>
            <B label="Subrayado" active={editor.isActive('underline')} on={() => c().toggleUnderline().run()}><u>S</u></B>
            <B label="Tachado" active={editor.isActive('strike')} on={() => c().toggleStrike().run()}><s>T</s></B>
            <B label="Resaltar" active={editor.isActive('highlight')} on={() => c().toggleHighlight().run()}><mark>R</mark></B>
            <span className="sep" />
            <B label="Lista" active={editor.isActive('bulletList')} on={() => c().toggleBulletList().run()}>•≡</B>
            <B label="Lista numerada" active={editor.isActive('orderedList')} on={() => c().toggleOrderedList().run()}>1.</B>
            <B label="Checklist" active={editor.isActive('taskList')} on={() => c().toggleTaskList().run()}>☑</B>
            <B label="Cita" active={editor.isActive('blockquote')} on={() => c().toggleBlockquote().run()}>❝</B>
            <B label="Código" active={editor.isActive('codeBlock')} on={() => c().toggleCodeBlock().run()}>{'</>'}</B>
            <B label="Línea" on={() => c().setHorizontalRule().run()}>―</B>
            <span className="sep" />
            <B label="Izquierda" active={editor.isActive({ textAlign: 'left' })} on={() => c().setTextAlign('left').run()}>⇤</B>
            <B label="Centrar" active={editor.isActive({ textAlign: 'center' })} on={() => c().setTextAlign('center').run()}>↔</B>
          </div>
          <EditorContent editor={editor} className="ne-content" />
          <p className="small muted ne-count">{words} palabras</p>
        </div>
      </div>
    </div>
  );
}
