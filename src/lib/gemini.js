// Cliente mínimo de Gemini (clave gratuita de Google AI Studio). Todo desde el navegador.
const API = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL_KEY = 'organiza:gemini-model';

/** Modelos válidos, de mejor a peor: flash estables (más nuevo primero) y luego flash-lite. */
export function pickModels(models) {
  const names = (models ?? [])
    .filter((m) => (m.supportedGenerationMethods ?? []).includes('generateContent'))
    .map((m) => String(m.name).replace('models/', ''));
  const rank = (re) => names
    .map((n) => ({ n, v: re.exec(n) }))
    .filter((x) => x.v)
    .sort((a, b) => parseFloat(b.v[1]) - parseFloat(a.v[1]))
    .map((x) => x.n);
  return [...rank(/^gemini-(\d+(?:\.\d+)?)-flash$/), ...rank(/^gemini-(\d+(?:\.\d+)?)-flash-lite$/)];
}
export const pickModel = (models) => pickModels(models)[0] ?? null;

const friendly = (status, msg = '') => {
  if (status === 400 && /api key/i.test(msg)) return 'La clave de Gemini no es válida. Revísala en Ajustes.';
  if (status === 401 || status === 403) return 'Gemini ha rechazado la clave. Comprueba que está bien copiada y activa.';
  if (status === 429) return 'Has llegado al límite gratuito de Gemini por ahora. Espera un rato (o hasta mañana) y vuelve a probar.';
  if (status >= 500) return 'Gemini está saturado ahora mismo (le pasa a ratos en el plan gratis). Lo he reintentado varias veces: prueba otra vez en uno o dos minutos.';
  return `Error de Gemini (${status}). ${msg}`.trim();
};

async function call(url, key, init = {}) {
  let res;
  try {
    res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key, ...(init.headers ?? {}) } });
  } catch {
    throw new Error('No hay conexión con Gemini. Revisa tu internet.');
  }
  if (!res.ok) {
    let msg = '';
    try { msg = (await res.json())?.error?.message ?? ''; } catch { /* sin cuerpo */ }
    const e = new Error(friendly(res.status, msg));
    e.status = res.status;
    throw e;
  }
  return res.json();
}

async function resolveModels(key, force = false) {
  try { if (!force) { const c = JSON.parse(localStorage.getItem(MODEL_KEY) || 'null'); if (c?.length) return c; } } catch { /* sin almacenamiento */ }
  let names = [];
  try { names = pickModels((await call(`${API}/models?pageSize=100`, key)).models); } catch (e) { if (e.status) throw e; }
  if (!names.length) names = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
  try { localStorage.setItem(MODEL_KEY, JSON.stringify(names)); } catch { /* sin almacenamiento */ }
  return names;
}

/**
 * Pide algo a Gemini. `image` = { mimeType, data(base64) } opcional (foto, PDF...).
 * Si un modelo está saturado o sin cuota, prueba con el siguiente. Devuelve el texto.
 */
export async function askGemini({ key, system, prompt, image }) {
  if (!key) throw new Error('Falta la clave de Gemini. Ponla en Ajustes.');
  const body = JSON.stringify({
    systemInstruction: system ? { parts: [{ text: system }] } : undefined,
    contents: [{ role: 'user', parts: [{ text: prompt }, ...(image ? [{ inlineData: image }] : [])] }],
    generationConfig: { temperature: 0.4 },
  });
  let models = await resolveModels(key);
  let refreshed = false;
  let lastErr;
  for (let round = 0; round < 2; round++) {
    for (const model of models) {
      try {
        const data = await call(`${API}/models/${model}:generateContent`, key, { method: 'POST', body });
        const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('').trim();
        if (text) return text;
        lastErr = new Error('Gemini no ha devuelto nada. Prueba con otro texto.');
      } catch (e) {
        lastErr = e;
        if (e.status === 404 && !refreshed) { refreshed = true; models = await resolveModels(key, true); round = -1; break; }
        if (!(e.status >= 500 || e.status === 429 || e.status === 404)) throw e; // clave mala, etc.: no tiene sentido seguir
      }
    }
    if (round >= 0) await new Promise((r) => setTimeout(r, 2500));
  }
  throw lastErr;
}

export const SYSTEM = `Eres un asistente de estudio para un estudiante español. Responde siempre en español.
Devuelve SOLO un fragmento de HTML, sin markdown, sin \`\`\` y sin <html> ni <body>.
Etiquetas permitidas: h1, h2, h3, p, ul, ol, li, strong, em, u, mark, blockquote, table, tr, th, td, br, hr.
No inventes datos que no estén en el texto, salvo que se pida explícitamente. Corrige errores de redacción. Mantén los términos técnicos.`;

export const TASKS = {
  limpio: { label: 'Pasar a limpio', hint: 'Ordena el texto en apuntes con títulos y listas',
    prompt: 'Pasa a limpio estos apuntes: organízalos con títulos (h2/h3), párrafos claros, listas y negritas en los conceptos clave. Conserva toda la información y no añadas nada nuevo.' },
  resumen: { label: 'Resumir', hint: 'Un resumen corto de lo importante',
    prompt: 'Haz un resumen claro y breve (máximo 10-12 líneas) de este texto con un título h2 "Resumen" y las ideas clave en negrita.' },
  esquema: { label: 'Esquema', hint: 'Esquema con apartados y puntos',
    prompt: 'Haz un esquema jerárquico de este texto con listas anidadas (ul/li): apartados principales y sus puntos clave en pocas palabras.' },
  preguntas: { label: 'Preguntas de examen', hint: 'Test de 8 preguntas con soluciones',
    prompt: 'Crea 8 preguntas tipo test sobre este contenido, cada una con 4 opciones (a, b, c, d) en una lista ol. Después añade un h3 "Soluciones" con la opción correcta de cada pregunta y una explicación de una línea.' },
  explicar: { label: 'Explicar', hint: 'Explica el texto de forma sencilla',
    prompt: 'Explica este texto de forma sencilla y clara, paso a paso, como a alguien que lo estudia por primera vez. Usa un ejemplo parecido al contexto del texto.' },
  mejorar: { label: 'Mejorar redacción', hint: 'Corrige y mejora el texto',
    prompt: 'Mejora la redacción de este texto: corrige faltas y frases torpes, mantén el significado, el tono y la primera persona si la hay.' },
  ampliar: { label: 'Ampliar', hint: 'Desarrolla más el contenido',
    prompt: 'Amplía este texto desarrollando mejor cada idea con explicaciones y algún ejemplo. Mantén la estructura.' },
};
