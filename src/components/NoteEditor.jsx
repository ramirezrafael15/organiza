// Editor de apuntes tipo Docs: fuentes, tamaños, colores, tablas, imágenes, índice e IA.
// Se guarda solo (sin botón) y el texto va a la nube como cualquier otro dato.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { EditorContent, useEditor } from '@tiptap/react';
import BlockHandle from './BlockHandle.jsx';
import { moveBlock, topBlockAtCursor } from '../lib/blocks/blockOps.js';
import { actions, useAppState } from '../data/index.js';
import { editorExtensions } from '../lib/tiptapExt.js';
import { SubjectSelect } from './forms/fields.jsx';
import AiPanel from './AiPanel.jsx';
import { flatTree } from '../lib/folders.js';
import SymbolPanel from './SymbolPanel.jsx';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Las notas antiguas eran texto plano: se convierten a párrafos la primera vez que se abren.
const initialHtml = (n) => n.html ?? (n.body ? n.body.split('\n').map((l) => `<p>${esc(l)}</p>`).join('') : '');

const FONTS = [['', 'Letra'], ['Georgia, serif', 'Georgia'], ['"Times New Roman", serif', 'Times'], ['Arial, sans-serif', 'Arial'], ['Verdana, sans-serif', 'Verdana'], ['"Courier New", monospace', 'Courier'], ['"Comic Sans MS", cursive', 'Cómic']];
const SIZES = ['', '12px', '14px', '16px', '18px', '22px', '28px', '36px', '48px'];
const MAX_HTML = 850_000; // Firestore admite ~1 MB por documento

// Reduce la foto antes de meterla en el apunte (si no, no cabría en la nube).
function shrinkImage(file, max = 1000) {
  return new Promise((ok, fail) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      ok(c.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = fail;
    img.src = URL.createObjectURL(file);
  });
}

export default function NoteEditor({ note, onClose }) {
  const { folders } = useAppState();
  const idRef = useRef(note.id ?? null);
  const [title, setTitle] = useState(note.title ?? '');
  const [subjectId, setSubjectId] = useState(note.subjectId ?? null);
  const [folderId, setFolderId] = useState(note.folderId ?? null);
  const [status, setStatus] = useState('');
  const [ai, setAi] = useState(false);
  const [sym, setSym] = useState(false);
  const [outline, setOutline] = useState([]);
  const [, bump] = useState(0);
  const dirty = useRef(false);
  const timer = useRef(null);
  const latest = useRef({});
  const imgRef = useRef(null);

  const buildOutline = (ed) => {
    const out = [];
    ed.state.doc.descendants((n, pos) => { if (n.type.name === 'heading') out.push({ pos, level: n.attrs.level, text: n.textContent }); });
    setOutline(out);
  };

  const editor = useEditor({
    extensions: editorExtensions({ onPickImage: () => imgRef.current?.click() }),
    content: initialHtml(note),
    autofocus: !note.id,
    onCreate: ({ editor: ed }) => buildOutline(ed),
    onUpdate: ({ editor: ed }) => { schedule(); buildOutline(ed); },
    onSelectionUpdate: () => bump((x) => x + 1),
  });

  const flush = () => {
    clearTimeout(timer.current);
    if (!dirty.current || !editor) return;
    const text = editor.getText({ blockSeparator: '\n' }).trim();
    const t = latest.current.title.trim();
    if (!idRef.current && !text && !t) { dirty.current = false; return; } // nota vacía: no se guarda
    const html = editor.getHTML();
    if (html.length > MAX_HTML) { setStatus('⚠ Demasiado grande para guardarse: quita alguna imagen'); return; }
    const saved = actions.save('notes', {
      ...(note.id || idRef.current ? { ...note, id: idRef.current ?? note.id } : { linkType: null, linkId: null }),
      title: t || text.split('\n')[0].slice(0, 40) || 'Nota sin título',
      body: text,
      html,
      subjectId: latest.current.subjectId,
      folderId: latest.current.folderId,
    });
    idRef.current = saved.id;
    dirty.current = false;
    setStatus('Guardado');
  };
  latest.current = { title, subjectId, folderId };
  const flushRef = useRef(flush);
  flushRef.current = flush;

  function schedule() {
    dirty.current = true;
    setStatus('Guardando…');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => flushRef.current(), 700);
  }
  useEffect(() => {
    if (title !== (note.title ?? '') || subjectId !== (note.subjectId ?? null) || folderId !== (note.folderId ?? null)) schedule();
  }, [title, subjectId, folderId]); // eslint-disable-line
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
  const c = () => editor.chain().focus();
  const B = ({ on, active, children, label, disabled }) => (
    <button type="button" className={`tb ${active ? 'on' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={on} aria-label={label} title={label} disabled={disabled}>{children}</button>
  );
  const Sep = () => <span className="sep" />;
  const attrs = editor.getAttributes('textStyle');
  const heading = [1, 2, 3].find((l) => editor.isActive('heading', { level: l })) ?? 0;
  const words = editor.getText().trim().split(/\s+/).filter(Boolean).length;
  const inTable = editor.isActive('table');

  const addImage = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const src = await shrinkImage(f);
      if (editor.getHTML().length + src.length > MAX_HTML) { window.alert('La nota ya pesa mucho: no caben más imágenes en este apunte.'); return; }
      c().setImage({ src }).run();
    } catch { window.alert('No he podido leer esa imagen.'); }
  };
  const addLink = () => {
    const prev = editor.getAttributes('link').href ?? 'https://';
    const url = window.prompt('Dirección del enlace (vacío para quitarlo):', prev);
    if (url === null) return;
    if (!url.trim()) c().extendMarkRange('link').unsetLink().run();
    else c().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };
  const goTo = (pos) => {
    editor.chain().focus().setTextSelection(pos + 1).run();
    editor.view.nodeDOM(pos)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  // Portal a <body>: la página tiene una animación con transform y, dentro, el 'fixed' no ocupaba toda la pantalla.
  return createPortal(
    <div className="note-editor">
      <header className="ne-head">
        <button className="btn" onClick={close}>← Notas</button>
        <span className="ne-status small muted">{status}</span>
        <button className="btn" onClick={() => setAi((v) => !v)}>✨ IA</button>
        <button className="btn danger" onClick={remove}>Borrar</button>
      </header>
      <div className="ne-body">
        {outline.length > 0 && (
          <nav className="ne-outline" aria-label="Índice">
            <b className="small muted">Índice</b>
            {outline.map((o, i) => (
              <button key={i} className={`lv${o.level}`} onClick={() => goTo(o.pos)}>{o.text || '(sin título)'}</button>
            ))}
          </nav>
        )}
        <div className="ne-scroll">
          <div className="ne-page">
            <input className="ne-title" placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="ne-meta">
              <SubjectSelect value={subjectId} onChange={setSubjectId} />
              <label className="field"><span>Carpeta</span>
                <select value={folderId || ''} onChange={(e) => setFolderId(e.target.value || null)}>
                  <option value="">Sin carpeta</option>
                  {flatTree(folders).map(({ folder: f, depth }) => <option key={f.id} value={f.id}>{'— '.repeat(depth)}{f.name}</option>)}
                </select>
              </label>
            </div>
            <div className="ne-toolbar" role="toolbar">
              <B label="Deshacer" on={() => c().undo().run()} disabled={!editor.can().undo()}>↶</B>
              <B label="Rehacer" on={() => c().redo().run()} disabled={!editor.can().redo()}>↷</B>
              <Sep />
              <select className="tb-sel" aria-label="Estilo" value={heading} onChange={(e) => { const l = +e.target.value; l ? c().setHeading({ level: l }).run() : c().setParagraph().run(); }}>
                <option value={0}>Texto normal</option><option value={1}>Título 1</option><option value={2}>Título 2</option><option value={3}>Título 3</option>
              </select>
              <select className="tb-sel" aria-label="Fuente" value={attrs.fontFamily ?? ''} onChange={(e) => (e.target.value ? c().setFontFamily(e.target.value).run() : c().unsetFontFamily().run())}>
                {FONTS.map(([v, l]) => <option key={l} value={v}>{l}</option>)}
              </select>
              <select className="tb-sel" aria-label="Tamaño" value={attrs.fontSize ?? ''} onChange={(e) => (e.target.value ? c().setFontSize(e.target.value).run() : c().unsetFontSize().run())}>
                {SIZES.map((s) => <option key={s} value={s}>{s ? s.replace('px', '') : 'Tamaño'}</option>)}
              </select>
              <Sep />
              <B label="Negrita" active={editor.isActive('bold')} on={() => c().toggleBold().run()}><b>N</b></B>
              <B label="Cursiva" active={editor.isActive('italic')} on={() => c().toggleItalic().run()}><i>C</i></B>
              <B label="Subrayado" active={editor.isActive('underline')} on={() => c().toggleUnderline().run()}><u>S</u></B>
              <B label="Tachado" active={editor.isActive('strike')} on={() => c().toggleStrike().run()}><s>T</s></B>
              <label className="tb tb-color" title="Color del texto" style={{ '--c': attrs.color ?? 'currentColor' }}>
                <span>A</span>
                <input type="color" aria-label="Color del texto" value={attrs.color ?? '#000000'} onChange={(e) => c().setColor(e.target.value).run()} />
              </label>
              <label className="tb tb-color tb-hl" title="Resaltado" style={{ '--c': editor.getAttributes('highlight').color ?? '#fde68a' }}>
                <span>▮</span>
                <input type="color" aria-label="Color de resaltado" value={editor.getAttributes('highlight').color ?? '#fde68a'} onChange={(e) => c().setHighlight({ color: e.target.value }).run()} />
              </label>
              <B label="Quitar formato" on={() => c().unsetAllMarks().clearNodes().run()}>Tₓ</B>
              <Sep />
              <B label="Lista" active={editor.isActive('bulletList')} on={() => c().toggleBulletList().run()}>•≡</B>
              <B label="Lista numerada" active={editor.isActive('orderedList')} on={() => c().toggleOrderedList().run()}>1.</B>
              <B label="Checklist" active={editor.isActive('taskList')} on={() => c().toggleTaskList().run()}>☑</B>
              <Sep />
              <B label="Izquierda" active={editor.isActive({ textAlign: 'left' })} on={() => c().setTextAlign('left').run()}>⇤</B>
              <B label="Centrar" active={editor.isActive({ textAlign: 'center' })} on={() => c().setTextAlign('center').run()}>↔</B>
              <B label="Derecha" active={editor.isActive({ textAlign: 'right' })} on={() => c().setTextAlign('right').run()}>⇥</B>
              <B label="Justificar" active={editor.isActive({ textAlign: 'justify' })} on={() => c().setTextAlign('justify').run()}>☰</B>
              <Sep />
              <B label="Enlace" active={editor.isActive('link')} on={addLink}>🔗</B>
              <B label="Imagen" on={() => imgRef.current?.click()}>🖼</B>
              <B label="Tabla" on={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>▦</B>
              <B label="Cita" active={editor.isActive('blockquote')} on={() => c().toggleBlockquote().run()}>❝</B>
              <B label="Código" active={editor.isActive('codeBlock')} on={() => c().toggleCodeBlock().run()}>{'</>'}</B>
              <B label="Línea" on={() => c().setHorizontalRule().run()}>―</B>
              <B label="Subir bloque" on={() => { const t = topBlockAtCursor(editor); if (t) moveBlock(editor, t, -1); }}>⬆</B>
              <B label="Bajar bloque" on={() => { const t = topBlockAtCursor(editor); if (t) moveBlock(editor, t, 1); }}>⬇</B>
              <B label="Símbolos y flechas" active={sym} on={() => setSym((v) => !v)}>→Ω</B>
              <B label="Subíndice" active={editor.isActive('subscript')} on={() => c().toggleSubscript().run()}>x₂</B>
              <B label="Superíndice" active={editor.isActive('superscript')} on={() => c().toggleSuperscript().run()}>x²</B>
              <input ref={imgRef} type="file" accept="image/*" hidden onChange={addImage} />
            </div>
            {sym && <SymbolPanel onPick={(s) => c().insertContent(s).run()} onClose={() => setSym(false)} />}
            {inTable && (
              <div className="ne-toolbar ne-table-bar" role="toolbar" aria-label="Tabla">
                <span className="small muted">Tabla:</span>
                <B label="Fila arriba" on={() => c().addRowBefore().run()}>＋fila ↑</B>
                <B label="Fila abajo" on={() => c().addRowAfter().run()}>＋fila ↓</B>
                <B label="Columna izquierda" on={() => c().addColumnBefore().run()}>＋col ←</B>
                <B label="Columna derecha" on={() => c().addColumnAfter().run()}>＋col →</B>
                <B label="Borrar fila" on={() => c().deleteRow().run()}>−fila</B>
                <B label="Borrar columna" on={() => c().deleteColumn().run()}>−col</B>
                <B label="Borrar tabla" on={() => c().deleteTable().run()}>🗑 tabla</B>
              </div>
            )}
            <div className="ne-content-wrap">
              {/* Asa de bloque: "+", arrastrar y menú (solo con ratón; en móvil se usan los botones ↑↓ de la barra) */}
              <BlockHandle editor={editor} />
              <EditorContent editor={editor} className="ne-content" />
            </div>
            <p className="small muted ne-count">{words} palabras</p>
          </div>
        </div>
        {ai && <AiPanel editor={editor} onClose={() => setAi(false)} />}
      </div>
    </div>,
    document.body,
  );
}
