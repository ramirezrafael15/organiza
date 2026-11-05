// Claves de IA (Gemini / Groq): se guardan SOLO en este dispositivo, nunca en la nube,
// así ni el administrador ni nadie que acceda a la cuenta puede verlas.
import { useSyncExternalStore } from 'react';

const STORE = 'organiza:keys';
const NAMES = ['geminiKey', 'groqKey'];
const subs = new Set();
const read = () => { try { return JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch { return {}; } };
let snap = read();

export const getKeys = () => snap;
export function setKey(name, value) {
  snap = { ...snap, [name]: value || undefined };
  try { localStorage.setItem(STORE, JSON.stringify(snap)); } catch { /* sin almacenamiento */ }
  subs.forEach((fn) => fn());
}
export const useKeys = () => useSyncExternalStore((fn) => (subs.add(fn), () => subs.delete(fn)), getKeys);

/** Las claves que antes se sincronizaban con los ajustes pasan a este dispositivo y se borran de la nube. */
export function migrateKeysFromSettings(settings, updateSettings) {
  const clear = {};
  NAMES.forEach((n) => {
    if (settings?.[n]) {
      if (!snap[n]) setKey(n, settings[n]);
      clear[n] = '';
    }
  });
  if (Object.keys(clear).length) updateSettings(clear);
}
