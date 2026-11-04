// Respaldo gratuito: Groq (API compatible con OpenAI). Solo texto.
const API = 'https://api.groq.com/openai/v1';
const MODEL_KEY = 'organiza:groq-models';

const friendly = (status, msg = '') => {
  if (status === 401 || status === 403) return 'Groq ha rechazado la clave. Revísala en Ajustes.';
  if (status === 429) return 'Has llegado al límite gratuito de Groq por ahora. Espera un rato.';
  if (status >= 500) return 'Groq está saturado ahora mismo.';
  return `Error de Groq (${status}). ${msg}`.trim();
};

/** Modelos de chat útiles, los grandes primero; fuera audio, guardas y similares. */
export function pickGroqModels(models) {
  const bad = /whisper|guard|tts|orpheus|playai|embed|vision-preview|distil/i;
  const ids = (models ?? []).map((m) => m.id).filter((id) => id && !bad.test(id));
  const score = (id) => (/120b|405b|70b|versatile/i.test(id) ? 0 : /32b|27b|scout|maverick|qwen/i.test(id) ? 1 : 2);
  return [...ids].sort((a, b) => score(a) - score(b));
}

async function call(path, key, init = {}) {
  let res;
  try {
    res = await fetch(`${API}${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, ...(init.headers ?? {}) } });
  } catch {
    throw new Error('No hay conexión con Groq. Revisa tu internet.');
  }
  if (!res.ok) {
    let msg = '';
    try { msg = (await res.json())?.error?.message ?? ''; } catch { /* sin cuerpo */ }
    const e = new Error(friendly(res.status, msg));
    e.status = res.status; e.detail = msg;
    throw e;
  }
  return res.json();
}

async function models(key, force = false) {
  try { if (!force) { const c = JSON.parse(localStorage.getItem(MODEL_KEY) || 'null'); if (c?.length) return c; } } catch { /* sin almacenamiento */ }
  let names = [];
  try { names = pickGroqModels((await call('/models', key)).data); } catch (e) { if (e.status) throw e; }
  if (!names.length) names = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
  try { localStorage.setItem(MODEL_KEY, JSON.stringify(names)); } catch { /* sin almacenamiento */ }
  return names;
}

export async function askGroq({ key, system, prompt }) {
  if (!key) throw new Error('Falta la clave de Groq.');
  let list = (await models(key)).slice(0, 5);
  let lastErr;
  for (const model of list) {
    try {
      const data = await call('/chat/completions', key, {
        method: 'POST',
        body: JSON.stringify({ model, temperature: 0.4, messages: [...(system ? [{ role: 'system', content: system }] : []), { role: 'user', content: prompt }] }),
      });
      const text = String(data.choices?.[0]?.message?.content ?? '').trim();
      if (text) {
        try { localStorage.setItem(MODEL_KEY, JSON.stringify([model, ...list.filter((m) => m !== model)])); } catch { /* sin almacenamiento */ }
        return text;
      }
    } catch (e) {
      lastErr = e;
      if (!(e.status >= 500 || e.status === 429 || e.status === 404 || e.status === 400)) break; // clave mala, etc.
    }
  }
  if (lastErr?.status) lastErr.message += ` [${lastErr.detail ? String(lastErr.detail).slice(0, 120) : lastErr.status}]`;
  throw lastErr ?? new Error('Groq no ha devuelto nada.');
}
