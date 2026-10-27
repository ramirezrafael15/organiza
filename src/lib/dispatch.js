// Reparte los avisos que tocan ahora. Lo usan el servidor puntual (scripts/daemon.mjs) y el respaldo de GitHub.
// Es lógica pura con funciones inyectadas (send / markSent), así se prueba sin red.
import { planNotifications } from './notify.js';

/**
 * @param users     [{ id, state, subs, sent:Set }]
 * @param send      async (user, notification) -> true si llegó a algún dispositivo
 * @param markSent  async (user, key) -> recuerda que ya se envió
 * @param attempts  Map compartido entre llamadas: si un envío falla varias veces seguidas se pausa un rato (no spamea el log)
 */
export async function dispatchDue({ users, now = new Date(), send, markSent, attempts = new Map(), graceMinutes = 0, maxAttempts = 5, retryAfterMs = 30 * 60 * 1000 }) {
  let count = 0;
  for (const user of users) {
    if (!user.subs.length) continue;
    for (const n of planNotifications({ state: user.state, now, sent: user.sent, graceMinutes })) {
      const id = `${user.id}:${n.key}`;
      const a = attempts.get(id);
      if (a && a.blockedUntil > now.getTime()) continue;
      if (await send(user, n)) {
        user.sent.add(n.key);
        await markSent(user, n.key);
        attempts.delete(id);
        count++;
      } else {
        const failures = (a?.failures ?? 0) + 1;
        attempts.set(id, { failures, blockedUntil: failures >= maxAttempts ? now.getTime() + retryAfterMs : 0 });
      }
    }
  }
  return count;
}
