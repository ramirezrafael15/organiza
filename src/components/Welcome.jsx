// Pantalla de entrada: lo primero que se ve si no hay sesión iniciada.
import { useState } from 'react';
import { account, useAccount } from '../sync/account.js';

export default function Welcome() {
  const acc = useAccount();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const go = (fn) => async (e) => {
    e.preventDefault();
    setNote('');
    setBusy(true);
    await fn(email.trim(), password);
    setBusy(false);
  };
  const forgot = async () => {
    if (!email.trim()) { setNote('Escribe primero tu correo.'); return; }
    setBusy(true);
    const ok = await account.reset(email.trim());
    setBusy(false);
    setNote(ok ? 'Te hemos enviado un correo para elegir una contraseña nueva (mira también en spam).' : '');
  };

  return (
    <main className="welcome">
      <div className="welcome-in">
        <img className="welcome-logo" src={`${import.meta.env.BASE_URL}icons/logo.png`} alt="" width="84" height="84" />
        <h1>Seiri</h1>
        <p className="muted">Pon en orden tu estudio. Entra para ver tus datos en todos tus dispositivos.</p>
        <form className="stack" onSubmit={go(account.signIn)}>
          <input type="email" required autoComplete="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" required autoComplete="current-password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
          {acc.error && <p className="small" style={{ color: 'var(--danger)', margin: 0 }}>{acc.error}</p>}
          {note && <p className="small muted" style={{ margin: 0 }}>{note}</p>}
          <button className="btn primary" disabled={busy}>Entrar</button>
          <button className="btn" type="button" disabled={busy} onClick={go(account.signUp)}>Crear cuenta</button>
          <button className="link-btn" type="button" disabled={busy} onClick={forgot}>¿Has olvidado la contraseña?</button>
        </form>
      </div>
    </main>
  );
}
