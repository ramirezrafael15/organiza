// Estado de la cuenta (sin sesión / con sesión) y arranque de la sincronización.
// Si la app no está configurada (src/sync/config.js vacío) no carga Firebase y todo sigue siendo local.
import { useSyncExternalStore } from 'react';
import { repo } from '../data/repo.js';
import { isConfigured } from './config.js';
import { SyncEngine } from './engine.js';

let state = { status: isConfigured() ? 'loading' : 'off', user: null, error: '' }; // off | loading | out | in
const listeners = new Set();
const set = (patch) => {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn());
};

let fb = null;
let started = false;
let stopEngine = null;

const MESSAGES = {
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/invalid-email': 'Ese correo no es válido.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese correo. Prueba a entrar.',
  'auth/weak-password': 'La contraseña es muy corta (mínimo 6 caracteres).',
  'auth/network-request-failed': 'Sin conexión. Inténtalo cuando tengas internet.',
  'auth/too-many-requests': 'Demasiados intentos. Espera un poco.',
  'auth/operation-not-allowed': 'En Firebase falta activar "Correo y contraseña" (ver README).',
};
const explain = (e) => MESSAGES[e?.code] ?? 'No se pudo completar. Inténtalo de nuevo.';

export function initAccount() {
  if (started || !isConfigured()) return;
  started = true;
  import('./firebase.js')
    .then((m) => {
      fb = m;
      m.onAuth((user) => {
        stopEngine?.();
        stopEngine = null;
        if (user) {
          const engine = new SyncEngine({
            repo, remote: m.createRemote(user.uid), storage: window.localStorage, storeKey: `organiza:synced:${user.uid}`,
          });
          stopEngine = engine.start();
          set({ status: 'in', user: { uid: user.uid, email: user.email }, error: '' });
        } else {
          set({ status: 'out', user: null });
        }
      });
    })
    .catch(() => set({ status: 'out', error: 'No se pudo cargar la sincronización.' }));
}

const run = (fn) => async (...args) => {
  set({ error: '' });
  try {
    await fn(...args);
    return true;
  } catch (e) {
    set({ error: explain(e) });
    return false;
  }
};

export const account = {
  signIn: run((email, pw) => fb.signIn(email, pw)),
  signUp: run((email, pw) => fb.signUp(email, pw)),
  signOut: run(() => fb.signOut()),
  reset: run((email) => fb.resetPassword(email)),
  firebase: () => fb,
};

export const useAccount = () =>
  useSyncExternalStore((fn) => (listeners.add(fn), () => listeners.delete(fn)), () => state);
