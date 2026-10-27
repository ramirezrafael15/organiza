import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalRepository } from '../data/repository.js';
import { SyncEngine } from './engine.js';

const memory = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) };
};

/** Nube falsa en memoria: igual que Firestore, avisa a todos (también a quien escribe). */
function fakeCloud() {
  const docs = new Map(); // 'col/id' -> { col, id, data, updatedAt }
  const clients = new Set();
  let settings = null;
  const send = (fn) => clients.forEach(fn);
  return {
    docs,
    clients,
    remote() {
      const me = {};
      const api = {
        listen(onItems, onSettings) {
          Object.assign(me, { onItems, onSettings });
          clients.add(me);
          onItems({ upserts: [...docs.values()], removed: [], allKeys: [...docs.keys()], fromCache: false });
          if (settings) onSettings(settings);
          return () => clients.delete(me);
        },
        set(col, id, data, updatedAt) {
          const doc = { col, id, data, updatedAt };
          docs.set(`${col}/${id}`, doc);
          send((c) => c.onItems({ upserts: [doc], removed: [], allKeys: [...docs.keys()], fromCache: false }));
        },
        remove(col, id) {
          docs.delete(`${col}/${id}`);
          send((c) => c.onItems({ upserts: [], removed: [{ col, id }], allKeys: [...docs.keys()], fromCache: false }));
        },
        setSettings(data, updatedAt) {
          settings = { data, updatedAt };
          send((c) => c.onSettings(settings));
        },
      };
      return api;
    },
  };
}

const device = (cloud, repo = new LocalRepository(memory())) => {
  const engine = new SyncEngine({ repo, remote: cloud.remote(), storage: memory(), storeKey: 'k' });
  engine.start();
  return repo;
};

let t = 1000;
beforeEach(() => { vi.useFakeTimers(); t += 1000; vi.setSystemTime(t); });
afterEach(() => vi.useRealTimers());
const tick = () => { t += 1000; vi.setSystemTime(t); };

describe('sincronización', () => {
  it('lo que creas en un dispositivo aparece en el otro', () => {
    const cloud = fakeCloud();
    const a = device(cloud), b = device(cloud);
    a.upsert('exams', { id: 'x1', date: '2026-11-03' });
    expect(b.getState().exams.map((x) => x.id)).toEqual(['x1']);
  });

  it('gana el cambio más reciente y se propaga', () => {
    const cloud = fakeCloud();
    const a = device(cloud), b = device(cloud);
    a.upsert('tasks', { id: 't1', title: 'Viejo' });
    tick();
    b.upsert('tasks', { id: 't1', title: 'Nuevo' });
    expect(a.getState().tasks[0].title).toBe('Nuevo');
    expect(b.getState().tasks[0].title).toBe('Nuevo');
  });

  it('borrar en un dispositivo lo borra en el otro', () => {
    const cloud = fakeCloud();
    const a = device(cloud), b = device(cloud);
    a.upsert('notes', { id: 'n1', title: 'x' });
    tick();
    a.remove('notes', 'n1');
    expect(b.getState().notes).toHaveLength(0);
    expect(cloud.docs.size).toBe(0);
  });

  it('un dispositivo nuevo sube sus datos si la nube está vacía', () => {
    const cloud = fakeCloud();
    const repo = new LocalRepository(memory());
    repo.upsert('subjects', { id: 's1', name: 'BD' });
    device(cloud, repo);
    expect(cloud.docs.has('subjects/s1')).toBe(true);
  });

  it('no pisa con datos viejos lo que ya hay más nuevo en la nube', () => {
    const cloud = fakeCloud();
    const a = device(cloud);
    a.upsert('exams', { id: 'x1', topics: 'nuevo' });
    tick();
    const old = new LocalRepository(memory());
    old.putRaw('exams', { id: 'x1', topics: 'viejo', updatedAt: 5 }); // copia local antigua
    device(cloud, old);
    expect(old.getState().exams[0].topics).toBe('nuevo');
    expect(cloud.docs.get('exams/x1').data.topics).toBe('nuevo');
  });

  it('un registro subido antes que otro dispositivo borró desaparece al reconectar', () => {
    const cloud = fakeCloud();
    const storage = memory();
    const repo = new LocalRepository(memory());
    const e1 = new SyncEngine({ repo, remote: cloud.remote(), storage, storeKey: 'k' });
    const stop = e1.start();
    repo.upsert('events', { id: 'e1', title: 'Cita' });
    stop(); // este dispositivo se queda sin conexión
    cloud.docs.delete('events/e1'); // mientras tanto otro dispositivo lo borra
    new SyncEngine({ repo, remote: cloud.remote(), storage, storeKey: 'k' }).start();
    expect(repo.getState().events).toHaveLength(0);
  });

  it('no sube nada hasta que la nube responde de verdad (solo caché)', () => {
    const sets = [];
    let emit;
    const remote = {
      listen(onItems) { emit = onItems; return () => {}; },
      set: (...args) => sets.push(args), remove() {}, setSettings() {},
    };
    const repo = new LocalRepository(memory());
    repo.upsert('exams', { id: 'x1' });
    new SyncEngine({ repo, remote, storage: memory(), storeKey: 'k' }).start();
    emit({ upserts: [], removed: [], allKeys: [], fromCache: true });
    expect(sets).toHaveLength(0);
    emit({ upserts: [], removed: [], allKeys: [], fromCache: false });
    expect(sets).toHaveLength(1);
  });

  it('los ajustes también se sincronizan (hora del aviso)', () => {
    const cloud = fakeCloud();
    const a = device(cloud), b = device(cloud);
    a.updateSettings({ notifyHour: 7 });
    expect(b.getState().settings.notifyHour).toBe(7);
  });
});
