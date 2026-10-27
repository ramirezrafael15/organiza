// Notificaciones push en este dispositivo (Web Push estándar, funciona en iPhone y Windows).
// El servidor (GitHub Actions, ver scripts/send-reminders.mjs) manda los avisos aunque la app esté cerrada.
import { VAPID_PUBLIC_KEY } from './config.js';

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isInstalled = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;

/** 'ok' | 'ios-install' (en iPhone solo funciona con la app añadida a la pantalla de inicio) | 'unsupported' */
export function pushSupport() {
  if (isIOS() && !isInstalled()) return 'ios-install';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  return 'ok';
}

const toKey = (b64) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

/** Suscripción actual de este dispositivo, o null. */
export async function currentSubscription() {
  if (pushSupport() !== 'ok') return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

/** Pide permiso (hay que llamarlo desde un toque del usuario) y guarda la suscripción en la cuenta. */
export async function enablePush(uid, fb) {
  if (!VAPID_PUBLIC_KEY) return { ok: false, reason: 'config' };
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: permission };
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(VAPID_PUBLIC_KEY) }));
  await fb.savePushSubscription(uid, sub.toJSON(), Intl.DateTimeFormat().resolvedOptions().timeZone);
  return { ok: true };
}

export async function disablePush(uid, fb) {
  const sub = await currentSubscription();
  if (!sub) return;
  await fb.removePushSubscription(uid, sub.endpoint).catch(() => {});
  await sub.unsubscribe();
}

/** Muestra una notificación local para comprobar que el sistema deja mostrarlas. */
export async function localTest() {
  const reg = await navigator.serviceWorker.ready;
  await reg.showNotification('Organiza', { body: 'Así se verán tus avisos ✅', icon: `${import.meta.env.BASE_URL}icons/icon-192.png` });
}
