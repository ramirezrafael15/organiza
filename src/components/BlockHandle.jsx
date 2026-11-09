// Asa de cada bloque: "+" (añadir debajo) y ⋮⋮ (arrastrar, o clic para el menú: duplicar, borrar, mover, convertir).
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import DragHandle from '@tiptap/extension-drag-handle-react';
import { addBlockBelow, deleteBlock, duplicateBlock, moveBlock, turnInto, TURN_INTO } from '../lib/blocks/blockOps.js';

export default function BlockHandle({ editor }) {
  const current = useRef(null); // último bloque sobre el que se pasó el ratón
  const [menu, setMenu] = useState(null); // { x, y, target }

  const open = (e) => {
    if (!current.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    setMenu({ x: Math.min(r.left, window.innerWidth - 220), y: Math.min(r.bottom + 4, window.innerHeight - 380), target: current.current });
  };
  const run = (fn) => { const t = menu.target; setMenu(null); fn(editor, t); };

  return (
    <>
      <DragHandle editor={editor} onNodeChange={({ node, pos }) => { if (node) current.current = { node, pos }; }}>
        <div className="block-handle">
          <button type="button" className="bh-btn" title="Añadir bloque debajo" aria-label="Añadir bloque debajo"
            onClick={() => current.current && addBlockBelow(editor, current.current)}>+</button>
          <button type="button" className="bh-btn bh-grip" title="Arrastra para mover · clic para opciones" aria-label="Opciones del bloque"
            onClick={open}>⋮⋮</button>
        </div>
      </DragHandle>
      {menu && createPortal(
        <>
          <div className="bm-back" onMouseDown={() => setMenu(null)} />
          <div className="block-menu" style={{ left: menu.x, top: menu.y }} role="menu">
            <button onClick={() => run(duplicateBlock)}>⧉ Duplicar</button>
            <button onClick={() => run((ed, t) => moveBlock(ed, t, -1))}>↑ Subir</button>
            <button onClick={() => run((ed, t) => moveBlock(ed, t, 1))}>↓ Bajar</button>
            <button className="danger" onClick={() => run(deleteBlock)}>🗑 Borrar</button>
            <hr />
            <span className="bm-label">Convertir en</span>
            {TURN_INTO.map((it) => (
              <button key={it.title} onClick={() => run((ed, t) => turnInto(ed, t, it))}>{it.icon} {it.title}</button>
            ))}
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
