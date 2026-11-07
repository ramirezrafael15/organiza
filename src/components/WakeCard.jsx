import { setWake, useWake, wakeSupported } from '../lib/wake.js';

export default function WakeCard() {
  const on = useWake();
  const ok = wakeSupported();
  return (
    <section className="card stack">
      <h2>Asistente de voz</h2>
      <label className="row" style={{ gap: 12, alignItems: 'center', opacity: ok ? 1 : 0.5 }}>
        <input type="checkbox" checked={on && ok} disabled={!ok} onChange={(e) => setWake(e.target.checked)} />
        <span>Escuchar “Oye Seiri”</span>
      </label>
      <p className="muted small" style={{ margin: 0 }}>
        {ok ? 'Solo funciona con Seiri abierta en primer plano y en este dispositivo. Mientras está activo, el navegador usa el micrófono. Si te da falsas alarmas, apágalo.'
          : 'Solo disponible en ordenador con Edge o Chrome. En el iPhone usa el botón del micrófono.'}
      </p>
    </section>
  );
}
