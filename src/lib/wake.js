// "Oye <palabra>": escucha con el reconocimiento del navegador mientras la app está abierta. Solo en este dispositivo.
import { useSyncExternalStore } from 'react';

const KEY = 'seiri:wake';
const subs = new Set();
const read = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
let on = read();

export const wakeSupported = () => typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  && !/iPhone|iPad|iPod/.test(navigator.userAgent); // en iPhone no es fiable
export const setWake = (v) => { on = v; try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* nada */ } subs.forEach((f) => f()); };
export const useWake = () => useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => on);

// La palabra para despertarlo es suya (por defecto "Nova"): "Seiri" se confundía con Siri del iPhone.
const WORD_KEY = 'seiri:wakeword';
export const DEFAULT_WORD = 'Nova';
const plain = (t) => String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9ñ ]/g, '').trim();
export const getWakeWord = () => { try { return localStorage.getItem(WORD_KEY) || DEFAULT_WORD; } catch { return DEFAULT_WORD; } };
export const setWakeWord = (w) => { try { localStorage.setItem(WORD_KEY, plain(w) ? w.trim() : DEFAULT_WORD); } catch { /* nada */ } subs.forEach((f) => f()); };
/** ¿Dice "oye/hey/ok/hola + palabra"? Sin tildes ni mayúsculas. */
export const heardWake = (text, word = getWakeWord()) => {
  const w = plain(word).replace(/ +/g, ' ');
  if (!w) return false;
  const esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');
  return new RegExp(`\\b(oye|hey|ey|ok|okay|hola)\\s+${esc}\\b`).test(plain(text));
};

/** Escucha sin parar y llama a onWake cuando oye la frase. Devuelve la función para parar. */
export function listenForWake(onWake) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let stopped = false; let rec = null; let fails = 0;
  const begin = () => {
    if (stopped) return;
    rec = new SR(); rec.lang = 'es-ES'; rec.continuous = true; rec.interimResults = true;
    rec.onresult = (e) => {
      const last = e.results[e.results.length - 1][0].transcript;
      if (heardWake(last)) { stopped = true; try { rec.stop(); } catch { /* nada */ } onWake(); }
    };
    rec.onerror = (e) => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { stopped = true; setWake(false); } else fails++; };
    rec.onend = () => { if (!stopped) setTimeout(begin, fails > 5 ? 5000 : 300); }; // el navegador corta de vez en cuando: reiniciar
    try { rec.start(); } catch { /* ya activo */ }
  };
  begin();
  return () => { stopped = true; try { rec?.stop(); } catch { /* nada */ } };
}
