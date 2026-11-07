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

/** Props para un elemento seleccionable. En modo selección, pulsarlo lo marca;
 *  fuera de él, mantenerlo pulsado entra en el modo con ese elemento ya marcado. */
let lp = null; // pulsación larga en curso
let swallow = false; // la pulsación larga ya actuó: ignora el clic que viene detrás
const cancelLp = () => { if (lp) { clearTimeout(lp.t); lp = null; } };
export const pick = (sel, id) => {
  const eatClick = (e) => { if (swallow) { swallow = false; e.stopPropagation(); e.preventDefault(); } };
  if (sel.on) {
    return {
      onClickCapture: eatClick,
      onClick: () => sel.toggle(id),
      'data-selectable': 'true',
      'data-selected': sel.has(id) ? 'true' : 'false',
    };
  }
  return {
    'data-lp': 'true',
    onPointerDown: (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      cancelLp();
      swallow = false;
      lp = {
        x: e.clientX, y: e.clientY,
        t: setTimeout(() => {
          lp = null; swallow = true;
          navigator.vibrate?.(15);
          sel.start();
          sel.toggle(id);
        }, 450),
      };
    },
    onPointerMove: (e) => { if (lp && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 8) cancelLp(); },
    onPointerUp: cancelLp,
    onPointerCancel: cancelLp,
    onPointerLeave: cancelLp,
    onContextMenu: (e) => e.preventDefault(),
    onClickCapture: eatClick,
  };
};

/** Antes era un botón; ahora se entra manteniendo pulsado. Queda una pista discreta. */
export function SelectButton({ sel }) {
  if (sel.on) return null;
  return <p className="small muted sel-hint">Mantén pulsado para seleccionar y borrar</p>;
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
      <b className="grow">{n ? `${n} seleccionad${n === 1 ? 'o' : 'os'}` : 'Toca para marcar más'}</b>
      <button className="btn small" onClick={() => sel.set(all ? [] : visibleIds)}>{all ? 'Ninguno' : 'Todos'}</button>
      <button className="btn small danger" disabled={!n} onClick={del}>Borrar{n ? ` (${n})` : ''}</button>
      <button className="btn small" onClick={sel.stop}>Cancelar</button>
    </div>
  );
}
