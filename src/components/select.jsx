// Modo "seleccionar varios": marcas varios elementos y los borras de golpe.
import { useEffect, useState } from 'react';

export function useSelect() {
  const [on, setOn] = useState(false);
  const [ids, setIds] = useState(() => new Set());
  useEffect(() => {
    document.body.classList.toggle('selecting', on); // oculta el botón + mientras se selecciona
    return () => document.body.classList.remove('selecting');
  }, [on]);
  return {
    on,
    ids,
    has: (id) => ids.has(id),
    toggle: (id) => setIds((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }),
    set: (list) => setIds(new Set(list)),
    start: () => setOn(true),
    stop: () => { setOn(false); setIds(new Set()); },
  };
}

/** Props para un elemento seleccionable: en modo selección, pulsarlo lo marca. */
export const pick = (sel, id) => (sel.on ? { onClick: () => sel.toggle(id), 'data-selectable': 'true', 'data-selected': sel.has(id) ? 'true' : 'false' } : {});

export function SelectButton({ sel, disabled }) {
  if (sel.on) return null;
  return <button className="btn" disabled={disabled} onClick={sel.start}>Seleccionar</button>;
}

/** Barra inferior con el recuento y las acciones. onDelete recibe la lista de ids marcados. */
export function SelectBar({ sel, visibleIds, noun, onDelete }) {
  if (!sel.on) return null;
  const n = sel.ids.size;
  const all = visibleIds.length > 0 && visibleIds.every((id) => sel.ids.has(id));
  const del = () => {
    if (!n || !window.confirm(`¿Borrar ${n} ${noun}? No se puede deshacer.`)) return;
    onDelete([...sel.ids]);
    sel.stop();
  };
  return (
    <div className="sel-bar" role="toolbar" aria-label="Seleccionar varios">
      <b className="grow">{n ? `${n} seleccionad${n === 1 ? 'o' : 'os'}` : 'Toca para marcar'}</b>
      <button className="btn small" onClick={() => sel.set(all ? [] : visibleIds)}>{all ? 'Ninguno' : 'Todos'}</button>
      <button className="btn small danger" disabled={!n} onClick={del}>Borrar{n ? ` (${n})` : ''}</button>
      <button className="btn small" onClick={sel.stop}>Cancelar</button>
    </div>
  );
}
