// MOTOR DE SINCRONIZACIÓN entre dispositivos.
//
// El repositorio local (localStorage) sigue siendo lo que usa la app (rápido y sin conexión).
// Este motor lo refleja en la nube (Firestore) y trae los cambios de los demás dispositivos.
// Es lógica pura: la nube se le pasa como `remote` (ver remote.firebase.js), así se puede probar sin red.
//
// remote = {
//   listen(onItems, onSettings) -> unsubscribe
//     onItems({ upserts: [{ col, id, data, updatedAt }], removed: [{ col, id }], allKeys: ['col/id', ...], fromCache })
//     onSettings({ data, updatedAt })
//   set(col, id, data, updatedAt) · remove(col, id) · setSettings(data, updatedAt)
// }
//
// Reglas:
//  - Gana el cambio más reciente (updatedAt).
//  - No se sube nada hasta que la nube ha respondido de verdad (no solo su caché), para no pisar cambios nuevos con datos viejos.
//  - Si un registro desaparece de la nube y este dispositivo ya lo había subido antes, otro dispositivo lo borró: se borra aquí.
import { COLLECTIONS } from '../data/repository.js';

const keyOf = (col, id) => `${col}/${id}`;

export class SyncEngine {
  /**
   * @param repo      LocalRepository
   * @param remote    adaptador de la nube
   * @param storage   dónde recordar qué registros ya se subieron ({ getItem, setItem })
   * @param storeKey  clave para ese recuerdo (distinta por usuario)
   */
  constructor({ repo, remote, storage, storeKey }) {
    this.repo = repo;
    this.remote = remote;
    this.storage = storage;
    this.storeKey = storeKey;
    this.remoteUpdated = new Map(); // key -> updatedAt que hay en la nube
    this.pushed = this.#loadPushed(); // registros que este dispositivo ya subió alguna vez
    this.reconciled = false; // ya se comparó contra la nube de verdad
    this.applying = false; // true mientras se aplican cambios que vienen de la nube
    this.settingsRemoteAt = 0;
    this.prev = this.#index(repo.getState());
    this.stops = [];
  }

  start() {
    this.stops.push(this.remote.listen((s) => this.#onItems(s), (s) => this.#onSettings(s)));
    this.stops.push(this.repo.subscribe(() => !this.applying && this.#onLocal()));
    return () => this.stop();
  }

  stop() {
    this.stops.forEach((fn) => fn?.());
    this.stops = [];
  }

  // ---------- utilidades ----------
  #loadPushed() {
    try {
      return new Set(JSON.parse(this.storage.getItem(this.storeKey) || '[]'));
    } catch {
      return new Set();
    }
  }
  #savePushed() {
    try {
      this.storage.setItem(this.storeKey, JSON.stringify([...this.pushed]));
    } catch {
      /* sin almacenamiento: no pasa nada grave */
    }
  }
  #index(state) {
    const map = new Map();
    for (const col of COLLECTIONS) for (const item of state[col]) map.set(keyOf(col, item.id), { col, item });
    return map;
  }

  // ---------- de la nube a este dispositivo ----------
  #onItems({ upserts = [], removed = [], allKeys = [], fromCache = false }) {
    this.applying = true;
    try {
      const local = this.#index(this.repo.getState());

      for (const { col, id, data, updatedAt } of upserts) {
        const key = keyOf(col, id);
        this.remoteUpdated.set(key, updatedAt);
        this.pushed.add(key);
        const mine = local.get(key)?.item;
        if (!mine || (mine.updatedAt ?? 0) < updatedAt) this.repo.putRaw(col, { ...data, id, updatedAt });
      }
      for (const { col, id } of removed) {
        const key = keyOf(col, id);
        this.remoteUpdated.delete(key);
        this.pushed.delete(key);
        if (local.has(key)) this.repo.remove(col, id);
      }

      // Primera respuesta real de la nube: lo que ya subí y ya no está allí lo borró otro dispositivo.
      if (!fromCache && !this.reconciled) {
        this.reconciled = true;
        const inCloud = new Set(allKeys);
        for (const [key, { col, item }] of this.#index(this.repo.getState())) {
          if (!inCloud.has(key) && this.pushed.has(key)) {
            this.repo.remove(col, item.id);
            this.pushed.delete(key);
            this.remoteUpdated.delete(key);
          }
        }
      }
    } finally {
      this.applying = false;
    }
    this.prev = this.#index(this.repo.getState());
    this.#savePushed();
    this.#onLocal(); // sube lo local que sea más nuevo (o que la nube no tenga)
  }

  #onSettings({ data, updatedAt }) {
    if (!(updatedAt > this.settingsRemoteAt)) return;
    this.settingsRemoteAt = updatedAt;
    if ((this.repo.getState().settings.updatedAt ?? 0) < updatedAt) {
      this.applying = true;
      try {
        this.repo.setSettingsRaw({ ...data, updatedAt });
      } finally {
        this.applying = false;
      }
    }
  }

  // ---------- de este dispositivo a la nube ----------
  #onLocal() {
    if (!this.reconciled) return;
    const state = this.repo.getState();
    const now = this.#index(state);

    for (const [key, { col, item }] of now) {
      const stamp = item.updatedAt ?? 0;
      if (this.remoteUpdated.get(key) === stamp) continue; // ya está igual en la nube
      const { id, ...data } = item;
      this.remote.set(col, id, data, stamp);
      this.remoteUpdated.set(key, stamp);
      this.pushed.add(key);
    }
    for (const [key, { col, item }] of this.prev) {
      if (!now.has(key)) {
        this.remote.remove(col, item.id);
        this.remoteUpdated.delete(key);
        this.pushed.delete(key);
      }
    }

    const s = state.settings;
    if (s.updatedAt && s.updatedAt > this.settingsRemoteAt) {
      const { updatedAt, ...data } = s;
      this.remote.setSettings(data, updatedAt);
      this.settingsRemoteAt = updatedAt;
    }
    this.prev = now;
    this.#savePushed();
  }
}
