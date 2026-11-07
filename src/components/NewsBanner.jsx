import { useState } from 'react';
import { markSeen, pendingNews } from '../lib/news.js';

export default function NewsBanner() {
  const [list, setList] = useState(pendingNews);
  const n = list[0];
  if (!n) return null;
  const close = () => { markSeen(n.id); setList(pendingNews()); };
  return (
    <aside className={`news ${n.action ? 'needs' : ''}`} role="status">
      <div>
        <b>{n.title}</b>
        <p className="small">{n.body}</p>
        {n.action && <p className="small"><strong>Qué tienes que hacer:</strong> {n.action}</p>}
      </div>
      <button className="btn small" onClick={close}>Entendido</button>
    </aside>
  );
}
