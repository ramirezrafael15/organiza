// Ajustes: clave gratuita de Gemini para la IA de los apuntes.
import { useState } from 'react';
import { setKey, useKeys } from '../lib/keys.js';
import { askGemini, diagnose } from '../lib/gemini.js';
import { askGroq } from '../lib/groq.js';

export default function AiCard() {
  const settings = useKeys();
  const [key, setKey] = useState('');
  const [msg, setMsg] = useState('');
  const has = !!settings.geminiKey;
  const [diag, setDiag] = useState(null);
  const [gkey, setGkey] = useState('');
  const hasGroq = !!settings.groqKey;
  const testGroq = async () => {
    setMsg('Probando Groq…');
    try { await askGroq({ key: settings.groqKey, prompt: 'Responde solo con la palabra OK.' }); setMsg('✔ Groq funciona.'); }
    catch (e) { setMsg(e.message); }
  };

  const runDiag = async () => {
    setMsg('Probando cada modelo (puede tardar unos segundos)…'); setDiag(null);
    try { const d = await diagnose(settings.geminiKey); setDiag(d); setMsg(d.results.some((r) => r.ok) ? '✔ Hay al menos un modelo que funciona; la app usará ese.' : 'Ningún modelo ha respondido. Mira el detalle de abajo.'); }
    catch (e) { setMsg(e.message); }
  };

  const test = async () => {
    setMsg('Probando…');
    try { await askGemini({ key: settings.geminiKey, prompt: 'Responde solo con la palabra OK.' }); setMsg('✔ Funciona.'); }
    catch (e) { setMsg(e.message); }
  };

  return (
    <section className="card stack">
      <h2>IA de los apuntes (Gemini)</h2>
      {has ? (
        <>
          <p className="muted small">Clave guardada (…{settings.geminiKey.slice(-4)}). Se guarda solo en este dispositivo (no en la nube): en cada dispositivo tienes que ponerla una vez.</p>
          <div className="chips">
            <button className="btn small" onClick={test}>Probar</button>
            <button className="btn small" onClick={runDiag}>Diagnóstico</button>
            <button className="btn small" onClick={() => { setKey('geminiKey', ''); setMsg(''); }}>Quitar clave</button>
          </div>
        </>
      ) : (
        <>
          <p className="muted small">
            Gratis y sin tarjeta: entra en <b>aistudio.google.com/apikey</b> con tu cuenta de Google, crea una clave y pégala aquí.
            En el plan gratuito Google puede usar lo que envíes para mejorar sus modelos, así que no mandes datos personales.
          </p>
          <input type="password" placeholder="AIza…" value={key} onChange={(e) => setKey(e.target.value)} />
          <button className="btn primary" style={{ alignSelf: 'flex-start' }} disabled={key.trim().length < 20}
            onClick={() => { setKey('geminiKey', key.trim()); setKey(''); }}>Guardar clave</button>
        </>
      )}
      <h3 style={{ margin: '8px 0 0' }}>Respaldo: Groq (opcional)</h3>
      {hasGroq ? (
        <>
          <p className="muted small">Clave guardada (…{settings.groqKey.slice(-4)}). Si Gemini falla, la app usa Groq (solo con texto).</p>
          <div className="chips">
            <button className="btn small" onClick={testGroq}>Probar Groq</button>
            <button className="btn small" onClick={() => { setKey('groqKey', ''); setMsg(''); }}>Quitar clave</button>
          </div>
        </>
      ) : (
        <>
          <p className="muted small">Gratis y sin tarjeta: crea una clave en <b>console.groq.com/keys</b> y pégala aquí. No lee PDF ni fotos, pero casi nunca se satura.</p>
          <input type="password" placeholder="gsk_…" value={gkey} onChange={(e) => setGkey(e.target.value)} />
          <button className="btn primary" style={{ alignSelf: 'flex-start' }} disabled={gkey.trim().length < 20}
            onClick={() => { setKey('groqKey', gkey.trim()); setGkey(''); }}>Guardar clave de Groq</button>
        </>
      )}
      {msg && <p className="small" style={{ whiteSpace: 'pre-wrap' }}>{msg}</p>}
      {diag && (
        <div className="small" style={{ fontFamily: 'monospace', overflowWrap: 'anywhere' }}>
          <div>Modelos de tu clave: {diag.listed.length ? diag.listed.join(', ') : 'ninguno encontrado'}</div>
          {diag.results.map((r) => <div key={r.model}>{r.ok ? '✔' : '✘'} {r.model} · {r.status}{r.detail ? ` · ${r.detail}` : ''}</div>)}
        </div>
      )}
    </section>
  );
}
