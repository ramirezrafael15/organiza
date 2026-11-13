// Asistente de chat de Seiri (fase 1): prompt, límites y montaje de la conversación. Lógica pura, sin red ni React.
export const MAX_CHARS = 500;          // largo máximo de un mensaje del usuario
export const MAX_TURNS = 8;            // cuántos mensajes anteriores se reenvían a la IA
export const RATE = { max: 20, perMs: 10 * 60 * 1000 }; // 20 mensajes cada 10 minutos

export const SYSTEM = `Eres Seiri, el asistente de una agenda para estudiantes. Eres un coach de estudio: guías y organizas, no haces los trabajos del usuario.
- Habla en español, tono cercano, directo y breve. Sin rollos largos.
- Usa SOLO los datos que te llegan en el contexto. Si falta información, pregúntala en vez de inventarla.
- No prometas nada que no puedas hacer. Por ahora solo puedes conversar y dar consejos; todavía no puedes crear ni cambiar cosas en la app.`;

/** Recorta un texto al máximo permitido. */
export const clip = (text, max = MAX_CHARS) => String(text ?? '').trim().slice(0, max);

/** ¿Puede enviar otro mensaje? `times` = marcas de tiempo (ms) de los envíos anteriores. */
export function rateCheck(times, now = Date.now(), { max, perMs } = RATE) {
  const recent = times.filter((t) => now - t < perMs);
  if (recent.length >= max) {
    const wait = Math.ceil((perMs - (now - recent[0])) / 60000);
    return { ok: false, recent, wait };
  }
  return { ok: true, recent };
}

/** Texto único para la IA: sección actual + últimos mensajes + el nuevo. `history` = [{ role: 'user'|'ai', text }] sin el nuevo. */
export function buildPrompt({ history, section, text }) {
  const past = history.filter((m) => !m.error).slice(-MAX_TURNS)
    .map((m) => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${clip(m.text, 700)}`).join('\n');
  return `Sección en la que está el usuario: ${section}.${past ? `\n\nConversación hasta ahora:\n${past}` : ''}\n\nUsuario: ${clip(text)}\n\nResponde como Asistente.`;
}
