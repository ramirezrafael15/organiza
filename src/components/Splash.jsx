// Animación de entrada: el logo gira y se asienta, y aparece el nombre.
import { useEffect, useState } from 'react';

const SHOWN = 'seiri:splash';
const skip = () => {
  try {
    if (sessionStorage.getItem(SHOWN)) return true;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  } catch { /* sin almacenamiento */ }
  return false;
};

export default function Splash() {
  const [on, setOn] = useState(() => !skip());
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (!on) return undefined;
    try { sessionStorage.setItem(SHOWN, '1'); } catch { /* nada */ }
    const a = setTimeout(() => setLeaving(true), 1900);
    const b = setTimeout(() => setOn(false), 2500);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [on]);
  if (!on) return null;
  return (
    <div className={`splash ${leaving ? 'out' : ''}`} aria-hidden="true" onClick={() => setLeaving(true)}>
      <img className="splash-logo" src={`${import.meta.env.BASE_URL}icons/logo.png`} alt="" width="132" height="132" />
      <b className="splash-name">Seiri</b>
      <span className="splash-sub">Pon en orden tu estudio</span>
    </div>
  );
}
