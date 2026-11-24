// Ajustes: cuenta (sincronizar iPhone y Windows) y notificaciones del móvil.
import { useEffect, useState } from 'react';
import { actions, useAppState } from '../data/index.js';
import { VAPID_PUBLIC_KEY } from '../sync/config.js';
import { account, useAccount } from '../sync/account.js';
import { currentSubscription, disablePush, enablePush, localTest, pushSupport } from '../sync/push.js';
import AuthForm from './AuthForm.jsx';

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6:00 – 22:00

export function AccountCard() {
  const acc = useAccount();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const sendReset = async (to) => {
    if (!to) { setNote('Escribe primero tu correo.'); return; }
    setBusy(true);
    const ok = await account.reset(to);
    setBusy(false);
    setNote(ok ? 'Si ese correo tiene cuenta, te llegará un enlace para elegir una contraseña nueva (mira también en spam). Caduca en poco tiempo y solo sirve una vez.' : '');
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

      {acc.status === 'out' && <AuthForm />}

      {acc.status === 'in' && (
        <>
          <p style={{ margin: 0 }}>Sesión iniciada como <b>{acc.user.email}</b>. Tus datos se sincronizan solos.</p>
          <p className="small muted" style={{ margin: 0 }}>
            {acc.sync.error ? <span style={{ color: 'var(--danger)' }}>Error al guardar en la nube: {acc.sync.error}. </span> : null}
            {acc.sync.lastRead ? `Nube conectada (${new Date(acc.sync.lastRead).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}). ` : 'Conectando con la nube… '}
            {acc.sync.lastOk ? `Último guardado: ${new Date(acc.sync.lastOk).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}. ` : ''}
            {acc.sync.pending ? `Pendientes de subir: ${acc.sync.pending}. ` : ''}
            <span>Versión {typeof __BUILD__ === 'undefined' ? 'dev' : __BUILD__} (UTC).</span>
          </p>
          {!acc.user.emailVerified && <VerifyBanner />}
          <div className="row wrap">
            <button className="btn small" disabled={busy} onClick={() => sendReset(acc.user.email)}>Cambiar contraseña</button>
            <button className="btn small" onClick={() => account.signOut()}>Cerrar sesión</button>
          </div>
          {note && <p className="small muted" style={{ margin: 0 }}>{note}</p>}
        </>
      )}
    </section>
  );
}

function VerifyBanner() {
  const acc = useAccount();
  const [msg, setMsg] = useState('');
  return (
    <div className="stack" style={{ gap: 6 }}>
      <p className="small" style={{ margin: 0 }}>
        ⚠️ Falta verificar tu correo. Te enviamos un mensaje al crear la cuenta (mira también en spam).
      </p>
      <div className="row wrap">
        <button className="btn small" onClick={async () => { if (await account.resendVerification()) setMsg('Enviado de nuevo.'); }}>Reenviar correo</button>
        <button className="btn small" onClick={async () => { await account.refreshVerification(); setMsg('Comprobado.'); }}>Ya lo he verificado</button>
      </div>
      {(msg || acc.error) && <p className="small muted" style={{ margin: 0 }}>{acc.error || msg}</p>}
    </div>
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
      else setMsg(r.reason === 'denied' ? 'Has bloqueado las notificaciones. Actívalas en los ajustes del móvil o del navegador para Seiri.'
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
                <button className="btn small" onClick={() => { actions.updateSettings({ pushTest: Date.now() }); setMsg('Prueba pedida. Bloquea el móvil: en unos segundos te llega desde el servidor.'); }}>Probar desde el servidor</button>
                <button className="btn small" disabled={busy} onClick={turnOff}>Desactivar</button>
              </div>
            </>
          )}
          {permission === 'denied' && <p className="small" style={{ color: 'var(--danger)', margin: 0 }}>Las notificaciones están bloqueadas para Seiri en este dispositivo.</p>}
          {msg && <p className="small" style={{ margin: 0 }}>{msg}</p>}
          {!VAPID_PUBLIC_KEY && <p className="small muted" style={{ margin: 0 }}>Falta la clave VAPID pública en src/sync/config.js.</p>}
        </>
      )}
    </section>
  );
}

/** Solo lo ve el administrador: quién ha pedido acceso y quién tiene ya la cuenta aceptada. */
export function AccessCard() {
  const acc = useAccount();
  if (!acc.isAdmin || acc.status !== 'in') return null;
  const mine = acc.user.uid;
  const when = (t) => (t ? new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '');
  const waiting = acc.requests.filter((r) => r.status !== 'rechazada');
  const rejected = acc.requests.filter((r) => r.status === 'rechazada');
  return (
    <section className="card stack">
      <h2>Quién puede entrar</h2>
      <p className="muted small">Quien se registra y verifica su correo aparece aquí. Hasta que lo apruebes no puede usar Seiri ni guardar nada.</p>
      {acc.error && <p className="small" style={{ color: 'var(--danger)', margin: 0 }}>{acc.error}</p>}

      <h3 style={{ margin: 0 }}>Solicitudes{waiting.length ? ` (${waiting.length})` : ''}</h3>
      {!waiting.length && <p className="muted small" style={{ margin: 0 }}>Ninguna pendiente.</p>}
      {waiting.map((r) => (
        <div key={r.uid} className="row wrap" style={{ justifyContent: 'space-between', gap: 8 }}>
          <span><b>{r.email}</b> <span className="muted small">· {when(r.at)}</span></span>
          <span className="row" style={{ gap: 6 }}>
            <button className="btn small primary" onClick={() => account.approve(r.uid, r.email)}>Aceptar</button>
            <button className="btn small" onClick={() => window.confirm(`¿Rechazar a ${r.email}?`) && account.reject(r.uid)}>Rechazar</button>
          </span>
        </div>
      ))}
      {rejected.map((r) => (
        <div key={r.uid} className="row wrap" style={{ justifyContent: 'space-between', gap: 8 }}>
          <span className="muted small">{r.email} · rechazada</span>
          <button className="btn small" onClick={() => account.approve(r.uid, r.email)}>Aceptar</button>
        </div>
      ))}

      <h3 style={{ margin: '8px 0 0' }}>Con acceso ({acc.approved.length})</h3>
      {acc.approved.map((u) => (
        <div key={u.uid} className="row wrap" style={{ justifyContent: 'space-between', gap: 8 }}>
          <span>{u.email || u.uid}{u.uid === mine ? ' (tú)' : ''}</span>
          {u.uid !== mine && (
            <button className="btn small" onClick={() => window.confirm(`¿Quitar el acceso a ${u.email || u.uid}? Sus datos no se borran.`) && account.revoke(u.uid)}>Quitar acceso</button>
          )}
        </div>
      ))}
    </section>
  );
}
