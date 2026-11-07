// "Oye Seiri": escucha con el reconocimiento del navegador mientras la app está abierta. Solo en este dispositivo.
import { useSyncExternalStore } from 'react';

const KEY = 'seiri:wake';
const subs = new Set();
const read = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
let on = read();

export const wakeSupported = () => typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  && !/iPhone|iPad|iPod/.test(navigator.userAgent); // en iPhone no es fiable
export const setWake = (v) => { on = v; try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* nada */ } subs.forEach((f) => f()); };
export const useWake = () => useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => on);

// "Seiri" suena a Siri, Seri, Ceiri, Sairi, Seyri…
export const WAKE_RE = /\b(oye|hey|ey|eh|ok|hola)[,\s]+(seiri|seri|siri|ceiri|ceri|sairi|seyri|seirí|serí)\b/i;

/** Escucha sin parar y llama a onWake cuando oye la frase. Devuelve la función para parar. */
export function listenForWake(onWake) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let stopped = false; let rec = null; let fails = 0;
  const begin = () => {
    if (stopped) return;
    rec = new SR(); rec.lang = 'es-ES'; rec.continuous = true; rec.interimResults = true;
    rec.onresult = (e) => {
      const last = e.results[e.results.length - 1][0].transcript;
      if (WAKE_RE.test(last)) { stopped = true; try { rec.stop(); } catch { /* nada */ } onWake(); }
    };
    rec.onerror = (e) => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { stopped = true; setWake(false); } else fails++; };
    rec.onend = () => { if (!stopped) setTimeout(begin, fails > 5 ? 5000 : 300); }; // el navegador corta de vez en cuando: reiniciar
    try { rec.start(); } catch { /* ya activo */ }
  };
  begin();
  return () => { stopped = true; try { rec?.stop(); } catch { /* nada */ } };
}
