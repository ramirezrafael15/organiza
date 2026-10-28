// Chivato de la nube: "Subiendo…" mientras hay cambios sin guardar y "✓ En la nube" unos segundos después.
// Así sabes cuándo puedes cerrar la app sin perder el cambio.
import { useEffect, useState } from 'react';
import { useAccount } from '../sync/account.js';

export default function SyncBadge() {
  const acc = useAccount();
  const [, tick] = useState(0);
  const { pending = 0, lastOk = 0, error = '' } = acc.sync ?? {};
  const recentlySaved = Date.now() - lastOk < 4000;

  useEffect(() => {
    if (!lastOk) return undefined;
    const t = setTimeout(() => tick((n) => n + 1), 4100); // para que el ✓ se quite solo
    return () => clearTimeout(t);
  }, [lastOk]);

  if (acc.status !== 'in') return null;
  let text = null;
  let cls = '';
  if (error && !pending) { text = '⚠️ No se pudo guardar'; cls = 'bad'; }
  else if (pending > 0) { text = '☁️ Subiendo… no cierres aún'; cls = 'busy'; }
  else if (recentlySaved) { text = '✓ Guardado en la nube'; cls = 'ok'; }
  return text ? <div className={`sync-badge ${cls}`} role="status">{text}</div> : null;
}
