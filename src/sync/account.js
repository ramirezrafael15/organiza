// Estado de la cuenta (sin sesión / con sesión) y arranque de la sincronización.
// Si la app no está configurada (src/sync/config.js vacío) no carga Firebase y todo sigue siendo local.
import { useSyncExternalStore } from 'react';
import { repo } from '../data/repo.js';
import { passwordProblem } from '../lib/password.js';
import { ADMIN_UID, isConfigured } from './config.js';
import { ensurePush } from './push.js';
import { SyncEngine } from './engine.js';

// access: unverified | checking | pending | rejected | error | ok  (ok = el equipo de Seiri ha aprobado la cuenta)
let state = { status: isConfigured() ? 'loading' : 'off', user: null, error: '', sync: {}, access: 'checking', isAdmin: false, requests: [], approved: [] }; // off | loading | out | in
const listeners = new Set();
const set = (patch) => {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn());
};

let fb = null;
let started = false;
let stopEngine = null;
let stopAccess = null;

// ¿Puede usar la app? Solo con el correo verificado y la cuenta aprobada (el administrador entra siempre).
const accessKey = (uid) => `organiza:access:${uid}`;
const wasOk = (uid) => { try { return localStorage.getItem(accessKey(uid)) === '1'; } catch { return false; } };
const rememberOk = (uid, ok) => { try { ok ? localStorage.setItem(accessKey(uid), '1') : localStorage.removeItem(accessKey(uid)); } catch { /* nada */ } };

function grant(user) {
  if (state.access === 'ok' && stopEngine) return;
  set({ access: 'ok' });
  startEngine(user);
  keepPushAlive(user.uid);
  fb.deleteCloudKeys(user.uid).catch(() => {});
}

function beginAccess(user) {
  stopAccess?.(); stopAccess = null;
  const off = [];
  stopAccess = () => off.forEach((f) => f());
  if (!user.emailVerified) { set({ access: 'unverified' }); return; }
  if (user.uid === ADMIN_UID) {
    grant(user);
    off.push(fb.watchRequests((requests) => set({ requests }), () => {}));
    off.push(fb.watchApprovedList((approved) => set({ approved }), () => {}));
    return;
  }
  let okNow = null; let reqStatus = null; // lo último que dijo la nube
  const refresh = () => {
    if (okNow === null) return;
    if (okNow) { grant(user); return; }
    stopEngine?.(); stopEngine = null;
    set({ access: reqStatus === 'rechazada' ? 'rejected' : 'pending' });
  };
  if (wasOk(user.uid)) grant(user); else set({ access: 'checking' }); // ya aceptada antes: abre aunque no haya internet
  off.push(fb.watchApproval(user.uid, (ok) => {
    okNow = ok; rememberOk(user.uid, ok); refresh();
    if (!ok) fb.ensureRequest(user.uid, user.email).catch(() => {});
  }, () => { if (state.access !== 'ok') set({ access: 'error' }); })); // no se puede comprobar: se avisa y se puede reintentar
  off.push(fb.watchRequest(user.uid, (status) => { reqStatus = status; refresh(); }, () => {}));
}

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
        stopAccess?.(); stopAccess = null;
        if (user) {
          set({ status: 'in', user: { uid: user.uid, email: user.email, emailVerified: user.emailVerified }, error: '', isAdmin: user.uid === ADMIN_UID, requests: [], approved: [] });
          beginAccess(user);
        } else {
          set({ status: 'out', user: null, access: 'checking', isAdmin: false });
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
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && state.user && state.access === 'ok') keepPushAlive(state.user.uid); });
  navigator.serviceWorker?.addEventListener('message', (e) => { if (e.data?.type === 'push-changed' && state.user && state.access === 'ok') keepPushAlive(state.user.uid, true); });
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
  refreshVerification: run(async () => {
    const r = await fb.refreshUser();
    set({ user: { ...state.user, emailVerified: r.emailVerified } });
    if (r.emailVerified) beginAccess({ uid: state.user.uid, email: state.user.email, emailVerified: true });
  }),
  /** Vuelve a comprobar el acceso (pantalla de espera). */
  recheck: () => { if (state.user) beginAccess(state.user); },
  /** Solo el administrador: aprobar, rechazar o quitar el acceso a una cuenta. */
  approve: run((uid, email) => fb.approveUser(uid, email)),
  reject: run((uid) => fb.rejectUser(uid)),
  revoke: run((uid) => fb.revokeUser(uid)),
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
