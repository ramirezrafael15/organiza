// Horario desde foto o PDF: Gemini lo lee, tú lo revisas y editas, y solo entonces se añade (nunca borra nada).
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Modal from './Modal.jsx';
import { actions, useAppState } from '../data/index.js';
import { askAI } from '../lib/ai.js';
import { useKeys } from '../lib/keys.js';
import { WEEKDAYS_SHORT } from '../lib/dates.js';
import { planScheduleImport } from '../lib/scheduleImport.js';
import { extractJson, normalizeSchedule, SCHEDULE_PROMPT, SCHEDULE_SYSTEM, toScheduleFile } from '../lib/scheduleAi.js';

const toBase64 = (file) => new Promise((ok, fail) => {
  const r = new FileReader();
  r.onload = () => ok(String(r.result).split(',')[1]);
  r.onerror = fail;
  r.readAsDataURL(file);
});
let uid = 0;

export default function ScheduleImport({ onClose }) {
  const state = useAppState();
  const keys = useKeys();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState(null); // [{k, on, title, subject, weekdays, start, end, place}]
  const [program, setProgram] = useState('');
  const [done, setDone] = useState('');

  const pick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > 14_000_000) { setError('El archivo pesa demasiado (máx. 14 MB).'); return; }
    setBusy(true); setError(''); setRows(null);
    try {
      const out = await askAI({ geminiKey: keys.geminiKey, groqKey: keys.groqKey, system: SCHEDULE_SYSTEM, prompt: SCHEDULE_PROMPT, image: { mimeType: f.type || 'application/pdf', data: await toBase64(f) } });
      const list = normalizeSchedule(extractJson(out));
      if (!list.length) throw new Error('No he encontrado clases en ese archivo. Prueba con una foto más nítida y recta.');
      setRows(list.map((c) => ({ ...c, k: ++uid, on: true })));
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  const upd = (k, patch) => setRows((rs) => rs.map((r) => (r.k === k ? { ...r, ...patch } : r)));
  const toggleDay = (r, d) => upd(r.k, { weekdays: r.weekdays.includes(d) ? r.weekdays.filter((x) => x !== d) : [...r.weekdays, d].sort() });
  const valid = (r) => r.title.trim() && r.weekdays.length && /^\d\d:\d\d$/.test(r.start) && /^\d\d:\d\d$/.test(r.end) && r.end > r.start;

  // Qué pasaría al guardar (sin guardar nada): cuáles ya existen y se omitirían.
  const chosen = (rows ?? []).filter((r) => r.on && valid(r));
  const programName = program ? state.programs.find((p) => p.id === program)?.name : '';
  const plan = chosen.length ? planScheduleImport(state, toScheduleFile(chosen, programName), () => 'tmp') : null;
  const isDup = (r) => planScheduleImport(state, toScheduleFile([r], programName), () => 'tmp').skipped > 0;

  const save = () => {
    const res = actions.importSchedule(toScheduleFile(chosen, programName));
    setDone(`Añadidas ${res.classes.length} clases${res.skipped ? ` (${res.skipped} ya estaban)` : ''}. No se ha borrado nada.`);
    setRows(null);
  };

  const needKey = !keys.geminiKey;

  // Portal: la página tiene una animación con transform que descoloca los elementos fixed.
  return createPortal(
    <Modal title="Horario desde foto o PDF" onClose={onClose}>
      <div className="stack modal-body">
        {done && <p style={{ fontWeight: 600 }}>{done}</p>}

        {!rows && !done && (needKey ? (
          <>
            <p>Para leer fotos y PDF necesitas una clave de Gemini, <b>gratis</b> y sin tarjeta (Groq no lee imágenes):</p>
            <ol className="small" style={{ paddingLeft: 18, margin: 0 }}>
              <li>Entra en <b>aistudio.google.com/apikey</b> con tu cuenta de Google.</li>
              <li>Pulsa <b>Crear clave de API</b> y cópiala.</li>
              <li>Pégala en <b>Ajustes → IA de los apuntes (Gemini)</b> y vuelve aquí.</li>
            </ol>
          </>
        ) : (
          <>
            <p className="muted small" style={{ margin: 0 }}>Sube una foto (recta y nítida) o el PDF de tu horario. Lo leerá la IA y podrás corregirlo antes de guardar. No se borra nada de lo que ya tienes.</p>
            <button className="btn primary" disabled={busy} onClick={() => fileRef.current?.click()}>{busy ? 'Leyendo el horario…' : '📷 Elegir foto o PDF'}</button>
            <input ref={fileRef} type="file" accept="application/pdf,image/*" hidden onChange={pick} />
            <p className="muted small" style={{ margin: 0 }}>En el plan gratuito Google puede usar lo que envíes para mejorar sus modelos: no subas datos personales.</p>
          </>
        ))}
        {error && <p className="ai-error" style={{ whiteSpace: 'pre-wrap' }}>{error}</p>}

        {rows && (
          <>
            <p className="small muted" style={{ margin: 0 }}>Revisa y corrige lo que haga falta. Desmarca lo que no quieras añadir.</p>
            <label className="small muted" style={{ display: 'grid', gap: 4 }}>Estudios de estas asignaturas
              <select value={program} onChange={(e) => setProgram(e.target.value)}>
                <option value="">Sin estudios</option>
                {state.programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            {rows.map((r) => (
              <div key={r.k} className="card stack" style={{ opacity: r.on ? 1 : 0.5, padding: 12 }}>
                <label className="row-gap" style={{ alignItems: 'center' }}>
                  <input type="checkbox" checked={r.on} onChange={(e) => upd(r.k, { on: e.target.checked })} />
                  <input type="text" value={r.title} onChange={(e) => upd(r.k, { title: e.target.value, subject: e.target.value })} style={{ flex: 1 }} aria-label="Asignatura" />
                </label>
                <div className="row-gap" style={{ flexWrap: 'wrap' }}>
                  {WEEKDAYS_SHORT.slice(0, 6).map((l, d) => (
                    <button key={l} type="button" className={`chip-btn${r.weekdays.includes(d) ? ' on' : ''}`} onClick={() => toggleDay(r, d)}>{l}</button>
                  ))}
                </div>
                <div className="row-gap" style={{ flexWrap: 'wrap' }}>
                  <input type="time" value={r.start} onChange={(e) => upd(r.k, { start: e.target.value })} aria-label="Inicio" />
                  <input type="time" value={r.end} onChange={(e) => upd(r.k, { end: e.target.value })} aria-label="Fin" />
                  <input type="text" placeholder="Aula" value={r.place} onChange={(e) => upd(r.k, { place: e.target.value })} style={{ flex: 1, minWidth: 80 }} />
                </div>
                {r.on && !valid(r) && <span className="small" style={{ color: 'var(--danger)' }}>Faltan datos o la hora de fin es anterior al inicio.</span>}
                {r.on && valid(r) && isDup(r) && <span className="small muted">Ya la tienes: se omitirá.</span>}
              </div>
            ))}
            <div className="row-gap" style={{ flexWrap: 'wrap' }}>
              <button className="btn primary" disabled={!plan || !plan.classes.length} onClick={save}>
                {plan ? `Añadir ${plan.classes.length} ${plan.classes.length === 1 ? 'clase' : 'clases'}` : 'Nada que añadir'}
              </button>
              <button className="btn" onClick={() => setRows(null)}>Cancelar</button>
            </div>
          </>
        )}
        {done && <button className="btn" onClick={onClose}>Cerrar</button>}
      </div>
    </Modal>,
    document.body,
  );
}
