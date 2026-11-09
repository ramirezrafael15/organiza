// Conexión con Firebase (cuenta + base de datos). Se carga solo si la app está configurada.
import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword, deleteUser, EmailAuthProvider, getAuth, onAuthStateChanged,
  reauthenticateWithCredential, sendEmailVerification, sendPasswordResetEmail,
  signInWithEmailAndPassword, signOut as fbSignOut,
} from 'firebase/auth';
import {
  collection, deleteDoc, doc, getDocs, initializeFirestore, memoryLocalCache, onSnapshot, setDoc, writeBatch,
} from 'firebase/firestore';
import { firebaseConfig } from './config.js';

let cached;
function services() {
  if (!cached) {
    const app = initializeApp(firebaseConfig);
    cached = {
      auth: getAuth(app),
            db: initializeFirestore(app, {
        // Sin caché en disco: la app ya guarda todo en el propio dispositivo y la caché de Safari se cuelga a veces.
        localCache: memoryLocalCache(),
        // Conexión compatible: en iPhone/Safari la normal (WebChannel) a veces no llega a conectar.
        experimentalForceLongPolling: true,
      }),
    };
  }
  return cached;
}

// ---- cuenta ----
export const onAuth = (fn) => onAuthStateChanged(services().auth, fn);
export const signIn = (email, password) => signInWithEmailAndPassword(services().auth, email, password);
export const signUp = (email, password) => createUserWithEmailAndPassword(services().auth, email, password);
export const signOut = () => fbSignOut(services().auth);
export const resetPassword = (email) => sendPasswordResetEmail(services().auth, email);
export const sendVerification = () => sendEmailVerification(services().auth.currentUser);

/** Vuelve a leer la cuenta (¿ya verificó el correo?) y renueva el permiso para que las reglas lo vean. */
export async function refreshUser() {
  const u = services().auth.currentUser;
  await u.reload();
  await u.getIdToken(true);
  return { emailVerified: u.emailVerified };
}

export async function reauth(password) {
  const u = services().auth.currentUser;
  await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, password));
}

/** Borra todo lo que hay en la nube de esta cuenta y después la cuenta. */
export async function wipeCloudAndDelete() {
  const { auth, db } = services();
  const user = auth.currentUser;
  for (const sub of ['items', 'push', 'sent', 'meta']) {
    const snap = await getDocs(collection(db, 'users', user.uid, sub));
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = writeBatch(db);
      snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }
  await deleteUser(user);
}

// Firestore no admite `undefined`: se limpia antes de guardar.
const clean = (obj) => JSON.parse(JSON.stringify(obj));

/** Adaptador de la nube para el motor de sincronización (ver engine.js). Todo cuelga de users/{uid}. */
export function createRemote(uid, onStatus = () => {}) {
  const { db } = services();
  const items = collection(db, 'users', uid, 'items');
  const settingsDoc = doc(db, 'users', uid, 'meta', 'settings');
  const docId = (col, id) => `${col}__${id}`;
  const warn = (e) => { console.warn('[sync]', e); onStatus({ error: e?.code || e?.message || 'error', pending: 0 }); };
  let pending = 0;
  const track = (p) => {
    onStatus({ pending: ++pending });
    return p.then(() => onStatus({ pending: --pending, lastOk: Date.now(), error: '' })).catch((e) => { pending--; warn(e); });
  };

  return {
    listen(onItems, onSettings) {
      const stopItems = onSnapshot(items, (snap) => {
        const upserts = [];
        const removed = [];
        snap.docChanges().forEach((ch) => {
          const d = ch.doc.data();
          if (ch.type === 'removed') removed.push({ col: d.col, id: d.id });
          else upserts.push({ col: d.col, id: d.id, data: d.data, updatedAt: d.updatedAt });
        });
        const allKeys = snap.docs.map((x) => `${x.data().col}/${x.data().id}`);
        onStatus({ fromCache: snap.metadata.fromCache, ...(snap.metadata.fromCache ? {} : { lastRead: Date.now() }) });
        onItems({ upserts, removed, allKeys, fromCache: snap.metadata.fromCache });
      }, warn);
      const stopSettings = onSnapshot(settingsDoc, (s) => {
        if (s.exists()) onSettings(s.data());
      }, warn);
      return () => { stopItems(); stopSettings(); };
    },
    set: (col, id, data, updatedAt) => track(setDoc(doc(items, docId(col, id)), { col, id, data: clean(data), updatedAt })),
    remove: (col, id) => track(deleteDoc(doc(items, docId(col, id)))),
    // merge: solo se tocan los campos enviados; así un dispositivo con datos viejos no borra los de otro (calendarios, etc.)
    setSettings: (data, updatedAt) => track(setDoc(settingsDoc, { data: clean(data), updatedAt }, { merge: true })),
  };
}

// ---- notificaciones push: cada dispositivo guarda su "suscripción" para que el servidor le escriba ----
const subId = (endpoint) => btoa(endpoint).replace(/[^a-zA-Z0-9]/g, '').slice(-48);

export const savePushSubscription = (uid, subscription, tz) =>
  setDoc(doc(services().db, 'users', uid, 'push', subId(subscription.endpoint)), {
    subscription: clean(subscription), tz, createdAt: Date.now(),
  });

export const removePushSubscription = (uid, endpoint) =>
  deleteDoc(doc(services().db, 'users', uid, 'push', subId(endpoint)));

/** Avisos del temporizador de estudio que el servidor debe mandar aunque la app esté cerrada. [] = ninguno. */
export const setFocusPlan = (uid, events) =>
  setDoc(doc(services().db, 'users', uid, 'focus', 'plan'), { events: clean(events), updatedAt: Date.now() });

/** Borra la copia de claves que una versión anterior pudo subir a la cuenta: las claves viven solo en el dispositivo. */
export const deleteCloudKeys = (uid) => deleteDoc(doc(services().db, 'users', uid, 'private', 'keys'));
