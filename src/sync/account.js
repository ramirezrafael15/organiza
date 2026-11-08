// Estado de la cuenta (sin sesión / con sesión) y arranque de la sincronización.
// Si la app no está configurada (src/sync/config.js vacío) no carga Firebase y todo sigue siendo local.
import { useSyncExternalStore } from 'react';
import { repo } from '../data/repo.js';
import { passwordProblem } from '../lib/password.js';
import { isConfigured } from './config.js';
import { ensurePush } from './push.js';
import { SyncEngine } from './engine.js';

let state = { status: isConfigured() ? 'loading' : 'off', user: null, error: '', sync: {} }; // off | loading | out | in
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
  'auth/requires-recent-login': 'Por seguridad, cierra sesión, vuelve a entrar y repítelo.',
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
          startEngine(user);
          keepPushAlive(user.uid);
          set({ status: 'in', user: { uid: user.uid, email: user.email, emailVerified: user.emailVerified }, error: '' });
        } else {
          set({ status: 'out', user: null });
        }
      });
    })
    .catch(() => set({ status: 'out', error: 'No se pudo cargar la sincronización.' }));
}

// Notificaciones siempre activas: se comprueban al entrar, al volver a la app y cuando el sistema renueva la suscripción.
let lastPush = 0;
function keepPushAlive(uid, force = false) {
  if (!fb || (!force && Date.now() - lastPush < 30 * 60 * 1000)) return;
  lastPush = Date.now();
  ensurePush(uid, fb);
}
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && state.user) keepPushAlive(state.user.uid); });
  navigator.serviceWorker?.addEventListener('message', (e) => { if (e.data?.type === 'push-changed' && state.user) keepPushAlive(state.user.uid, true); });
}

function startEngine(user) {
  stopEngine?.();
  const engine = new SyncEngine({
    repo, remote: fb.createRemote(user.uid, (p) => set({ sync: { ...state.sync, ...p } })), storage: window.localStorage, storeKey: `organiza:synced:${user.uid}`,
  });
  stopEngine = engine.start();
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
  /** Pasa al servidor los próximos avisos del Pomodoro (si no hay sesión, no hace nada). */
  setFocusPlan: (events) => { if (fb && state.user) fb.setFocusPlan(state.user.uid, events).catch(() => {}); },
  signIn: run((email, pw) => fb.signIn(email, pw)),
  signUp: async (email, pw) => {
    const problem = passwordProblem(pw);
    if (problem) { set({ error: problem }); return false; }
    const ok = await run(() => fb.signUp(email, pw))();
    if (ok) fb.sendVerification().catch(() => {}); // correo para comprobar que el email es suyo
    return ok;
  },
  resendVerification: run(() => fb.sendVerification()),
  refreshVerification: run(async () => { const r = await fb.refreshUser(); set({ user: { ...state.user, emailVerified: r.emailVerified } }); }),
  /** Borra la cuenta y todo lo que hay en la nube (pide la contraseña). */
  deleteAccount: async (password) => {
    set({ error: '' });
    try {
      await fb.reauth(password);
      stopEngine?.(); stopEngine = null; // para que el borrado de la nube no borre también lo local
      try { await fb.wipeCloudAndDelete(); } catch (e) { startEngine({ uid: state.user.uid }); throw e; }
      return true;
    } catch (e) {
      set({ error: explain(e) });
      return false;
    }
  },
  signOut: run(() => fb.signOut()),
  reset: run((email) => fb.resetPassword(email)),
  firebase: () => fb,
};

export const useAccount = () =>
  useSyncExternalStore((fn) => (listeners.add(fn), () => listeners.delete(fn)), () => state);
