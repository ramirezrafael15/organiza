// CAPA DE DATOS (fase 1: guardado local en el dispositivo).
//
// Toda la app habla con el repositorio solo a través de estos métodos:
//   getState() · subscribe(fn) · upsert(col, item) · remove(col, id) · replaceAll(state)
// En la fase 2 se creará otra clase con la MISMA interfaz que guarde en Firebase
// (Firestore ya trae modo offline y sincronización) y bastará con cambiarla en
// `src/data/repo.js`, sin tocar ninguna pantalla.

export const COLLECTIONS = ['programs', 'subjects', 'classes', 'events', 'exams', 'tasks', 'grades', 'notes'];

export const DEFAULT_SETTINGS = {
  // Avisos por defecto de cada examen/entrega: días antes (0 = el mismo día). Se usan en la fase 2.
  reminderDays: [7, 3, 1, 0],
  colorBy: 'tipo', // 'tipo' (examen, clase...) o 'estudios' (DAW, Marketing...)
  kindColors: {}, // colores elegidos por el usuario para cada tipo; vacío = los de por defecto
  notifyHour: 8, // hora (0-23) a la que llega el aviso diario al móvil
};

export const emptyState = () => ({
  ...Object.fromEntries(COLLECTIONS.map((c) => [c, []])),
  settings: { ...DEFAULT_SETTINGS },
});

export const newId = () =>
  (globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);

const STORAGE_KEY = 'organiza:data:v1';

/** localStorage si está disponible; si no (modo privado), memoria. */
function pickStorage() {
  try {
    const probe = '__organiza_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    const mem = new Map();
    return {
      getItem: (k) => mem.get(k) ?? null,
      setItem: (k, v) => mem.set(k, v),
      removeItem: (k) => mem.delete(k),
    };
  }
}

/** Asegura que el estado tiene todas las colecciones (por si viene de una versión anterior o de una importación). */
export function normalizeState(raw) {
  const base = emptyState();
  if (!raw || typeof raw !== 'object') return base;
  for (const c of COLLECTIONS) if (Array.isArray(raw[c])) base[c] = raw[c];
  base.settings = { ...base.settings, ...(raw.settings || {}) };
  return base;
}

export class LocalRepository {
  constructor(storage = pickStorage()) {
    this.storage = storage;
    this.listeners = new Set();
    this.state = this.#load();
  }

  #load() {
    try {
      return normalizeState(JSON.parse(this.storage.getItem(STORAGE_KEY)));
    } catch {
      return emptyState();
    }
  }

  #commit(next) {
    this.state = next; // siempre un objeto nuevo -> React detecta el cambio
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* almacenamiento lleno: la app sigue funcionando en memoria */
    }
    this.listeners.forEach((fn) => fn());
  }

  getState = () => this.state;

  subscribe = (fn) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  /** Crea (sin id) o actualiza (con id existente) un registro. Devuelve el registro guardado. */
  upsert(col, data) {
    const now = Date.now();
    const list = this.state[col];
    const idx = data.id ? list.findIndex((x) => x.id === data.id) : -1;
    const item =
      idx >= 0
        ? { ...list[idx], ...data, updatedAt: now }
        : { ...data, id: data.id ?? newId(), createdAt: now, updatedAt: now };
    const next = idx >= 0 ? list.map((x, i) => (i === idx ? item : x)) : [...list, item];
    this.#commit({ ...this.state, [col]: next });
    return item;
  }

  remove(col, id) {
    this.#commit({ ...this.state, [col]: this.state[col].filter((x) => x.id !== id) });
  }

  /** Sustituye todo (importar copia de seguridad, cargar ejemplos, borrar todo). */
  replaceAll(raw) {
    this.#commit(normalizeState(raw));
  }

  updateSettings(patch) {
    // updatedAt permite a la sincronización saber qué dispositivo cambió los ajustes el último.
    this.#commit({ ...this.state, settings: { ...this.state.settings, ...patch, updatedAt: Date.now() } });
  }

  // --- Usados solo por la sincronización: aplican lo que viene de la nube SIN cambiar updatedAt. ---
  putRaw(col, item) {
    const list = this.state[col];
    const idx = list.findIndex((x) => x.id === item.id);
    this.#commit({ ...this.state, [col]: idx >= 0 ? list.map((x, i) => (i === idx ? item : x)) : [...list, item] });
  }

  setSettingsRaw(settings) {
    this.#commit({ ...this.state, settings: { ...this.state.settings, ...settings } });
  }
}
