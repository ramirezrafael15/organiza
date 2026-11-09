// Técnicas de estudio: Pomodoro y otras, con temporizador. Puedes crear las tuyas.
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { actions, useAppState } from '../data/index.js';
import { account } from '../sync/account.js';
import { advance, catchUp, DEFAULTS, messageFor, phaseMs, schedule, startRun } from '../lib/focus.js';

const KEY = 'seiri:focus';
const LOG = 'seiri:focus-log';
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };
const todayKey = () => new Date().toISOString().slice(0, 10);
/**
 * Empieza un foco desde otro sitio (el Panel). Si ya hay uno en marcha no lo pisa.
 * Devuelve true si empezó uno nuevo. Deja marcado que Estudio abra la pestaña "Técnicas".
 */
export function startFocusFor({ label, subjectId }, techId = 'pomodoro') {
  try { sessionStorage.setItem('seiri:study-tab', 'tecnicas'); } catch { /* sin almacenamiento */ }
  const cur = read(KEY, null);
  if (cur) return false;
  const t = DEFAULTS.find((d) => d.id === techId) ?? DEFAULTS[0];
  write(KEY, startRun(t, Date.now(), { label, subjectId }));
  return true;
}

const PHASE_NAME = { focus: 'Foco', rest: 'Descanso', long: 'Descanso largo' };
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
  const dur = phaseMs;
  const start = (t) => save(startRun(t, Date.now(), { label: '' }));
  const toggle = () => save(run.running ? { ...run, running: false, left: run.endAt - Date.now(), endAt: null } : { ...run, running: true, endAt: Date.now() + run.left });
  const stop = () => save(null);

  const addBlocks = (n, min) => {
    if (!n) return;
    const log = read(LOG, {}); const k = todayKey();
    log[k] = { rounds: (log[k]?.rounds ?? 0) + n, min: (log[k]?.min ?? 0) + min }; write(LOG, log);
  };
  const next = () => {
    const r = advance(tech, run, run.running && run.endAt ? run.endAt : Date.now());
    if (r.doneFocus) addBlocks(1, tech.focus);
    save(r.run);
    return r.run;
  };

  // Avisa del cambio de fase. Misma "etiqueta" que el aviso del servidor: si llegan los dos, se ve uno solo.
  const announce = (to) => {
    const m = messageFor(to);
    beep(); navigator.vibrate?.([200, 100, 200]);
    navigator.serviceWorker?.ready.then((reg) => reg.showNotification(m.title, { body: m.body, tag: 'seiri-focus', icon: `${import.meta.env.BASE_URL}icons/icon-192-v3.png` })).catch(() => {});
  };

  // Al volver a la app (estuvo cerrada o en segundo plano) se ponen al día las fases que ya pasaron.
  useEffect(() => {
    const sync = () => {
      const cur = read(KEY, null);
      const t = cur && all.find((x) => x.id === cur.techId);
      if (!cur?.running || !t || Date.now() < cur.endAt) return;
      const { run: r, blocks } = catchUp(t, cur, Date.now());
      addBlocks(blocks, blocks * t.focus);
      save(r);
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all]);

  useEffect(() => {
    if (!run?.running) return undefined;
    const id = setInterval(() => {
      tick((n) => n + 1);
      if (Date.now() >= run.endAt) announce(next().phase);
    }, 250);
    return () => clearInterval(id);
  });

  // El servidor manda los avisos con la app cerrada: aquí se le deja la hora exacta de los próximos cambios.
  useEffect(() => {
    account.setFocusPlan(run?.running && tech ? schedule(tech, run, Date.now()) : []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.running, run?.endAt, run?.techId, tech]);

  const [full, setFull] = useState(false);

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
            <div className="focus-time"><b>{mmss(left)}</b><span>{PHASE_NAME[run.phase]}</span></div>
          </div>
          {run.label && <p style={{ textAlign: 'center', margin: '0 0 4px', fontWeight: 600 }}>{run.label}</p>}
          <p className="small muted" style={{ textAlign: 'center' }}>{tech.name} · ronda {run.round}{tech.cycles > 1 ? ` de ${tech.cycles}` : ''}</p>
          <div className="row-gap" style={{ justifyContent: 'center' }}>
            <button className="btn primary" onClick={toggle}>{run.running ? 'Pausa' : 'Seguir'}</button>
            <button className="btn" onClick={next}>Saltar</button>
            <button className="btn" onClick={stop}>Terminar</button>
          </div>
          <button className="link-btn" onClick={() => setFull(true)}>⛶ Ver en pantalla completa</button>
        </section>
      )}

      {full && run && tech && <FocusScreen run={run} tech={tech} left={left} total={total} color={colors[run.phase]} onToggle={toggle} onClose={() => setFull(false)} />}

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

/** Reloj a pantalla completa: se queda quieto, encendido y con el tiempo bien grande. */
function FocusScreen({ run, tech, left, total, color, onToggle, onClose }) {
  const [ui, setUi] = useState(true);
  const idle = useRef(0);
  const poke = () => { setUi(true); clearTimeout(idle.current); idle.current = setTimeout(() => setUi(false), 3500); };
  const root = useRef(null);

  useEffect(() => {
    poke();
    let lock = null; let closed = false;
    const keepAwake = async () => { try { if (!closed && document.visibilityState === 'visible') lock = await navigator.wakeLock?.request('screen'); } catch { /* sin permiso */ } };
    keepAwake();
    document.addEventListener('visibilitychange', keepAwake);
    // Pantalla completa de verdad donde existe (ordenador, Android). En iPhone la app instalada ya ocupa toda la pantalla.
    try { document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }).catch(() => {}); } catch { /* no disponible */ }
    const onFs = () => { if (!document.fullscreenElement && closed === false && document.fullscreenEnabled) { /* salió con Esc */ onClose(); } };
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('fullscreenchange', onFs);
    window.addEventListener('keydown', onKey);
    return () => {
      closed = true; clearTimeout(idle.current);
      document.removeEventListener('visibilitychange', keepAwake);
      document.removeEventListener('fullscreenchange', onFs);
      window.removeEventListener('keydown', onKey);
      lock?.release?.().catch(() => {});
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const C = 2 * Math.PI * 46;
  return createPortal(
    <div ref={root} className={`focus-full${ui ? ' ui' : ''}`} style={{ '--c': color }} onPointerMove={poke} onPointerDown={poke} role="dialog" aria-label="Temporizador en pantalla completa">
      <svg className="ff-ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" className="ring-track" /><circle cx="50" cy="50" r="46" className="ring-bar" strokeDasharray={C} strokeDashoffset={C * (1 - Math.max(0, left) / total)} style={{ transition: 'none' }} /></svg>
      <div className="ff-center">
        <span className="ff-phase">{PHASE_NAME[run.phase]}</span>
        <b className="ff-time">{mmss(left)}</b>
        <span className="ff-sub">{tech.name} · ronda {run.round}{tech.cycles > 1 ? ` de ${tech.cycles}` : ''}{!run.running ? ' · en pausa' : ''}</span>
      </div>
      <div className="ff-bar">
        <button className="btn" onClick={onToggle}>{run.running ? 'Pausa' : 'Seguir'}</button>
        <button className="btn" onClick={onClose}>Salir</button>
      </div>
    </div>,
    document.body,
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
