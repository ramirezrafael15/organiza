// Horario desde foto o PDF: la IA lo convierte al JSON de scheduleImport.js y el usuario lo revisa antes de guardar.
import { norm } from './scheduleImport.js';

export const SCHEDULE_SYSTEM = `Eres un lector de horarios de clase. Respondes SOLO con un objeto JSON válido, sin texto alrededor ni bloques de código.
Formato exacto: {"classes":[{"title": string, "subject": string, "weekdays": number[], "start": "HH:MM", "end": "HH:MM", "place": string}]}
- weekdays: 0 = lunes, 1 = martes, 2 = miércoles, 3 = jueves, 4 = viernes (5 = sábado, 6 = domingo solo si aparece).
- Una entrada por cada franja distinta. Si la misma asignatura tiene la misma hora varios días, un solo objeto con varios weekdays.
- Horas en formato 24 h con dos dígitos (17:30). Si una hora no se lee con claridad, no inventes la clase.
- "title" y "subject" = nombre de la asignatura tal como aparece. "place" = aula o vacío "".
- No inventes nada que no esté en el archivo.`;

export const SCHEDULE_PROMPT = 'Lee el horario del archivo adjunto y devuélvelo en el formato indicado.';

const TIME = /^([01]?\d|2[0-3]):([0-5]\d)$/;
const pad = (t) => { const m = TIME.exec(String(t).trim()); return m ? `${m[1].padStart(2, '0')}:${m[2]}` : null; };
const DAYS = { lunes: 0, martes: 1, miercoles: 2, jueves: 3, viernes: 4, sabado: 5, domingo: 6 };

/** Saca el JSON de la respuesta de la IA aunque venga con ```json o texto alrededor. */
export function extractJson(text) {
  const s = String(text ?? '').replace(/```(?:json)?/gi, '');
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('La IA no ha devuelto un horario legible. Prueba con otra foto o más nítida.');
  try { return JSON.parse(s.slice(a, b + 1)); }
  catch { throw new Error('La IA no ha devuelto un horario legible. Prueba con otra foto o más nítida.'); }
}

/** Limpia y valida lo que devuelve la IA. Descarta clases sin título, hora válida o días. */
export function normalizeSchedule(raw) {
  const out = [];
  for (const c of raw?.classes ?? []) {
    const title = String(c?.title ?? c?.subject ?? '').trim();
    const start = pad(c?.start), end = pad(c?.end);
    const weekdays = [...new Set((Array.isArray(c?.weekdays) ? c.weekdays : [c?.weekdays]).map((d) => (typeof d === 'string' ? DAYS[norm(d)] : Number(d))).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
    if (!title || !start || !end || !weekdays.length || end <= start) continue;
    out.push({ title, subject: String(c?.subject ?? title).trim(), weekdays, start, end, place: String(c?.place ?? '').trim() });
  }
  return out;
}

/** Del listado editado + estudios elegidos → el archivo que entiende planScheduleImport. */
export function toScheduleFile(rows, programName) {
  const classes = rows.map(({ title, subject, weekdays, start, end, place }) => ({ title: title.trim(), subject: (subject || title).trim(), weekdays, start, end, place }));
  const subjects = [...new Map(classes.map((c) => [norm(c.subject), { name: c.subject, program: programName || undefined }])).values()];
  return { programs: programName ? [{ name: programName }] : [], subjects, classes };
}
