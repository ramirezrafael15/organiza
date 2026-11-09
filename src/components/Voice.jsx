// Botón de micrófono y hoja del asistente de voz.
import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import Modal from './Modal.jsx';
import { actions, useAppState, useToday } from '../data/index.js';
import { useKeys } from '../lib/keys.js';
import { fmt } from '../lib/dates.js';
import { hasSpeechApi, speak, transcribe, understand } from '../lib/voice.js';

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const KINDS = { todo: 'Pendiente', task: 'Entrega', exam: 'Examen' };

export default function Voice({ onClose, autoStart = false }) {
  const state = useAppState();
  const keys = useKeys();
  const today = useToday();
  const [phase, setPhase] = useState('idle'); // idle | rec | work | confirm | answer | error
  const [heard, setHeard] = useState('');
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');
  const [typed, setTyped] = useState('');
  const rec = useRef(null);

  useEffect(() => { if (autoStart) { const t = setTimeout(start, 400); return () => clearTimeout(t); } return undefined; }, []); // eslint-disable-line

  useEffect(() => () => { try { rec.current?.stop?.(); speechSynthesis.cancel(); } catch { /* nada */ } }, []);

  const run = async (text) => {
    setHeard(text);
    if (!text) { setErr('No te he oído. Prueba otra vez.'); setPhase('error'); return; }
    setPhase('work');
    try {
      const wd = WEEKDAYS[new Date(`${today}T12:00:00`).getDay()];
      const r = await understand(text, state, keys, today, wd);
      setRes(r);
      if (r.action === 'query' || r.action === 'unknown') { setPhase('answer'); speak(r.answer); }
      else if (!r.date && r.action !== 'todo') { setErr('No he pillado la fecha. Dímelo otra vez incluyendo el día.'); setPhase('error'); }
      else setPhase('confirm');
    } catch (e) { setErr(e.message); setPhase('error'); }
  };

  const start = async () => {
    setErr(''); setHeard(''); setRes(null);
    if (!keys.geminiKey && !keys.groqKey) { setErr('Necesito una clave de IA gratuita. Pon la de Gemini o Groq en Ajustes.'); setPhase('error'); return; }
    // Con clave de Groq grabamos el audio y lo transcribe Whisper (funciona también en iPhone).
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    if (keys.groqKey && navigator.mediaDevices?.getUserMedia && window.MediaRecorder) {
      let stream;
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
      catch (e) {
        const denied = e?.name === 'NotAllowedError' || e?.name === 'SecurityError';
        setErr(denied
          ? (isIOS ? 'iPhone ha bloqueado el micrófono. Ve a Ajustes › Apps › Safari › Micrófono (o Ajustes › Seiri) y ponlo en “Preguntar” o “Permitir”.' : 'No tengo permiso para usar el micrófono. Actívalo en los ajustes del navegador.')
          : `No encuentro el micrófono (${e?.name || 'error'}).`);
        setPhase('error'); return;
      }
      try {
        // iPhone solo graba en mp4/aac; el resto de navegadores en webm/ogg.
        const mime = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'].find((m) => MediaRecorder.isTypeSupported?.(m));
        const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
        const chunks = [];
        mr.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
        mr.onerror = () => { stream.getTracks().forEach((t) => t.stop()); setErr('Ha fallado la grabación. Prueba otra vez.'); setPhase('error'); };
        mr.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          if (!chunks.length) { setErr('No se ha grabado nada. Habla un poco más y pulsa otra vez para parar.'); setPhase('error'); return; }
          setPhase('work');
          try { await run(await transcribe(new Blob(chunks, { type: mr.mimeType || mime || 'audio/mp4' }), keys.groqKey)); }
          catch (e) { setErr(e.message); setPhase('error'); }
        };
        rec.current = mr; mr.start(1000); setPhase('rec');
        return;
      } catch (e) {
        stream.getTracks().forEach((t) => t.stop());
        setErr(`No puedo grabar en este dispositivo (${e?.name || 'error'}). Escríbelo abajo.`); setPhase('error'); return;
      }
    }
    if (isIOS && !keys.groqKey) {
      setErr('En iPhone el micrófono necesita la clave gratuita de Groq (Ajustes › IA). Sin ella escríbelo abajo.'); setPhase('error'); return;
    }
    if (hasSpeechApi()) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const r = new SR(); r.lang = 'es-ES'; r.interimResults = false;
      r.onresult = (e) => run(e.results[0][0].transcript);
      r.onerror = (e) => { setErr(e?.error === 'not-allowed' || e?.error === 'service-not-allowed' ? 'El navegador no deja usar el micrófono. Revisa el permiso o escríbelo abajo.' : 'No he podido oírte. Prueba otra vez o escríbelo abajo.'); setPhase('error'); };
      rec.current = r; r.start(); setPhase('rec');
      return;
    }
    setErr('Este navegador no deja usar el micrófono aquí. Escríbelo abajo.'); setPhase('error');
  };
  const stop = () => { try { rec.current?.stop(); } catch { /* nada */ } };

  const confirm = () => {
    const r = res; const base = { title: r.title, time: r.time, subjectId: r.subjectId };
    const rd = [...(state.settings?.reminderDays ?? [])];
    if (r.action === 'todo') actions.save('todos', { ...base, date: r.date ?? today, done: false });
    else if (r.action === 'task') actions.save('tasks', { ...base, due: r.date, status: 'pendiente', progress: 0, reminderDays: rd });
    else if (r.action === 'exam') actions.save('exams', { topics: r.title, date: r.date, time: r.time, subjectId: r.subjectId, progress: 0, reminderDays: rd });
    speak('Hecho.');
    onClose();
  };

  return (
    <Modal title="Asistente de voz" onClose={onClose}>
      <div className="voice">
        {phase === 'idle' && <p className="muted">Pulsa y habla. Por ejemplo: “apunta una entrega de Bases de Datos para el viernes a las 10” o “¿qué tengo mañana?”.</p>}
        {phase === 'rec' && <p className="muted">Te escucho… pulsa otra vez cuando acabes.</p>}
        {phase === 'work' && <p className="muted">Pensando…</p>}
        {heard && phase !== 'idle' && phase !== 'rec' && <p className="small muted">“{heard}”</p>}

        {(phase === 'idle' || phase === 'rec' || phase === 'work' || phase === 'error') && (
          <button className={`orb ${phase === 'rec' ? 'live' : ''} ${phase === 'work' ? 'busy' : ''}`} onClick={phase === 'rec' ? stop : phase === 'work' ? undefined : start} aria-label={phase === 'rec' ? 'Parar' : 'Hablar'}>
            <Icon name={phase === 'rec' ? 'x' : 'mic'} />
          </button>
        )}
        {phase === 'error' && <p className="small" style={{ color: 'var(--danger)', textAlign: 'center' }}>{err}</p>}

        {phase === 'confirm' && res && (
          <div className="voice-card">
            <span className="small muted">{KINDS[res.action]}{res.subjectName ? ` · ${res.subjectName}` : ''}</span>
            <b>{res.title || res.subjectName || 'Sin título'}</b>
            <span className="small muted">{res.date ? fmt(res.date, "EEEE d 'de' MMMM") : 'Sin fecha'}{res.time ? ` · ${res.time}` : ''}</span>
            <div className="row-gap">
              <button className="btn primary" onClick={confirm}>Guardar</button>
              <button className="btn" onClick={() => setPhase('idle')}>Repetir</button>
            </div>
          </div>
        )}
        {phase === 'answer' && res && (
          <div className="voice-card">
            <p style={{ margin: 0 }}>{res.answer}</p>
            <button className="btn" onClick={() => setPhase('idle')}>Preguntar otra cosa</button>
          </div>
        )}

        {(phase === 'idle' || phase === 'error') && (
          <form className="ai-free" onSubmit={(e) => { e.preventDefault(); if (typed.trim()) { run(typed.trim()); setTyped(''); } }}>
            <input type="text" placeholder="…o escríbelo aquí" value={typed} onChange={(e) => setTyped(e.target.value)} />
            <button className="btn" disabled={!typed.trim()}>Enviar</button>
          </form>
        )}
      </div>
    </Modal>
  );
}
