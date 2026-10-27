// Piezas compartidas por el servidor puntual (daemon.mjs) y el respaldo de GitHub (send-reminders.mjs).
import fs from 'node:fs';
import admin from 'firebase-admin';
import webpush from 'web-push';
import { COLLECTIONS, DEFAULT_SETTINGS, emptyState } from '../src/data/repository.js';

/** Conecta con Firebase y prepara Web Push. Credenciales por variables de entorno. */
export function init() {
  const { FIREBASE_SERVICE_ACCOUNT, FIREBASE_SERVICE_ACCOUNT_FILE, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, GITHUB_REPOSITORY } = process.env;
  const raw = FIREBASE_SERVICE_ACCOUNT || (FIREBASE_SERVICE_ACCOUNT_FILE && fs.readFileSync(FIREBASE_SERVICE_ACCOUNT_FILE, 'utf8'));
  if (!raw || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.error('Faltan credenciales: FIREBASE_SERVICE_ACCOUNT (o FIREBASE_SERVICE_ACCOUNT_FILE), VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY (ver README, fase 2).');
    process.exit(1);
  }
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
  webpush.setVapidDetails(VAPID_SUBJECT || (GITHUB_REPOSITORY ? `https://github.com/${GITHUB_REPOSITORY}` : 'https://example.com'), VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  return admin.firestore();
}

/** Manda el aviso a todos los dispositivos del usuario. Devuelve true si llegó a alguno. */
export async function sendToAll(subs, payload) {
  let delivered = false;
  for (const { ref, subscription } of subs) {
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: 6 * 3600, urgency: 'high' });
      delivered = true;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) await ref.delete(); // dispositivo dado de baja
      else console.warn(`  envío fallido (${e.statusCode ?? e.message})`);
    }
  }
  return delivered;
}

/** Estado de la app de un usuario a partir de sus documentos de Firestore. */
export function buildState(itemDocs, settingsData, subs) {
  const state = emptyState();
  for (const { col, id, data } of itemDocs) if (COLLECTIONS.includes(col)) state[col].push({ id, ...data });
  state.settings = { ...DEFAULT_SETTINGS, ...(settingsData || {}) };
  // Zona horaria: la de los ajustes o, si no hay, la del dispositivo que se suscribió.
  state.settings.timezone ||= subs.find((s) => s.tz)?.tz;
  return state;
}
