// RESPALDO: envía los avisos que tocan. Lo ejecuta GitHub Actions cada 15 minutos (.github/workflows/reminders.yml).
// Si tu servidor puntual (scripts/daemon.mjs) está funcionando, ya habrá enviado los avisos a su hora y esto no repite nada:
// solo manda los que lleven más de GRACE_MINUTES de retraso (es decir, los que el servidor no pudo enviar).
//
// TEST_PUSH=true -> manda solo una notificación de prueba a todos los dispositivos.
import { dispatchDue } from '../src/lib/dispatch.js';
import { buildState, init, sendToAll } from './common.mjs';

const db = init();
const users = [];
for (const ref of await db.collection('users').listDocuments()) {
  const subs = (await ref.collection('push').get()).docs.map((d) => ({ ref: d.ref, ...d.data() }));
  if (!subs.length) continue;

  if (process.env.TEST_PUSH === 'true') {
    const ok = await sendToAll(subs, { title: 'Organiza', body: 'Prueba: si ves esto, los avisos funcionan ✅', tag: `test-${Date.now()}` });
    console.log(`Prueba a ${ref.id}: ${ok ? 'enviada' : 'no se pudo enviar'}`);
    continue;
  }
  const items = (await ref.collection('items').get()).docs.map((d) => d.data());
  const settings = await ref.collection('meta').doc('settings').get();
  const sentSnap = await ref.collection('sent').get();
  users.push({ id: ref.id, ref, subs, state: buildState(items, settings.exists ? settings.data().data : {}, subs), sent: new Set(sentSnap.docs.map((d) => d.id)), sentDocs: sentSnap.docs });
}

if (process.env.TEST_PUSH !== 'true') {
  const n = await dispatchDue({
    users,
    graceMinutes: Number(process.env.GRACE_MINUTES || 0),
    send: async (u, notification) => {
      const ok = await sendToAll(u.subs, notification);
      if (ok) console.log(`Enviado a ${u.id}: ${notification.title}`);
      return ok;
    },
    markSent: (u, key) => u.ref.collection('sent').doc(key).set({ at: Date.now() }),
  });
  // Limpieza: se olvidan los avisos de hace más de 60 días.
  const old = Date.now() - 60 * 24 * 3600 * 1000;
  await Promise.all(users.flatMap((u) => u.sentDocs.filter((d) => (d.data().at ?? 0) < old).map((d) => d.ref.delete())));
  console.log(`Listo. Avisos enviados: ${n}.`);
}
process.exit(0);
