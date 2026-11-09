// Lógica pura del temporizador de técnicas (Pomodoro y otras): fases, avance y calendario de avisos.
export const DEFAULTS = [
  { id: 'pomodoro', name: 'Pomodoro', focus: 25, rest: 5, long: 15, cycles: 4, desc: '25 min de foco, 5 de descanso. Cada 4 rondas, un descanso largo.' },
  { id: '52-17', name: '52 / 17', focus: 52, rest: 17, long: 17, cycles: 1, desc: 'Foco largo para materias que piden concentración.' },
  { id: 'ultradiano', name: 'Ciclos de 90', focus: 90, rest: 20, long: 20, cycles: 1, desc: 'Un bloque profundo de 90 min. Ideal para estudiar a fondo.' },
  { id: 'repaso', name: 'Repaso rápido', focus: 15, rest: 3, long: 10, cycles: 3, desc: 'Bloques cortos para repasar antes de un examen.' },
];

export const phaseMs = (t, phase) => (phase === 'focus' ? t.focus : phase === 'long' ? t.long : t.rest) * 60000;

/** Mensaje del aviso que suena cuando EMPIEZA la fase `to`. */
export const messageFor = (to) =>
  to === 'focus' ? { title: 'A estudiar', body: 'Vuelve al foco.' }
    : to === 'long' ? { title: 'Descanso largo', body: 'Buen trabajo. Desconecta un buen rato.' }
      : { title: 'Descanso', body: 'Buen bloque. Respira un rato.' };

/** Fase que sigue a `run` (ejecutándose desde `at`). Devuelve el nuevo estado y si se acaba de completar un bloque de foco. */
export function advance(t, run, at) {
  if (run.phase === 'focus') {
    const phase = t.cycles > 1 && run.round % t.cycles === 0 ? 'long' : 'rest';
    return { run: { ...run, phase, left: phaseMs(t, phase), endAt: at + phaseMs(t, phase), running: true }, doneFocus: true };
  }
  return { run: { ...run, phase: 'focus', round: run.round + 1, left: phaseMs(t, 'focus'), endAt: at + phaseMs(t, 'focus'), running: true }, doneFocus: false };
}

/** Si la app estuvo cerrada, avanza las fases que ya han pasado usando su hora real (sin deriva). */
export function catchUp(t, run, now) {
  let cur = run; let blocks = 0;
  for (let i = 0; cur.running && now >= cur.endAt && i < 200; i++) {
    const r = advance(t, cur, cur.endAt);
    cur = r.run; if (r.doneFocus) blocks++;
  }
  return { run: cur, blocks };
}

/** Avisos futuros si no tocas nada: [{ id, at, title, body, tag }]. Máx. `max` y dentro de `horizonMs`. */
export function schedule(t, run, now, { max = 12, horizonMs = 6 * 3600 * 1000 } = {}) {
  if (!run?.running) return [];
  const out = []; let cur = run;
  while (out.length < max && cur.endAt - now <= horizonMs) {
    const r = advance(t, cur, cur.endAt);
    out.push({ id: `${cur.endAt}`, at: cur.endAt, ...messageFor(r.run.phase), tag: 'seiri-focus' });
    cur = r.run;
  }
  return out;
}

/** Estado de un foco recién empezado. `meta` (opcional) guarda qué estudias: { label, subjectId }. */
export const startRun = (t, now, meta = {}) => ({
  techId: t.id, phase: 'focus', round: 1, left: phaseMs(t, 'focus'), endAt: now + phaseMs(t, 'focus'), running: true, ...meta,
});
