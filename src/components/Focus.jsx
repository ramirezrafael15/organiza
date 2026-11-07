// Técnicas de estudio: Pomodoro y otras, con temporizador. Puedes crear las tuyas.
import { useEffect, useMemo, useState } from 'react';
import { actions, useAppState } from '../data/index.js';

const DEFAULTS = [
  { id: 'pomodoro', name: 'Pomodoro', focus: 25, rest: 5, long: 15, cycles: 4, desc: '25 min de foco, 5 de descanso. Cada 4 rondas, un descanso largo.' },
  { id: '52-17', name: '52 / 17', focus: 52, rest: 17, long: 17, cycles: 1, desc: 'Foco largo para materias que piden concentración.' },
  { id: 'ultradiano', name: 'Ciclos de 90', focus: 90, rest: 20, long: 20, cycles: 1, desc: 'Un bloque profundo de 90 min. Ideal para estudiar a fondo.' },
  { id: 'repaso', name: 'Repaso rápido', focus: 15, rest: 3, long: 10, cycles: 3, desc: 'Bloques cortos para repasar antes de un examen.' },
];
const KEY = 'seiri:focus';
const LOG = 'seiri:focus-log';
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };
const todayKey = () => new Date().toISOString().slice(0, 10);
const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25].forEach((t) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = 880; g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.22);
      o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.25);
    });
  } catch { /* sin audio */ }
}

export default function Techniques() {
  const { settings } = useAppState();
  const custom = settings?.techniques ?? [];
  const all = useMemo(() => [...DEFAULTS, ...custom], [custom]);
  const [run, setRun] = useState(() => read(KEY, null)); // { techId, phase, round, endAt, left, running }
  const [, tick] = useState(0);
  const [creating, setCreating] = useState(false);
  const tech = run && all.find((t) => t.id === run.techId);

  const save = (r) => { setRun(r); write(KEY, r); };
  const dur = (t, phase) => (phase === 'focus' ? t.focus : phase === 'long' ? t.long : t.rest) * 60000;
  const start = (t) => save({ techId: t.id, phase: 'focus', round: 1, left: dur(t, 'focus'), endAt: Date.now() + dur(t, 'focus'), running: true });
  const toggle = () => save(run.running ? { ...run, running: false, left: run.endAt - Date.now(), endAt: null } : { ...run, running: true, endAt: Date.now() + run.left });
  const stop = () => save(null);

  const next = () => {
    if (run.phase === 'focus') {
      const log = read(LOG, {}); const k = todayKey();
      log[k] = { rounds: (log[k]?.rounds ?? 0) + 1, min: (log[k]?.min ?? 0) + tech.focus }; write(LOG, log);
      const isLong = tech.cycles > 1 && run.round % tech.cycles === 0;
      const phase = isLong ? 'long' : 'rest';
      return save({ ...run, phase, left: dur(tech, phase), endAt: Date.now() + dur(tech, phase), running: true });
    }
    return save({ ...run, phase: 'focus', round: run.round + 1, left: dur(tech, 'focus'), endAt: Date.now() + dur(tech, 'focus'), running: true });
  };

  useEffect(() => {
    if (!run?.running) return undefined;
    const id = setInterval(() => {
      tick((n) => n + 1);
      if (Date.now() >= run.endAt) {
        beep(); navigator.vibrate?.([200, 100, 200]);
        try { if (Notification.permission === 'granted') new Notification(run.phase === 'focus' ? 'Descanso' : 'A estudiar', { body: run.phase === 'focus' ? 'Buen bloque. Respira un rato.' : 'Vuelve al foco.' }); } catch { /* sin permiso */ }
        next();
      }
    }, 250);
    return () => clearInterval(id);
  });

  const log = read(LOG, {})[todayKey()];
  const left = run ? (run.running ? run.endAt - Date.now() : run.left) : 0;
  const total = run && tech ? dur(tech, run.phase) : 1;
  const C = 2 * Math.PI * 46;
  const colors = { focus: 'var(--primary-2)', rest: 'var(--u-0)', long: 'var(--u-0)' };

  return (
    <>
      <p className="muted" style={{ margin: '-6px 0 14px' }}>
        {log ? `Hoy llevas ${log.rounds} ${log.rounds === 1 ? 'bloque' : 'bloques'} · ${log.min} min de foco.` : 'Elige una técnica y empieza a estudiar con tiempo marcado.'}
      </p>

      {run && tech && (
        <section className="focus-run" style={{ '--c': colors[run.phase] }}>
          <div className="focus-ring">
            <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" className="ring-track" /><circle cx="50" cy="50" r="46" className="ring-bar" strokeDasharray={C} strokeDashoffset={C * (1 - Math.max(0, left) / total)} style={{ transition: 'none' }} /></svg>
            <div className="focus-time"><b>{mmss(left)}</b><span>{run.phase === 'focus' ? 'Foco' : run.phase === 'long' ? 'Descanso largo' : 'Descanso'}</span></div>
          </div>
          <p className="small muted" style={{ textAlign: 'center' }}>{tech.name} · ronda {run.round}{tech.cycles > 1 ? ` de ${tech.cycles}` : ''}</p>
          <div className="row-gap" style={{ justifyContent: 'center' }}>
            <button className="btn primary" onClick={toggle}>{run.running ? 'Pausa' : 'Seguir'}</button>
            <button className="btn" onClick={next}>Saltar</button>
            <button className="btn" onClick={stop}>Terminar</button>
          </div>
        </section>
      )}

      <div className="tech-list">
        {all.map((t) => (
          <article key={t.id} className="card tech">
            <div>
              <b>{t.name}</b>
              <span className="tech-nums">{t.focus} / {t.rest}{t.cycles > 1 ? ` · ×${t.cycles}` : ''}</span>
              <p className="small muted">{t.desc || `${t.focus} min de foco y ${t.rest} de descanso.`}</p>
            </div>
            <div className="row-gap">
              {!DEFAULTS.some((d) => d.id === t.id) && <button className="link-btn" onClick={() => window.confirm(`¿Borrar "${t.name}"?`) && actions.updateSettings({ techniques: custom.filter((c) => c.id !== t.id) })}>Borrar</button>}
              <button className="btn primary" onClick={() => { try { Notification.requestPermission?.(); } catch { /* sin permiso */ } start(t); }}>Empezar</button>
            </div>
          </article>
        ))}
      </div>

      {creating ? <NewTechnique onClose={() => setCreating(false)} onSave={(t) => { actions.updateSettings({ techniques: [...custom, t] }); setCreating(false); }} />
        : <button className="btn" style={{ marginTop: 12 }} onClick={() => setCreating(true)}>＋ Crear mi técnica</button>}
    </>
  );
}

function NewTechnique({ onClose, onSave }) {
  const [f, setF] = useState({ name: '', focus: 30, rest: 5, long: 15, cycles: 4 });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const ok = f.name.trim() && +f.focus > 0 && +f.rest > 0;
  const submit = (e) => {
    e.preventDefault();
    if (!ok) return;
    onSave({ id: `t_${Date.now().toString(36)}`, name: f.name.trim(), focus: +f.focus, rest: +f.rest, long: +f.long || +f.rest, cycles: Math.max(1, +f.cycles || 1), desc: '' });
  };
  return (
    <form className="card stack tech-form" onSubmit={submit}>
      <input autoFocus type="text" placeholder="Nombre (ej. Mi método de mates)" value={f.name} onChange={set('name')} />
      <div className="tech-grid">
        <label>Foco (min)<input type="number" min="1" max="180" value={f.focus} onChange={set('focus')} /></label>
        <label>Descanso (min)<input type="number" min="1" max="60" value={f.rest} onChange={set('rest')} /></label>
        <label>Largo (min)<input type="number" min="1" max="90" value={f.long} onChange={set('long')} /></label>
        <label>Rondas hasta el largo<input type="number" min="1" max="12" value={f.cycles} onChange={set('cycles')} /></label>
      </div>
      <div className="row-gap"><button className="btn primary" disabled={!ok}>Guardar</button><button type="button" className="btn" onClick={onClose}>Cancelar</button></div>
    </form>
  );
}
