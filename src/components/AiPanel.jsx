// Panel de IA del editor: elige una acción, mira el resultado y decide si insertarlo.
import { useRef, useState } from 'react';
import { actions, useAppState } from '../data/index.js';
import { askAI } from '../lib/ai.js';
import { SYSTEM, TASKS } from '../lib/gemini.js';
import { cleanAiHtml } from '../lib/sanitize.js';

const fileToBase64 = (file) => new Promise((ok, fail) => {
  const r = new FileReader();
  r.onload = () => ok(String(r.result).split(',')[1]);
  r.onerror = fail;
  r.readAsDataURL(file);
});

export default function AiPanel({ editor, onClose }) {
  const { settings } = useAppState();
  const key = settings.geminiKey;
  const groqKey = settings.groqKey;
  const [newKey, setNewKey] = useState('');
  const [free, setFree] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const [image, setImage] = useState(null); // { mimeType, data, name }
  const fileRef = useRef(null);

  const sel = editor.state.selection;
  const hasSel = !sel.empty;
  const selText = hasSel ? editor.state.doc.textBetween(sel.from, sel.to, '\n') : '';
  const allText = editor.getText({ blockSeparator: '\n' }).trim();
  // Si hay un archivo adjunto, la IA trabaja sobre él (y solo usa el texto de la nota si lo seleccionas).
  const source = hasSel ? selText : image ? '' : allText;

  const run = async (instruction) => {
    if (!source && !image) { setError('Escribe algo en la nota o selecciona un texto primero (o adjunta una foto).'); return; }
    setBusy(true); setError(''); setResult('');
    try {
      const prompt = `${instruction}\n\n${source ? `TEXTO:\n${source}` : 'El contenido está en el archivo adjunto.'}`;
      const out = await askAI({ geminiKey: key, groqKey, system: SYSTEM, prompt, image: image && { mimeType: image.mimeType, data: image.data } });
      setResult(cleanAiHtml(out));
    } catch (e) { setError(e.message); }
    setBusy(false);
  };

  const pickImage = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > 14_000_000) { setError('El archivo pesa demasiado (máx. 14 MB). Prueba a dividir el PDF.'); return; }
    setError('');
    const isText = /^text\//.test(f.type) || /\.(txt|md)$/i.test(f.name);
    if (isText) { setImage({ mimeType: 'text/plain', data: btoa(unescape(encodeURIComponent(await f.text()))), name: f.name }); return; }
    const mimeType = f.type || (/\.pdf$/i.test(f.name) ? 'application/pdf' : 'image/jpeg');
    setImage({ mimeType, data: await fileToBase64(f), name: f.name });
  };

  const replaceSel = () => {
    if (hasSel) editor.chain().focus().insertContentAt({ from: sel.from, to: sel.to }, result).run();
    else editor.chain().focus().setContent(result).run();
    setResult('');
  };
  const insertBelow = () => {
    const at = hasSel ? sel.to : editor.state.doc.content.size;
    editor.chain().focus().insertContentAt(at, result).run();
    setResult('');
  };

  if (!key && !groqKey) {
    return (
      <aside className="ai-panel">
        <div className="ai-head"><b>✨ IA para tus apuntes</b><button className="btn small" onClick={onClose}>Cerrar</button></div>
        <div className="stack">
          <p>Para usar la IA necesitas una clave de Gemini, <b>gratis</b> y sin tarjeta:</p>
          <ol className="small" style={{ paddingLeft: 18, margin: 0 }}>
            <li>Entra en <b>aistudio.google.com/apikey</b> con tu cuenta de Google.</li>
            <li>Pulsa <b>Crear clave de API</b> y cópiala.</li>
            <li>Pégala aquí abajo.</li>
          </ol>
          <input type="password" placeholder="Pega aquí tu clave (AIza…)" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
          <button className="btn primary" disabled={newKey.trim().length < 20} onClick={() => actions.updateSettings({ geminiKey: newKey.trim() })}>Guardar clave</button>
          <p className="muted small">En el plan gratuito Google puede usar lo que envíes para mejorar sus modelos: no mandes datos personales.</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="ai-panel">
      <div className="ai-head"><b>✨ IA para tus apuntes</b><button className="btn small" onClick={onClose}>Cerrar</button></div>
      <p className="small muted" style={{ margin: 0 }}>
        Trabaja sobre: <b>{hasSel ? 'el texto seleccionado' : 'toda la nota'}</b>{image && <> + archivo «{image.name}» <button className="link-btn" onClick={() => setImage(null)}>quitar</button></>}
      </p>
      <div className="ai-actions">
        {Object.entries(TASKS).map(([id, t]) => (
          <button key={id} className="chip-btn" title={t.hint} disabled={busy} onClick={() => run(t.prompt)}>{t.label}</button>
        ))}
        {key && <button className="chip-btn" disabled={busy} onClick={() => fileRef.current?.click()}>📎 PDF o foto → apuntes</button>}
        <input ref={fileRef} type="file" accept="application/pdf,image/*,.txt,.md,text/plain" hidden onChange={pickImage} />
      </div>
      <form className="ai-free" onSubmit={(e) => { e.preventDefault(); if (free.trim()) run(free.trim()); }}>
        <input type="text" placeholder="O pídele otra cosa…" value={free} onChange={(e) => setFree(e.target.value)} />
        <button className="btn primary" disabled={busy || !free.trim()}>Enviar</button>
      </form>
      {image && !result && !busy && <p className="small muted" style={{ margin: 0 }}>Con el archivo adjunto pulsa «Pasar a limpio», «Resumir», «Esquema»… y trabaja sobre él.</p>}
      {busy && <p className="muted">Pensando…</p>}
      {error && <p className="ai-error" style={{ whiteSpace: 'pre-wrap' }}>{error}</p>}
      {result && (
        <div className="stack">
          <div className="ai-result ne-content"><div className="ProseMirror" dangerouslySetInnerHTML={{ __html: result }} /></div>
          <div className="ai-result-actions">
            {hasSel && <button className="btn primary" onClick={replaceSel}>Reemplazar selección</button>}
            <button className={`btn ${hasSel ? '' : 'primary'}`} onClick={insertBelow}>{hasSel ? 'Insertar debajo' : 'Insertar al final'}</button>
            {!hasSel && <button className="btn" onClick={replaceSel}>Reemplazar toda la nota</button>}
            <button className="btn" onClick={() => setResult('')}>Descartar</button>
          </div>
        </div>
      )}
    </aside>
  );
}
