// Conectar un apunte con Google Docs, Drive y Notion: importar, exportar y enlaces.
import { useRef, useState } from 'react';
import { deliver, docFile, fileToNote, htmlFile, KIND_ICON, makeLink, mdFile } from '../lib/noteIO.js';

export function LinkChips({ links }) {
  return (
    <div className="ne-links" aria-label="Enlaces del apunte">
      {links.map((l) => (
        <a key={l.url} className="chip-btn" href={l.url} target="_blank" rel="noopener noreferrer">{KIND_ICON[l.kind]} {l.label}</a>
      ))}
    </div>
  );
}

export default function ConnectPanel({ editor, title, setTitle, links, setLinks, onClose }) {
  const fileRef = useRef(null);
  const [msg, setMsg] = useState('');
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn, ok) => {
    setBusy(true); setMsg('');
    try { await fn(); if (ok) setMsg(ok); } catch (e) { setMsg(`⚠ ${e.message || 'No se ha podido'}`); }
    setBusy(false);
  };

  const importFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    run(async () => {
      const n = await fileToNote(f);
      const empty = !editor.getText().trim();
      if (empty) editor.commands.setContent(n.html, true);
      else editor.chain().focus().insertContentAt(editor.state.doc.content.size, n.html).run();
      if (!title.trim()) setTitle(n.title);
    }, `Importado «${f.name}»`);
  };

  const html = () => editor.getHTML();
  const exportAs = (kind) => run(async () => {
    const t = title.trim() || 'Apunte';
    const f = kind === 'doc' ? docFile(t, html()) : kind === 'html' ? htmlFile(t, html()) : await mdFile(t, html());
    const r = await deliver(f);
    if (r === 'cancelled') return;
    setMsg(r === 'shared' ? 'Elige Drive, Notion u otra app en el menú.' : `Descargado ${f.name}`);
  });

  const addLink = () => {
    const l = makeLink(url, label);
    if (!l) { setMsg('⚠ Esa dirección no parece un enlace.'); return; }
    if (links.some((x) => x.url === l.url)) { setMsg('Ese enlace ya está.'); return; }
    setLinks([...links, l]); setUrl(''); setLabel(''); setMsg('');
  };

  return (
    <div className="ne-connect card" role="region" aria-label="Docs, Drive y Notion">
      <div className="row">
        <b>Docs · Drive · Notion</b>
        <span className="grow" />
        <button className="link-btn" onClick={onClose}>Cerrar</button>
      </div>

      <div className="stack">
        <div>
          <b className="small">Traer un documento</b>
          <p className="small muted">Desde Docs: Archivo → Descargar → Word (.docx). Desde Notion: ··· → Exportar → Markdown o HTML. Desde Drive: elígelo con el botón (en iPhone sale tu Drive).</p>
          <button className="btn" disabled={busy} onClick={() => fileRef.current?.click()}>📥 Elegir archivo (.docx, .md, .html, .txt)</button>
          <input ref={fileRef} type="file" hidden accept=".docx,.md,.markdown,.html,.htm,.txt,text/*" onChange={importFile} />
        </div>

        <div>
          <b className="small">Llevarlo a otro sitio</b>
          <p className="small muted">En el móvil se abre el menú de compartir (elige Drive o Notion). En el ordenador se descarga el archivo.</p>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button className="btn" disabled={busy} onClick={() => exportAs('doc')}>Docs / Word (.doc)</button>
            <button className="btn" disabled={busy} onClick={() => exportAs('md')}>Notion (.md)</button>
            <button className="btn" disabled={busy} onClick={() => exportAs('html')}>Web (.html)</button>
          </div>
        </div>

        <div>
          <b className="small">Enlaces a Docs, Drive o Notion</b>
          {links.map((l) => (
            <div key={l.url} className="row">
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="grow" style={{ overflowWrap: 'anywhere' }}>{KIND_ICON[l.kind]} {l.label}</a>
              <button className="link-btn danger" onClick={() => setLinks(links.filter((x) => x.url !== l.url))}>Quitar</button>
            </div>
          ))}
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <input type="url" inputMode="url" placeholder="Pega aquí el enlace" value={url} onChange={(e) => setUrl(e.target.value)} style={{ flex: '2 1 180px' }} />
            <input placeholder="Nombre (opcional)" value={label} onChange={(e) => setLabel(e.target.value)} style={{ flex: '1 1 120px' }} />
            <button className="btn primary" onClick={addLink} disabled={!url.trim()}>Añadir</button>
          </div>
        </div>
      </div>
      {msg && <p className="small" role="status">{msg}</p>}
    </div>
  );
}
