// Ajustes: cuenta (sincronizar iPhone y Windows) y notificaciones del móvil.
import { useEffect, useState } from 'react';
import { actions, useAppState } from '../data/index.js';
import { VAPID_PUBLIC_KEY } from '../sync/config.js';
import { account, useAccount } from '../sync/account.js';
import { currentSubscription, disablePush, enablePush, localTest, pushSupport } from '../sync/push.js';
import { Field } from './forms/fields.jsx';

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6:00 – 22:00

export function AccountCard() {
  const acc = useAccount();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = (fn) => async (e) => {
    e.preventDefault();
    setBusy(true);
    await fn(email.trim(), password);
    setBusy(false);
  };

  return (
    <section className="card stack">
      <h2>Cuenta y sincronización</h2>

      {acc.status === 'off' && (
        <p className="muted small">
          La sincronización entre dispositivos aún no está configurada. Sigue la guía “Fase 2” del README y pega tus claves en
          <code> src/sync/config.js</code>. Mientras tanto, la app funciona igual, solo en este dispositivo.
        </p>
      )}
      {acc.status === 'loading' && <p className="muted small">Conectando…</p>}

      {acc.status === 'out' && (
        <form className="stack" onSubmit={submit(account.signIn)}>
          <p className="muted small">Entra con tu cuenta para tener los mismos datos en el iPhone y en Windows. Todo se guarda también sin conexión.</p>
          <Field label="Correo"><input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Contraseña"><input type="password" required minLength={6} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          {acc.error && <p className="small" style={{ color: 'var(--danger)', margin: 0 }}>{acc.error}</p>}
          <div className="row wrap">
            <button className="btn primary" type="submit" disabled={busy}>Entrar</button>
            <button className="btn" type="button" disabled={busy} onClick={submit(account.signUp)}>Crear cuenta</button>
          </div>
        </form>
      )}

      {acc.status === 'in' && (
        <>
          <p style={{ margin: 0 }}>Sesión iniciada como <b>{acc.user.email}</b>. Tus datos se sincronizan solos.</p>
          <p className="small muted" style={{ margin: 0 }}>
            {acc.sync.error ? <span style={{ color: 'var(--danger)' }}>Error al guardar en la nube: {acc.sync.error}. </span> : null}
            {acc.sync.lastRead ? `Nube conectada (${new Date(acc.sync.lastRead).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}). ` : 'Conectando con la nube… '}
            {acc.sync.lastOk ? `Último guardado: ${new Date(acc.sync.lastOk).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}. ` : ''}
            {acc.sync.pending ? `Pendientes de subir: ${acc.sync.pending}.` : ''}
          </p>
          <button className="btn small" style={{ alignSelf: 'flex-start' }} onClick={() => account.signOut()}>Cerrar sesión</button>
        </>
      )}
    </section>
  );
}

export function NotificationsCard() {
  const acc = useAccount();
  const { settings } = useAppState();
  const support = pushSupport();
  const [subscribed, setSubscribed] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const permission = typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;

  useEffect(() => {
    let alive = true;
    currentSubscription().then((s) => alive && setSubscribed(Boolean(s))).catch(() => {});
    return () => { alive = false; };
  }, [acc.status]);

  if (acc.status !== 'in') return null; // las notificaciones necesitan la cuenta (el servidor lee tus datos de ahí)

  const turnOn = async () => {
    setBusy(true);
    setMsg('');
    try {
      const r = await enablePush(acc.user.uid, account.firebase());
      if (r.ok) setSubscribed(true);
      else setMsg(r.reason === 'denied' ? 'Has bloqueado las notificaciones. Actívalas en los ajustes del móvil o del navegador para Organiza.'
        : r.reason === 'config' ? 'Falta la clave VAPID en src/sync/config.js (ver README).' : 'No se concedió el permiso.');
    } catch {
      setMsg('No se pudo activar. Inténtalo de nuevo.');
    }
    setBusy(false);
  };
  const turnOff = async () => {
    setBusy(true);
    await disablePush(acc.user.uid, account.firebase());
    setSubscribed(false);
    setBusy(false);
  };

  return (
    <section className="card stack">
      <h2>Notificaciones</h2>
      {support === 'ios-install' && (
        <p className="muted small">En iPhone las notificaciones solo funcionan con la app instalada: ábrela en Safari → Compartir → “Añadir a pantalla de inicio” y ábrela desde el icono. Necesitas iOS 16.4 o superior.</p>
      )}
      {support === 'unsupported' && <p className="muted small">Este navegador no admite notificaciones push.</p>}
      {support === 'ok' && (
        <>
          <p className="muted small">Te avisamos el día que toca de cada examen, entrega o evento (según los días que elegiste en cada uno), aunque la app esté cerrada.</p>
          {!subscribed ? (
            <button className="btn primary" style={{ alignSelf: 'flex-start' }} disabled={busy || permission === 'denied'} onClick={turnOn}>
              Activar notificaciones en este dispositivo
            </button>
          ) : (
            <>
              <p style={{ margin: 0 }}>✅ Activadas en este dispositivo.</p>
              <div className="row wrap">
                <button className="btn small" onClick={() => localTest().catch(() => setMsg('El sistema no dejó mostrar la notificación.'))}>Probar aquí</button>
                <button className="btn small" disabled={busy} onClick={turnOff}>Desactivar</button>
              </div>
            </>
          )}
          {permission === 'denied' && <p className="small" style={{ color: 'var(--danger)', margin: 0 }}>Las notificaciones están bloqueadas para Organiza en este dispositivo.</p>}
          {msg && <p className="small" style={{ margin: 0 }}>{msg}</p>}
          {!VAPID_PUBLIC_KEY && <p className="small muted" style={{ margin: 0 }}>Falta la clave VAPID pública en src/sync/config.js.</p>}
        </>
      )}
    </section>
  );
}
