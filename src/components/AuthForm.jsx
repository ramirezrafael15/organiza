// Entrar o pedir acceso. Las cuentas nuevas las acepta Rafa una a una.
import { useState } from 'react';
import { account, useAccount } from '../sync/account.js';

const RESET_OK = 'Si ese correo tiene cuenta, te llegará un enlace para elegir una contraseña nueva (mira también en spam). Caduca en poco tiempo y solo sirve una vez.';

export default function AuthForm() {
  const acc = useAccount();
  const [mode, setMode] = useState('in'); // in | new
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const isNew = mode === 'new';

  const submit = async (e) => {
    e.preventDefault();
    setNote('');
    if (isNew && password !== again) { setNote('Las dos contraseñas no coinciden.'); return; }
    setBusy(true);
    await (isNew ? account.signUp : account.signIn)(email.trim(), password);
    setBusy(false);
  };
  const forgot = async () => {
    if (!email.trim()) { setNote('Escribe primero tu correo.'); return; }
    setBusy(true);
    const ok = await account.reset(email.trim());
    setBusy(false);
    setNote(ok ? RESET_OK : '');
  };

  return (
    <form className="stack" onSubmit={submit}>
      <div className="seg" role="tablist" aria-label="Entrar o pedir acceso">
        <button type="button" role="tab" aria-selected={!isNew} className={!isNew ? 'on' : ''} onClick={() => { setMode('in'); setNote(''); }}>Entrar</button>
        <button type="button" role="tab" aria-selected={isNew} className={isNew ? 'on' : ''} onClick={() => { setMode('new'); setNote(''); }}>Pedir acceso</button>
      </div>
      <input type="email" required autoComplete="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" required autoComplete={isNew ? 'new-password' : 'current-password'} placeholder={isNew ? 'Contraseña nueva' : 'Contraseña'} value={password} onChange={(e) => setPassword(e.target.value)} />
      {isNew && (
        <>
          <input type="password" required autoComplete="new-password" placeholder="Repite la contraseña" value={again} onChange={(e) => setAgain(e.target.value)} />
          <p className="small" style={{ margin: 0 }}>
            🔒 <b>No uses la contraseña que usas en otros sitios</b> (correo, Instagram, banco…). Crea una solo para Seiri: mínimo 8 caracteres, con letras y números.
          </p>
          <p className="small muted" style={{ margin: 0 }}>
            Te enviaremos un correo para verificar tu email. Después, Rafa tiene que aceptar tu cuenta antes de que puedas usar Seiri.
          </p>
        </>
      )}
      {(acc.error || note) && <p className="small" style={{ margin: 0, color: acc.error ? 'var(--danger)' : undefined }}>{acc.error || note}</p>}
      <button className="btn primary" disabled={busy}>{isNew ? 'Pedir acceso' : 'Entrar'}</button>
      {!isNew && <button className="link-btn" type="button" disabled={busy} onClick={forgot}>¿Has olvidado la contraseña?</button>}
    </form>
  );
}
