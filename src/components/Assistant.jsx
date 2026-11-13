// Asistente de chat: un botón flotante y un panel, montado UNA vez en el layout principal.
// El historial vive aquí, así que se mantiene al cambiar de sección.
import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { useUI } from './ui.js';
import { askAI } from '../lib/ai.js';
import { clip, buildPrompt, MAX_CHARS, rateCheck, SYSTEM } from '../lib/assistant.js';
import { useKeys } from '../lib/keys.js';

export default function Assistant({ section, onVoice }) {
  const keys = useKeys();
  const ui = useUI();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]); // { role: 'user'|'ai', text, error? }
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const times = useRef([]);
  const end = useRef(null);
  const noKey = !keys.geminiKey && !keys.groqKey;

  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs, busy, open]);

  // Pide respuesta para `text` (con `history` anterior). Si falla deja un mensaje de error con "Reintentar".
  const ask = async (text, history) => {
    const rc = rateCheck(times.current);
    times.current = rc.recent;
    if (!rc.ok) { setMsgs((m) => [...m, { role: 'ai', error: true, retry: text, text: `Vas muy rápido. Espera unos ${rc.wait} min y vuelve a probar.` }]); return; }
    times.current.push(Date.now());
    setBusy(true);
    try {
      const out = await askAI({ geminiKey: keys.geminiKey, groqKey: keys.groqKey, system: SYSTEM, prompt: buildPrompt({ history, section, text }) });
      setMsgs((m) => [...m, { role: 'ai', text: out }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: 'ai', error: true, retry: text, text: e.message || 'No he podido responder.' }]);
    }
    setBusy(false);
  };

  const send = (e) => {
    e?.preventDefault();
    const text = clip(input);
    if (!text || busy) return;
    setInput('');
    setMsgs((m) => [...m, { role: 'user', text }]);
    ask(text, msgs);
  };

  const retry = (i) => {
    if (busy) return;
    const text = msgs[i].retry;
    const history = msgs.slice(0, i - 1); // todo lo anterior al mensaje del usuario que falló
    setMsgs((m) => m.filter((_, k) => k !== i));
    ask(text, history);
  };

  return (
    <>
      <button className="fab-voice fab-ai" onClick={() => setOpen(true)} aria-label="Asistente de IA"><Icon name="sparkle" /></button>
      {open && (
        <div className="ai-chat" role="dialog" aria-label="Asistente de IA">
          <header className="ai-chat-head">
            <b>Seiri · asistente</b>
            <span className="grow" />
            <button className="btn small" onClick={() => { setOpen(false); onVoice(); }} aria-label="Hablar"><Icon name="mic" /></button>
            {msgs.length > 0 && <button className="btn small" onClick={() => setMsgs([])}>Limpiar</button>}
            <button className="btn small" onClick={() => setOpen(false)} aria-label="Cerrar">✕</button>
          </header>
          <div className="ai-chat-body">
            {msgs.length === 0 && (
              <p className="muted small">Pregúntame lo que quieras sobre tu estudio: qué priorizar, cómo repartir el tiempo… Estás en <b>{section}</b>.</p>
            )}
            {noKey && (
              <p className="small" style={{ color: 'var(--danger)' }}>
                Necesito una clave de IA gratuita. <button className="linkish" onClick={() => { setOpen(false); ui?.navigate('ajustes'); }}>Ponla en Ajustes</button>.
              </p>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`ai-msg ${m.role} ${m.error ? 'err' : ''}`}>
                {m.text}
                {m.error && <button className="btn small" onClick={() => retry(i)}>Reintentar</button>}
              </div>
            ))}
            {busy && <div className="ai-msg ai typing" aria-label="Escribiendo"><i /><i /><i /></div>}
            <div ref={end} />
          </div>
          <form className="ai-chat-form" onSubmit={send}>
            <input type="text" value={input} maxLength={MAX_CHARS} placeholder="Escribe aquí…" onChange={(e) => setInput(e.target.value)} disabled={noKey} />
            <button className="btn primary" disabled={!input.trim() || busy || noKey} aria-label="Enviar"><Icon name="send" /></button>
          </form>
        </div>
      )}
    </>
  );
}
