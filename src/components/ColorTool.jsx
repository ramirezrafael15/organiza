// Botón de color con memoria: un toque aplica el último color usado; la flecha abre colores rápidos y recientes.
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };

export const COLOR_PRESETS = {
  highlight: ['#fde68a', '#bbf7d0', '#fbcfe8', '#bfdbfe', '#fed7aa', '#e9d5ff', '#fecaca'],
  text: ['#dc2626', '#2563eb', '#16a34a', '#9333ea', '#ea580c', '#111827', '#6b7280'],
};

/** Nuevo orden de colores recientes: el último usado primero, sin repetir, máx. 6. */
export const pushRecent = (list, color) => [color, ...list.filter((c) => c.toLowerCase() !== color.toLowerCase())].slice(0, 6);

export default function ColorTool({ kind, title, glyph, current, onApply, onClear }) {
  const key = `seiri:color:${kind}`;
  const [last, setLast] = useState(() => load(key, COLOR_PRESETS[kind][0]));
  const [recent, setRecent] = useState(() => load(`${key}:recent`, []));
  const [pos, setPos] = useState(null);
  const caret = useRef(null);
  const noBlur = (e) => e.preventDefault();

  const use = (color) => {
    setLast(color); save(key, color);
    const r = pushRecent(recent, color); setRecent(r); save(`${key}:recent`, r);
    onApply(color);
  };
  const open = () => {
    if (pos) return setPos(null);
    const r = caret.current.getBoundingClientRect();
    setPos({ left: Math.max(8, Math.min(r.left - 90, window.innerWidth - 230)), top: r.bottom + 6 });
  };
  const same = current && current.toLowerCase() === last.toLowerCase();

  return (
    <>
      <span className="tb-split">
        <button type="button" className={`tb tb-color ${same ? 'on' : ''}`} style={{ '--c': last }} title={`${title} (${same ? 'quitar' : 'último color'})`} aria-label={title}
          onMouseDown={noBlur} onClick={() => (same ? onClear() : use(last))}>
          <span>{glyph}</span>
        </button>
        <button type="button" ref={caret} className="tb tb-caret" aria-label={`Más colores: ${title}`} onMouseDown={noBlur} onClick={open}>▾</button>
      </span>
      {pos && createPortal(
        <>
          <div className="color-backdrop" onClick={() => setPos(null)} />
          <div className="color-pop" style={{ left: pos.left, top: pos.top }} onMouseDown={noBlur}>
            <div className="swatches">
              {COLOR_PRESETS[kind].map((c) => <button key={c} type="button" className={`swatch ${c === last ? 'on' : ''}`} style={{ background: c }} aria-label={c} onClick={() => { use(c); setPos(null); }} />)}
            </div>
            {recent.length > 0 && <>
              <div className="small muted">Recientes</div>
              <div className="swatches">
                {recent.map((c) => <button key={c} type="button" className="swatch" style={{ background: c }} aria-label={c} onClick={() => { use(c); setPos(null); }} />)}
              </div>
            </>}
            <label className="color-other">Otro color…
              <input type="color" value={last} onChange={(e) => use(e.target.value)} />
            </label>
            <button type="button" className="link-btn" onClick={() => { onClear(); setPos(null); }}>Quitar color</button>
          </div>
        </>, document.body)}
    </>
  );
}
