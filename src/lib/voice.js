// Asistente de voz: voz → texto (Groq Whisper, gratis; o el reconocimiento del navegador) → intención (IA) → acción.
import { askAI } from './ai.js';

const GROQ = 'https://api.groq.com/openai/v1/audio/transcriptions';

/** Audio grabado → texto con Whisper de Groq. */
export async function transcribe(blob, key) {
  const fd = new FormData();
  const ext = /mp4|aac/.test(blob.type) ? 'm4a' : /ogg/.test(blob.type) ? 'ogg' : 'webm';
  fd.append('file', blob, `voz.${ext}`);
  fd.append('model', 'whisper-large-v3-turbo');
  fd.append('language', 'es');
  fd.append('temperature', '0');
  let res;
  try { res = await fetch(GROQ, { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: fd }); }
  catch { throw new Error('No hay conexión. Revisa tu internet.'); }
  if (res.status === 401 || res.status === 403) throw new Error('Groq ha rechazado la clave. Revísala en Ajustes.');
  if (res.status === 429) throw new Error('Límite gratuito de Groq alcanzado. Espera un rato.');
  if (!res.ok) throw new Error(`Error al entender el audio (${res.status}).`);
  return ((await res.json()).text ?? '').trim();
}

export const hasSpeechApi = () => typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

const SYSTEM = `Eres el asistente de voz de Seiri, una agenda para estudiantes. Respondes SOLO con un objeto JSON, sin texto alrededor ni bloques de código.
Formato: {"action": "todo"|"task"|"exam"|"query"|"unknown", "title": string, "date": "YYYY-MM-DD"|null, "time": "HH:MM"|null, "subject": string|null, "answer": string}
- "todo": un pendiente del día a día (comprar, llamar, hacer algo). "task": una entrega de una asignatura. "exam": un examen (en "title" pon los temas, si los dice).
- "date": calcula la fecha real a partir de "hoy" que te doy. "el viernes" = el próximo viernes. Sin fecha dicha: null.
- "subject": la asignatura de la lista que más se parezca a lo que dice, o null.
- "query": preguntas sobre su agenda ("¿qué tengo mañana?"). Contesta en "answer" en español, breve y natural, usando SOLO los datos de la agenda que te doy. Si no hay nada, dilo.
- "unknown": si no es nada de lo anterior; en "answer" explica en una frase qué puede pedirte.
- Para todo, "answer" es una frase corta confirmando lo entendido (ej. "Entrega de Bases de Datos el viernes 14 a las 10:00").`;

function agendaText(state, today) {
  const sn = (id) => state.subjects.find((s) => s.id === id)?.name ?? '';
  const rows = [];
  (state.tasks ?? []).filter((t) => t.status !== 'entregado' && t.due >= today).forEach((t) => rows.push(`${t.due} ${t.time ?? ''} ENTREGA ${t.title} (${sn(t.subjectId)})`));
  (state.exams ?? []).filter((x) => x.date >= today).forEach((x) => rows.push(`${x.date} ${x.time ?? ''} EXAMEN ${sn(x.subjectId)} ${x.topics ?? ''}`));
  (state.todos ?? []).filter((t) => !t.done).forEach((t) => rows.push(`${t.date ?? 'sin fecha'} ${t.time ?? ''} PENDIENTE ${t.title}`));
  (state.classes ?? []).forEach((c) => rows.push(`CLASE semanal día ${c.weekday} ${c.start ?? ''}-${c.end ?? ''} ${sn(c.subjectId)}`));
  return rows.sort().slice(0, 80).join('\n') || '(vacía)';
}

/** Texto hablado → intención estructurada. */
export async function understand(text, state, keys, today, weekday) {
  const subjects = state.subjects.map((s) => s.name).join(', ') || '(ninguna)';
  const prompt = `Hoy es ${weekday} ${today}.\nAsignaturas: ${subjects}.\nAgenda:\n${agendaText(state, today)}\n\nLo que ha dicho: "${text}"`;
  const raw = await askAI({ geminiKey: keys.geminiKey, groqKey: keys.groqKey, system: SYSTEM, prompt });
  const m = String(raw).match(/\{[\s\S]*\}/);
  if (!m) throw new Error('No he entendido la respuesta. Prueba otra vez.');
  const r = JSON.parse(m[0]);
  const names = state.subjects;
  const found = r.subject && names.find((s) => s.name.toLowerCase() === String(r.subject).toLowerCase());
  return { action: r.action ?? 'unknown', title: r.title ?? '', date: /^\d{4}-\d{2}-\d{2}$/.test(r.date ?? '') ? r.date : null, time: /^\d{2}:\d{2}$/.test(r.time ?? '') ? r.time : '', subjectId: found?.id ?? null, subjectName: found?.name ?? '', answer: r.answer ?? '' };
}

/** Lee en voz alta (voz del dispositivo, gratis). */
export function speak(text) {
  try {
    if (!('speechSynthesis' in window) || !text) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-ES';
    speechSynthesis.speak(u);
  } catch { /* sin voz */ }
}
