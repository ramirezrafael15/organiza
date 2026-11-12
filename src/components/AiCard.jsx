// Ajustes: clave gratuita de Gemini para la IA de los apuntes.
import { useState } from 'react';
import { setKey, useKeys } from '../lib/keys.js';
import { askGemini, diagnose } from '../lib/gemini.js';
import { askGroq } from '../lib/groq.js';
import { actions, useAppState } from '../data/index.js';
import { decryptKeys, encryptKeys } from '../lib/vault.js';

export default function AiCard() {
  const settings = useKeys();
  const { settings: cloud } = useAppState();
  const vault = cloud.keysVault;
  const [pass, setPass] = useState('');
  const saveVault = async () => {
    setMsg('Guardando copia segura…');
    try { actions.updateSettings({ keysVault: await encryptKeys(settings, pass) }); setPass(''); setMsg('✔ Copia segura guardada en tu cuenta (cifrada). Si pierdes las claves, las recuperas con esa contraseña.'); }
    catch { setMsg('No se pudo cifrar en este navegador.'); }
  };
  const restoreVault = async () => {
    setMsg('Recuperando…');
    try { const k = await decryptKeys(vault, pass); Object.entries(k).forEach(([n, v]) => setKey(n, v)); setPass(''); setMsg('✔ Claves recuperadas.'); }
    catch { setMsg('Contraseña incorrecta.'); }
  };
  const [key, setKeyInput] = useState('');
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
      {!has && vault && (
        <div className="stack" style={{ gap: 6 }}>
          <p className="small" style={{ margin: 0 }}>🔐 Tienes una copia segura de tus claves. Escribe tu contraseña de recuperación y vuelven sin tener que pedirlas otra vez.</p>
          <input type="password" placeholder="Contraseña de recuperación" value={pass} onChange={(e) => setPass(e.target.value)} />
          <button className="btn primary" style={{ alignSelf: 'flex-start' }} disabled={pass.length < 6} onClick={restoreVault}>Recuperar mis claves</button>
        </div>
      )}
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
          <input type="password" placeholder="AIza…" value={key} onChange={(e) => setKeyInput(e.target.value)} />
          <button className="btn primary" style={{ alignSelf: 'flex-start' }} disabled={key.trim().length < 20}
            onClick={() => { setKey('geminiKey', key.trim()); setKeyInput(''); }}>Guardar clave</button>
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
      {(has || hasGroq) && (
        <>
          <h3 style={{ margin: '8px 0 0' }}>Copia segura (para que no se pierdan)</h3>
          <p className="muted small">
            {vault ? `✅ Hay una copia cifrada en tu cuenta (${new Date(vault.at).toLocaleDateString('es-ES')}). ` : ''}
            Elige una contraseña de recuperación (no es la de tu cuenta). Las claves se cifran en tu móvil y solo se sube el texto cifrado: nadie más puede leerlas, ni yo. Si el móvil las borra, las recuperas con esta contraseña.
          </p>
          <input type="password" placeholder="Contraseña de recuperación (mín. 6)" value={pass} onChange={(e) => setPass(e.target.value)} />
          <button className="btn small" style={{ alignSelf: 'flex-start' }} disabled={pass.length < 6} onClick={saveVault}>{vault ? 'Actualizar copia segura' : 'Guardar copia segura'}</button>
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
