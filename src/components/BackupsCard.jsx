import { useEffect, useState } from 'react';
import { actions } from '../data/index.js';
import { setKey } from '../lib/keys.js';
import { listBackups } from '../lib/safety.js';
import { fmt } from '../lib/dates.js';

export default function BackupsCard() {
  const [list, setList] = useState([]);
  useEffect(() => { listBackups().then(setList); }, []);
  const restore = (b) => {
    if (!window.confirm(`¿Restaurar la copia del ${fmt(b.day, 'd MMM')}? Sustituye tus datos actuales.`)) return;
    actions.replaceAll(b.state);
    Object.entries(b.keys ?? {}).forEach(([k, v]) => v && setKey(k, v));
  };
  return (
    <section className="card stack">
      <h2>Copias de seguridad</h2>
      <p className="muted small" style={{ margin: 0 }}>Seiri guarda una copia al día en este dispositivo (datos, calendarios conectados y claves de IA). No se suben a la nube.</p>
      {list.length === 0 && <p className="small muted">Aún no hay copias.</p>}
      {list.map((b) => (
        <div key={b.at} className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{fmt(b.day, "EEEE d 'de' MMM")}</span>
          <button className="btn small" onClick={() => restore(b)}>Restaurar</button>
        </div>
      ))}
    </section>
  );
}
