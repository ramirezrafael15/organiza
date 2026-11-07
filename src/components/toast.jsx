// Aviso breve abajo con botón de deshacer.
import { useEffect, useState } from 'react';

const subs = new Set();
export const toast = (text, undo) => subs.forEach((fn) => fn({ text, undo, id: Date.now() }));

export function ToastHost() {
  const [t, setT] = useState(null);
  useEffect(() => { subs.add(setT); return () => subs.delete(setT); }, []);
  useEffect(() => {
    if (!t) return undefined;
    const id = setTimeout(() => setT(null), 5000);
    return () => clearTimeout(id);
  }, [t]);
  if (!t) return null;
  return (
    <div className="toast" role="status" key={t.id}>
      <span>{t.text}</span>
      {t.undo && <button onClick={() => { t.undo(); setT(null); }}>Deshacer</button>}
    </div>
  );
}
