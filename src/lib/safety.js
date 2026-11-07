// Protección de datos en este dispositivo: almacenamiento persistente, copia espejo de las claves
// y copia de seguridad automática diaria (las últimas 5). Todo queda SOLO en este dispositivo.
const DB = 'seiri-safe';
const open = () => new Promise((res, rej) => {
  if (typeof indexedDB === 'undefined') return rej(new Error('sin IndexedDB'));
  const r = indexedDB.open(DB, 1);
  r.onupgradeneeded = () => { r.result.createObjectStore('kv'); };
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});
const tx = async (mode, fn) => {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction('kv', mode); const out = fn(t.objectStore('kv'));
    t.oncomplete = () => res(out?.result); t.onerror = () => rej(t.error);
  });
};
const put = (k, v) => tx('readwrite', (s) => s.put(v, k)).catch(() => {});
const get = (k) => tx('readonly', (s) => s.get(k)).catch(() => undefined);

/** Pide al navegador que no borre los datos de Seiri por falta de espacio o de uso. */
export const keepStorage = () => { try { navigator.storage?.persist?.(); } catch { /* nada */ } };

export const mirrorKeys = (keys) => put('keys', keys);
export const mirroredKeys = () => get('keys');

const day = () => new Date().toISOString().slice(0, 10);

/** Una copia por día con todos los datos y las claves; se conservan las últimas 5. */
export async function autoBackup(state, keys) {
  if (!state || (!state.tasks?.length && !state.exams?.length && !state.settings?.calendars?.length)) return; // no guardar copias vacías
  const list = (await get('backups')) ?? [];
  if (list[0]?.day === day()) list.shift(); // hoy ya había una: se renueva con lo último
  list.unshift({ day: day(), at: Date.now(), state, keys });
  await put('backups', list.slice(0, 5));
}
export const listBackups = async () => (await get('backups')) ?? [];
