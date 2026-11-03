// Panel de IA del editor: elige una acción, mira el resultado y decide si insertarlo.
import { useRef, useState } from 'react';
import { actions, useAppState } from '../data/index.js';
import { askGemini, SYSTEM, TASKS } from '../lib/gemini.js';
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
  const source = hasSel ? selText : allText;

  const run = async (instruction) => {
    if (!source && !image) { setError('Escribe algo en la nota o selecciona un texto primero (o adjunta una foto).'); return; }
    setBusy(true); setError(''); setResult('');
    try {
      const prompt = `${instruction}\n\n${source ? `TEXTO:\n${source}` : 'El contenido está en la imagen adjunta.'}`;
      const out = await askGemini({ key, system: SYSTEM, prompt, image: image && { mimeType: image.mimeType, data: image.data } });
      setResult(cleanAiHtml(out));
    } catch (e) { setError(e.message); }
    setBusy(false);
  };

  const pickImage = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > 8_000_000) { setError('La foto pesa demasiado (máx. 8 MB).'); return; }
    setImage({ mimeType: f.type || 'image/jpeg', data: await fileToBase64(f), name: f.name });
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

  if (!key) {
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
        Trabaja sobre: <b>{hasSel ? 'el texto seleccionado' : 'toda la nota'}</b>{image && <> + foto «{image.name}» <button className="link-btn" onClick={() => setImage(null)}>quitar</button></>}
      </p>
      <div className="ai-actions">
        {Object.entries(TASKS).map(([id, t]) => (
          <button key={id} className="chip-btn" title={t.hint} disabled={busy} onClick={() => run(t.prompt)}>{t.label}</button>
        ))}
        <button className="chip-btn" disabled={busy} onClick={() => fileRef.current?.click()}>📷 Foto → apuntes</button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickImage} />
      </div>
      <form className="ai-free" onSubmit={(e) => { e.preventDefault(); if (free.trim()) run(free.trim()); }}>
        <input type="text" placeholder="O pídele otra cosa…" value={free} onChange={(e) => setFree(e.target.value)} />
        <button className="btn primary" disabled={busy || !free.trim()}>Enviar</button>
      </form>
      {image && !result && !busy && <p className="small muted" style={{ margin: 0 }}>Con la foto adjunta pulsa «Pasar a limpio» para convertirla en apuntes.</p>}
      {busy && <p className="muted">Pensando…</p>}
      {error && <p className="ai-error">{error}</p>}
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
