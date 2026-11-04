// Punto único de IA: Gemini primero (lee PDF y fotos) y, si falla, Groq como respaldo (solo texto).
import { askGemini } from './gemini.js';
import { askGroq } from './groq.js';

export async function askAI({ geminiKey, groqKey, system, prompt, image }) {
  const textOnly = !image || image.mimeType === 'text/plain';
  const groqPrompt = image?.mimeType === 'text/plain' ? `${prompt}\n\nARCHIVO ADJUNTO:\n${decodeURIComponent(escape(atob(image.data)))}` : prompt;
  const viaGroq = () => askGroq({ key: groqKey, system, prompt: groqPrompt });

  if (!geminiKey) {
    if (!groqKey) throw new Error('Falta la clave de IA. Ponla en Ajustes.');
    if (!textOnly) throw new Error('Groq no lee PDF ni fotos. Añade una clave de Gemini en Ajustes para eso.');
    return viaGroq();
  }
  try {
    return await askGemini({ key: geminiKey, system, prompt, image });
  } catch (e) {
    if (!groqKey) throw e;
    if (e.status === 400 || e.status === 401 || e.status === 403) {
      // Clave de Gemini mala: no es culpa de la saturación, pero con Groq se puede seguir si es texto.
      if (!textOnly) throw e;
    } else if (!textOnly) {
      e.message += ' (Groq no lee PDF ni fotos, por eso no he podido usar el respaldo.)';
      throw e;
    }
    try { return await viaGroq(); }
    catch (e2) { throw new Error(`${e.message}\nRespaldo Groq: ${e2.message}`); }
  }
}
