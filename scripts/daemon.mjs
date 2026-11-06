// SERVIDOR PUNTUAL: se queda encendido (en tu servidor casero) y manda cada aviso en el minuto exacto.
// Escucha los cambios en Firestore (así casi no gasta lecturas del plan gratuito) y cada 20 segundos mira qué avisos tocan.
// Arranque: npm run avisos   (en producción lo gestiona systemd, ver scripts/organiza-avisos.service)
//
// HEALTHCHECK_URL (opcional): URL de healthchecks.io; se pide cada minuto. Si el servidor se apaga, ellos te avisan por correo.
import { randomUUID } from 'node:crypto';
import { parseIcs, planCalendarImport } from '../src/lib/ics.js';
import { dispatchDue } from '../src/lib/dispatch.js';
import { buildState, init, sendToAll } from './common.mjs';

const TICK_MS = 20_000;
const db = init();
const attempts = new Map();
const tracked = new Map(); // uid -> datos en memoria del usuario
const log = (...a) => console.log(new Date().toISOString(), ...a);
const onError = (what) => (e) => console.warn(new Date().toISOString(), `[${what}]`, e.message ?? e);

function track(ref) {
  const u = { id: ref.id, ref, items: new Map(), settings: {}, subs: new Map(), sent: new Map() };
  const apply = (map) => (snap) =>
    snap.docChanges().forEach((ch) => (ch.type === 'removed' ? map.delete(ch.doc.id) : map.set(ch.doc.id, ch.doc.ref && { ref: ch.doc.ref, ...ch.doc.data() })));
  ref.collection('items').onSnapshot(apply(u.items), onError('items'));
  ref.collection('push').onSnapshot(apply(u.subs), onError('push'));
  ref.collection('sent').onSnapshot(apply(u.sent), onError('sent'));
  ref.collection('meta').doc('settings').onSnapshot((s) => { u.settings = s.exists ? s.data().data : {}; }, onError('settings'));
  tracked.set(ref.id, u);
  log(`Siguiendo al usuario ${ref.id}`);
}

async function discoverUsers() {
  for (const ref of await db.collection('users').listDocuments()) if (!tracked.has(ref.id)) track(ref);
}

const view = (u) => {
  const subs = [...u.subs.values()];
  return {
    id: u.id, ref: u.ref, subs,
    state: buildState([...u.items.values()], u.settings, subs),
    sent: new Set(u.sent.keys()),
    raw: u,
  };
};

let busy = false;
async function tick() {
  if (busy) return;
  busy = true;
  try {
    const n = await dispatchDue({
      users: [...tracked.values()].map(view),
      attempts,
      send: async (u, notification) => {
        const ok = await sendToAll(u.subs, notification);
        if (ok) log(`Enviado a ${u.id}: ${notification.title}`);
        return ok;
      },
      markSent: async (u, key) => {
        u.raw.sent.set(key, { at: Date.now() });
        await u.ref.collection('sent').doc(key).set({ at: Date.now() });
      },
    });
    if (n) log(`Avisos enviados: ${n}`);
  } catch (e) {
    onError('tick')(e);
  } finally {
    busy = false;
  }
}

async function cleanup() {
  const old = Date.now() - 60 * 24 * 3600 * 1000;
  for (const u of tracked.values()) {
    for (const [id, d] of u.sent) if ((d.at ?? 0) < old) await u.ref.collection('sent').doc(id).delete().catch(onError('limpieza'));
  }
}

// Calendarios de clase (Moodle): lee los enlaces .ics de cada usuario y crea/actualiza entregas y exámenes.
const CAL_EVERY_MS = 3 * 3600 * 1000;
async function syncCalendars() {
  for (const u of tracked.values()) {
    const calendars = u.settings.calendars ?? [];
    for (const cal of calendars) {
      try {
        const res = await fetch(cal.url, { headers: { 'User-Agent': 'Seiri' }, signal: AbortSignal.timeout(30_000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const events = parseIcs(await res.text());
        const state = buildState([...u.items.values()], u.settings, [...u.subs.values()]);
        const plan = planCalendarImport(state, events, { programId: cal.programId ?? null, makeId: randomUUID });
        const write = async (col, rec) => {
          const key = `${col}__${rec.id}`;
          const now = Date.now();
          const prev = u.items.get(key)?.data;
          const data = JSON.parse(JSON.stringify({ ...prev, createdAt: prev?.createdAt ?? now, ...rec, updatedAt: now })); // sin undefined
          await u.ref.collection('items').doc(key).set({ col, id: rec.id, data, updatedAt: now });
        };
        for (const s of plan.subjects) await write('subjects', s);
        for (const t of plan.tasks) await write('tasks', t);
        for (const x of plan.exams) await write('exams', x);
        const n = plan.subjects.length + plan.tasks.length + plan.exams.length;
        if (n) log(`Calendario "${cal.name}" de ${u.id}: ${plan.tasks.length} entregas, ${plan.exams.length} exámenes, ${plan.subjects.length} asignaturas`);
      } catch (e) {
        onError(`calendario ${cal.name}`)(e);
      }
    }
  }
}

await discoverUsers();
log('Servidor de avisos en marcha.');
setInterval(tick, TICK_MS);
setTimeout(() => syncCalendars().catch(onError('calendarios')), 60_000);
setInterval(() => syncCalendars().catch(onError('calendarios')), CAL_EVERY_MS);
setInterval(() => discoverUsers().catch(onError('usuarios')), 10 * 60 * 1000);
setInterval(() => cleanup().catch(onError('limpieza')), 6 * 3600 * 1000);
if (process.env.HEALTHCHECK_URL) {
  const ping = () => fetch(process.env.HEALTHCHECK_URL).catch(onError('latido'));
  ping();
  setInterval(ping, 60 * 1000);
}
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { log('Parando.'); process.exit(0); });
