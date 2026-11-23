// Pantalla para quien ha entrado pero aún no puede usar la app: falta verificar el correo o que Rafa lo acepte.
import { useState } from 'react';
import { account, useAccount } from '../sync/account.js';

const TEXT = {
  checking: { t: 'Comprobando tu cuenta…', p: '' },
  unverified: { t: 'Verifica tu correo', p: 'Te hemos enviado un mensaje para comprobar que el correo es tuyo (mira también en spam). Cuando pulses el enlace, vuelve aquí.' },
  pending: { t: 'Solicitud enviada ✅', p: 'Rafa tiene que aceptar tu cuenta. En cuanto lo haga, esta pantalla se abrirá sola (si no, cierra y abre la app).' },
  rejected: { t: 'No se ha aceptado tu solicitud', p: 'Esta cuenta no tiene acceso a Seiri. Si crees que es un error, habla con Rafa.' },
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
        {(msg || acc.error) && <p className="small" style={{ margin: 0 }}>{acc.error || msg}</p>}
        <button className="link-btn" onClick={() => account.signOut()}>Cerrar sesión</button>
      </div>
    </main>
  );
}
