// Ajustes: clave gratuita de Gemini para la IA de los apuntes.
import { useState } from 'react';
import { actions, useAppState } from '../data/index.js';
import { askGemini } from '../lib/gemini.js';

export default function AiCard() {
  const { settings } = useAppState();
  const [key, setKey] = useState('');
  const [msg, setMsg] = useState('');
  const has = !!settings.geminiKey;

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
          <p className="muted small">Clave guardada (…{settings.geminiKey.slice(-4)}). Se sincroniza con tus otros dispositivos.</p>
          <div className="chips">
            <button className="btn small" onClick={test}>Probar</button>
            <button className="btn small" onClick={() => { actions.updateSettings({ geminiKey: '' }); setMsg(''); }}>Quitar clave</button>
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
            onClick={() => { actions.updateSettings({ geminiKey: key.trim() }); setKey(''); }}>Guardar clave</button>
        </>
      )}
      {msg && <p className="small">{msg}</p>}
    </section>
  );
}
