// Calendarios de Moodle (PRADO, Atlántida…) en formato .ics → entregas y exámenes de Seiri.
// Función pura y compartida: la usan la app (importar archivo) y el servidor (leer el enlace cada pocas horas).
import { PALETTE } from './kinds.js';
import { norm, sameName } from './scheduleImport.js';

const unescapeText = (s) => s.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');

/** Lee los VEVENT de un .ics. start es un Date (UTC) o, si el evento es de día completo, solo date 'YYYY-MM-DD'. */
export function parseIcs(text) {
  const lines = String(text).replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  const events = [];
  let cur = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') cur = {};
    else if (line === 'END:VEVENT') { if (cur?.uid && cur.start) events.push(cur); cur = null; }
    else if (cur) {
      const i = line.indexOf(':');
      if (i < 0) continue;
      const key = line.slice(0, i).split(';')[0].toUpperCase();
      const val = line.slice(i + 1);
      if (key === 'UID') cur.uid = val.trim();
      else if (key === 'SUMMARY') cur.summary = unescapeText(val).trim();
      else if (key === 'DESCRIPTION') cur.description = unescapeText(val).trim();
      else if (key === 'CATEGORIES') cur.category = unescapeText(val).split(',')[0].trim();
      else if (key === 'DTSTART') cur.start = parseDate(val);
    }
  }
  return events;
}

function parseDate(v) {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z?))?$/.exec(v.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  if (h === undefined) return { date: `${y}-${mo}-${d}` };
  return z ? { utc: new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)) } : { date: `${y}-${mo}-${d}`, time: `${h}:${mi}` };
}

/** Fecha y hora locales (en la zona dada) de un instante UTC. */
function localParts(date, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(date).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

const prevDay = (iso) => new Date(Date.parse(`${iso}T12:00:00Z`) - 864e5).toISOString().slice(0, 10);

/** Fecha/hora de la app. Los plazos de Moodle a medianoche (o de madrugada) cuentan como el final del día anterior. */
function when(start, tz) {
  const p = start.utc ? localParts(start.utc, tz) : { date: start.date, time: start.time ?? '' };
  if (!p.time) return { date: p.date, time: '' };
  if (p.time < '06:00') return { date: prevDay(p.date), time: '23:59' };
  return p;
}

/** Id fijo a partir del UID del evento: importar dos veces no duplica. */
export const icsId = (uid) => `ics_${uid.replace(/[^a-zA-Z0-9]/g, '_')}`;

/** 'INTRODUCCIÓN AL MÁRKETING (2627)-236_11_13_2627_A' → 'Introducción al márketing' */
export function subjectName(category) {
  const base = String(category || '').replace(/\s*\(\d{4}\).*$/, '').replace(/\.(?=\S)/g, '. ').replace(/\s+/g, ' ').trim();
  if (!base) return '';
  const lower = base === base.toUpperCase() ? base.toLowerCase() : base;
  return lower[0].toUpperCase() + lower.slice(1);
}

/** ¿Qué es el evento? Entrega (vencimiento/cierre), examen (por palabras clave) o nada (aperturas, etc.). */
export function classify(summary = '') {
  const m = /^(?:vencimiento|cierre) de\s+(.+)$/i.exec(summary);
  if (m) return { type: 'task', title: m[1].trim() };
  if (/^apertura de/i.test(summary)) return null;
  if (/\b(examen|parcial|prueba|test|control|cuestionario)\b/i.test(summary)) return { type: 'exam', title: summary.replace(/^(?:vencimiento|cierre) de\s+/i, '').trim() };
  return null;
}

/**
 * Qué hay que guardar (no guarda nada). Los registros nuevos van completos; los que ya existían, solo con lo que cambió
 * (así no se pisa el estado/progreso que hayas puesto tú). Lo que borraste a mano (settings.icsDismissed) no vuelve.
 */
export function planCalendarImport(state, events, { programId = null, makeId, now = Date.now() } = {}) {
  const tz = state.settings?.timezone || 'Europe/Madrid';
  const dismissed = new Set(state.settings?.icsDismissed ?? []);
  const today = localParts(new Date(now), tz).date;
  const oldest = new Date(Date.parse(`${today}T12:00:00Z`) - 30 * 864e5).toISOString().slice(0, 10);
  const subjects = [], tasks = [], exams = [];
  const allSubjects = [...state.subjects];
  let skipped = 0;

  const subjectId = (category) => {
    const name = subjectName(category);
    if (!name) return null;
    let s = allSubjects.find((x) => sameName(x.name, name));
    if (!s) {
      s = { id: makeId(), name, color: PALETTE[allSubjects.length % PALETTE.length], programId };
      allSubjects.push(s);
      subjects.push(s);
    }
    return s.id;
  };

  for (const ev of events) {
    const kind = classify(ev.summary);
    const id = icsId(ev.uid);
    if (!kind || dismissed.has(id)) { skipped++; continue; }
    const w = when(ev.start, tz);
    if (w.date < oldest) { skipped++; continue; }
    const existing = (kind.type === 'task' ? state.tasks : state.exams).find((x) => x.id === id);
    if (kind.type === 'task') {
      const fresh = { title: kind.title, due: w.date, time: w.time };
      if (!existing) tasks.push({ id, ...fresh, subjectId: subjectId(ev.category), status: 'pendiente', progress: 0, reminderDays: [...(state.settings?.reminderDays ?? [])], source: 'ics' });
      else if (existing.title !== fresh.title || existing.due !== fresh.due || (existing.time || '') !== fresh.time) tasks.push({ id, ...fresh });
      else skipped++;
    } else {
      const fresh = { topics: kind.title, date: w.date, time: w.time };
      if (!existing) exams.push({ id, ...fresh, subjectId: subjectId(ev.category), progress: 0, reminderDays: [...(state.settings?.reminderDays ?? [])], source: 'ics' });
      else if (existing.topics !== fresh.topics || existing.date !== fresh.date || (existing.time || '') !== fresh.time) exams.push({ id, ...fresh });
      else skipped++;
    }
  }
  return { subjects, tasks, exams, skipped };
}
