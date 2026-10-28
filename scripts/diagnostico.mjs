// Diagnóstico: muestra lo que ve el servidor en Firestore y qué avisaría ahora mismo.
// Uso (en el servidor): sudo -u organiza node --env-file=/etc/organiza-avisos.env scripts/diagnostico.mjs
import { planNotifications } from '../src/lib/notify.js';
import { buildState, init } from './common.mjs';

const db = init();
for (const ref of await db.collection('users').listDocuments()) {
  const [items, push, sent, st] = await Promise.all([
    ref.collection('items').get(), ref.collection('push').get(), ref.collection('sent').get(), ref.collection('meta').doc('settings').get(),
  ]);
  console.log(`\n== Usuario ${ref.id}`);
  console.log(`Dispositivos con avisos: ${push.size}`, push.docs.map((d) => d.data().tz));
  console.log('Ajustes:', JSON.stringify(st.exists ? st.data().data : null));
  console.log(`Elementos: ${items.size}`);
  for (const d of items.docs) {
    const { col, data } = d.data();
    if (['exams', 'tasks', 'events'].includes(col))
      console.log(` - ${col}: ${(data.title ?? data.subjectId ?? '').toString().slice(0, 28)} | ${data.date ?? data.due} | avisos ${JSON.stringify(data.reminderDays)} | hora ${data.reminderTime ?? '(sin)'} | subido ${new Date(d.data().updatedAt).toLocaleString('es-ES')}`);
  }
  console.log('Ya enviados:', sent.docs.map((d) => d.id).slice(-8));
  const state = buildState(items.docs.map((d) => d.data()), st.exists ? st.data().data : {}, push.docs.map((d) => d.data()));
  console.log('Tocaría enviar ahora:', JSON.stringify(planNotifications({ state, now: new Date(), sent: new Set(sent.docs.map((d) => d.id)) }), null, 1));
}
process.exit(0);
