// Claves de IA (Gemini / Groq): se guardan SOLO en este dispositivo, nunca en la nube,
// así ni el administrador ni nadie que acceda a la cuenta puede verlas.
import { useSyncExternalStore } from 'react';
import { mirrorKeys, mirroredKeys } from './safety.js';

const STORE = 'organiza:keys';
const NAMES = ['geminiKey', 'groqKey'];
const subs = new Set();
const read = () => { try { return JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch { return {}; } };
let snap = read();

export const getKeys = () => snap;
export function setKey(name, value) {
  snap = { ...snap, [name]: value || undefined };
  try { localStorage.setItem(STORE, JSON.stringify(snap)); } catch { /* sin almacenamiento */ }
  mirrorKeys(snap); // copia espejo por si el navegador vacía el almacenamiento normal
  subs.forEach((fn) => fn());
}

/** Si las claves han desaparecido del almacenamiento normal pero hay copia espejo, las recupera. */
export async function restoreKeysIfMissing() {
  if (NAMES.some((n) => snap[n])) return false;
  const m = await mirroredKeys();
  if (!m || !NAMES.some((n) => m[n])) return false;
  NAMES.forEach((n) => { if (m[n]) snap = { ...snap, [n]: m[n] }; });
  try { localStorage.setItem(STORE, JSON.stringify(snap)); } catch { /* nada */ }
  subs.forEach((fn) => fn());
  return true;
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
