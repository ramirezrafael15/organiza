import { useState } from 'react';
import { getWakeWord, setWake, setWakeWord, useWake, wakeSupported } from '../lib/wake.js';
import { setVoiceOn, speak, voiceOn } from '../lib/voice.js';

export default function WakeCard() {
  const on = useWake();
  const ok = wakeSupported();
  const [word, setWord] = useState(getWakeWord());
  const [voz, setVoz] = useState(voiceOn());
  return (
    <section className="card stack">
      <h2>Asistente de voz</h2>
      <label className="row" style={{ gap: 12, alignItems: 'center', opacity: ok ? 1 : 0.5 }}>
        <input type="checkbox" checked={on && ok} disabled={!ok} onChange={(e) => setWake(e.target.checked)} />
        <span>Escuchar “Oye {word}”</span>
      </label>
      <label className="stack" style={{ gap: 4 }}>
        <span className="small muted">Palabra para despertarlo (evita “Siri”)</span>
        <input type="text" value={word} maxLength={20} onChange={(e) => setWord(e.target.value)} onBlur={() => { setWakeWord(word); setWord(getWakeWord()); }} />
      </label>
      <label className="row" style={{ gap: 12, alignItems: 'center' }}>
        <input type="checkbox" checked={voz} onChange={(e) => { setVoz(e.target.checked); setVoiceOn(e.target.checked); if (e.target.checked) speak('Hola, te hablo así.'); }} />
        <span>Que me responda con voz</span>
      </label>
      <p className="muted small" style={{ margin: 0 }}>
        {ok ? 'Solo funciona con Seiri abierta en primer plano y en este dispositivo. Mientras está activo, el navegador usa el micrófono. Si te da falsas alarmas, apágalo.'
          : 'Solo disponible en ordenador con Edge o Chrome. En el iPhone usa el botón del micrófono.'}
      </p>
    </section>
  );
}
