// Pantalla para quien ha entrado pero aún no puede usar la app: falta verificar el correo o que el equipo de Seiri apruebe la cuenta.
import { useState } from 'react';
import { account, useAccount } from '../sync/account.js';

const TEXT = {
  checking: { t: 'Comprobando tu cuenta…', p: '' },
  unverified: { t: 'Verifica tu correo', p: 'Te hemos enviado un mensaje para comprobar que la dirección es tuya (revisa también la carpeta de spam). Cuando pulses el enlace, vuelve a esta pantalla.' },
  pending: { t: 'Solicitud enviada', p: 'El equipo de Seiri revisará tu cuenta. En cuanto la apruebe podrás acceder: esta pantalla se actualizará sola (si no, cierra y vuelve a abrir la aplicación).' },
  error: { t: 'No se ha podido comprobar tu cuenta', p: 'Revisa tu conexión e inténtalo de nuevo. Si el problema continúa, contacta con el equipo de Seiri.' },
  rejected: { t: 'Solicitud no aprobada', p: 'Esta cuenta no tiene acceso a Seiri. Si consideras que es un error, ponte en contacto con el equipo de Seiri.' },
};

export default function Gate() {
  const acc = useAccount();
  const [msg, setMsg] = useState('');
  const x = TEXT[acc.access] ?? TEXT.checking;
  return (
    <main className="welcome">
      <div className="welcome-in stack">
        <img className="welcome-logo" src={`${import.meta.env.BASE_URL}icons/logo.png`} alt="" width="84" height="84" />
        <h1>{x.t}</h1>
        {x.p && <p className="muted">{x.p}</p>}
        {acc.user?.email && <p className="small muted" style={{ margin: 0 }}>Cuenta: {acc.user.email}</p>}
        {acc.access === 'unverified' && (
          <div className="row wrap" style={{ justifyContent: 'center' }}>
            <button className="btn primary" onClick={async () => { await account.refreshVerification(); setMsg('Comprobado.'); }}>Ya lo he verificado</button>
            <button className="btn" onClick={async () => { if (await account.resendVerification()) setMsg('Enviado de nuevo.'); }}>Reenviar correo</button>
          </div>
        )}
        {acc.access === 'error' && <button className="btn primary" onClick={() => account.recheck()}>Reintentar</button>}
        {(msg || acc.error) && <p className="small" style={{ margin: 0 }}>{acc.error || msg}</p>}
        <button className="link-btn" onClick={() => account.signOut()}>Cerrar sesión</button>
      </div>
    </main>
  );
}
